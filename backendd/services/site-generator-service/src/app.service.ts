import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Host, HostDocument } from './schema/host.schema';
import { Property, PropertyDocument } from './schema/property.schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn, ChildProcess, exec } from 'child_process';
import * as os from 'os';
import * as ejs from 'ejs';
import * as net from 'net';
import * as http from 'http';
import { SiteInfo, SiteInfoDocument } from './schema/site-info.schema';

export interface RunningSite {
  hostId: string;
  process: ChildProcess;
  port: number;
  startedAt: Date;
  url: string;
}

/*export interface SiteInfo {
  hostId: string;
  outputPath: string;
  lastBuilt: Date;
  status: 'building' | 'ready' | 'error';
  error?: string;
}*/

/**
 * Service de génération dynamique de sites web.
 * Responsable de la création, du déploiement et de la gestion du cycle de vie
 * des sites Next.js générés pour chaque hôte.
 */
@Injectable()
export class SiteGeneratorService implements OnApplicationShutdown {
  private readonly logger = new Logger('SiteGeneratorService');
  
  private runningSites: Map<string, RunningSite> = new Map();
  private sitesDatabase: Map<string, SiteInfo> = new Map();
  private startPort = 3014;
  private endPort = 4009;
  private usedPorts: Set<number> = new Set();
  private siteTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly previewTimeout = 1800000; // 30 minutes par défaut
  private disableAutoShutdown = false; // Nouvelle option pour désactiver l'arrêt automatique

  private outputDir = process.env.OUTPUT_DIR || path.join(os.homedir(), 'generatedsites');
  private templateDir = path.resolve(__dirname, '../../../../../frontend');
  private sharedNodeModules = process.env.SHARED_NODE_MODULES || path.join(process.cwd(), 'node_modules');
  private apiServerUrl = process.env.API_URL || 'http://localhost:3000';
  private debugMode = process.env.DEBUG_MODE === 'true';

  constructor(
    @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
    @InjectModel(Property.name, 'secondDB') private propertyModel: Model<Property>,
    @InjectModel(SiteInfo.name) private readonly siteInfoModel: Model<SiteInfoDocument>,
  ) {
    // Log de la configuration au démarrage
    this.logger.log(`Output directory: ${this.outputDir}`);
    this.logger.log(`Template directory: ${this.templateDir}`);
    this.logger.log(`Shared node_modules: ${this.sharedNodeModules}`);
    this.logger.log(`API Server URL: ${this.apiServerUrl}`);
    this.logger.log(`Port range: ${this.startPort}-${this.endPort}`);
    this.logger.log(`Debug mode: ${this.debugMode ? 'enabled' : 'disabled'}`);
    this.logger.log(`Auto shutdown: ${this.disableAutoShutdown ? 'disabled' : 'enabled'}`);
    
    this.init();
  }

  /**
   * Activer/désactiver l'arrêt automatique des sites
   */
  setAutoShutdown(enable: boolean): void {
    this.disableAutoShutdown = !enable;
    this.logger.log(`Auto shutdown ${enable ? 'enabled' : 'disabled'}`);
    
    if (!enable) {
      // Si on désactive, nettoyer tous les timeouts existants
      for (const timeout of this.siteTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.siteTimeouts.clear();
    } else {
      // Si on réactive, redémarrer les timeouts pour les sites en cours
      for (const hostId of this.runningSites.keys()) {
        this.resetSiteTimeout(hostId);
      }
    }
  }

  /**
   * Synchronise l'état en mémoire avec la base de données MongoDB.
   * Assure la cohérence entre les processus actifs et les enregistrements.
   */
  async synchronizeState(): Promise<void> {
    try {
      this.logger.log("Synchronizing in-memory state with database...");
      
      // Get all sites from database
      const dbSites = await this.siteInfoModel.find().exec();
      
      // Update in-memory maps
      for (const dbSite of dbSites) {
        this.sitesDatabase.set(dbSite.hostId, {
          hostId: dbSite.hostId,
          outputPath: dbSite.outputPath,
          lastBuilt: dbSite.lastBuilt,
          status: dbSite.status,
          error: dbSite.error
        });
        
        // Check if site is marked as running in DB but not in memory
        if (dbSite.port && !this.runningSites.has(dbSite.hostId)) {
          this.logger.warn(`Site ${dbSite.hostId} marked as running in DB but not in memory. Correcting DB.`);
          await this.siteInfoModel.updateOne(
            { hostId: dbSite.hostId },
            { $unset: { port: 1, url: 1 } }
          ).exec();
        }
      }
      
      // Check for sites in memory but not in DB
      for (const [hostId, _] of this.sitesDatabase) {
        const found = dbSites.some(site => site.hostId === hostId);
        if (!found) {
          this.logger.warn(`Site ${hostId} exists in memory but not in DB. Adding to DB.`);
          const newSiteInfo = new this.siteInfoModel({
            hostId,
            outputPath: this.sitesDatabase.get(hostId)!.outputPath,
            status: this.sitesDatabase.get(hostId)!.status,
            lastBuilt: this.sitesDatabase.get(hostId)!.lastBuilt,
            error: this.sitesDatabase.get(hostId)!.error
          });
          await newSiteInfo.save();
        }
      }
      
      this.logger.log("State synchronization completed");
    } catch (error) {
      this.logger.error(`Error synchronizing state: ${error.message}`);
    }
  }
  

  private async init(): Promise<void> {
    try {
      await fs.ensureDir(this.outputDir);
      await this.setupTemplateDirectory();
      
      if (!(await fs.pathExists(this.sharedNodeModules))) {
        this.logger.warn(`Shared node_modules not found: ${this.sharedNodeModules}`);
        this.logger.log('Installing core dependencies for templates...');
        await this.installCoreDependencies();
      }
      
      await this.scanExistingSites();
      await this.synchronizeState(); // Add this line
      
      // Set up periodic synchronization
      setInterval(() => this.synchronizeState(), 60000); // Every minute
      
      this.logger.log('SiteGeneratorService initialized successfully');
    } catch (error) {
      this.logger.error(`Initialization error: ${error.message}`);
    }
  }

  private async scanExistingSites(): Promise<void> {
    try {
      const items = await fs.readdir(this.outputDir);
      
      for (const item of items) {
        const siteDir = path.join(this.outputDir, item);
        const stat = await fs.stat(siteDir);
        
        if (stat.isDirectory()) {
          const packageJsonPath = path.join(siteDir, 'package.json');
          if (await fs.pathExists(packageJsonPath)) {
            this.sitesDatabase.set(item, {
              hostId: item,
              outputPath: siteDir,
              lastBuilt: stat.mtime,
              status: 'ready'
            });
            this.logger.log(`Found existing site: ${item}`);
          }
        }
      }
      
      this.logger.log(`Found ${this.sitesDatabase.size} existing sites`);
    } catch (error) {
      this.logger.error(`Error scanning existing sites: ${error.message}`);
    }
  }

  private async findAvailablePort(): Promise<number> {
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (this.usedPorts.has(port)) {
        continue;
      }

      const isAvailable = await this.isPortAvailable(port);
      if (!isAvailable) {
        continue;
      }

      this.usedPorts.add(port);
      return port;
    }

    throw new Error('No available ports in the specified range');
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close(() => resolve(true));
      });

      server.listen(port);
    });
  }

  private isPortInUseError(errorMessage: string): boolean {
    return /EADDRINUSE|already in use|address already in use/i.test(errorMessage || '');
  }

  private isPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const done = (value: boolean) => {
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve(value);
      };

      socket.setTimeout(800);
      socket.once('connect', () => done(true));
      socket.once('timeout', () => done(false));
      socket.once('error', () => done(false));
      socket.connect(port, '127.0.0.1');
    });
  }

  private isHttpResponsive(port: number, timeoutMs: number = 4000): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: '/',
          timeout: timeoutMs,
        },
        (res) => {
          res.resume();
          resolve(true);
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        resolve(false);
      });
    });
  }

  private releasePort(port: number): void {
    this.usedPorts.delete(port);
    this.logger.log(`Released port ${port}`);
  }

async stopSite(hostId: string): Promise<{ message: string }> {
  // Vérifier d'abord dans la mémoire
  if (!this.runningSites.has(hostId)) {
      // Vérifier dans la base de données si le site est marqué comme en cours d'exécution
      const dbSiteInfo = await this.siteInfoModel.findOne({ 
          hostId,
          port: { $exists: true }
      }).exec();
      
      if (!dbSiteInfo) {
          return { message: `No running site found for host ${hostId}` };
      }

      // Cas où le processus a crashé mais la base de données n'a pas été mise à jour
      if (dbSiteInfo.port) {
        await this.killProcessUsingPort(dbSiteInfo.port);
        this.releasePort(dbSiteInfo.port);
      }

      await this.siteInfoModel.updateOne(
        { hostId },
        {
          $unset: {
            port: 1,
            url: 1,
          },
          lastStopped: new Date(),
        }
      ).exec();
      
      return { message: `Site was marked as running but no process found. Cleaning database entry.` };
  }
  
  const runningSite = this.runningSites.get(hostId)!;
  
  try {
      // Nettoyer le timeout si existant
      if (this.siteTimeouts.has(hostId)) {
          clearTimeout(this.siteTimeouts.get(hostId)!);
          this.siteTimeouts.delete(hostId);
      }
      
      this.logger.log(`Stopping site for host ${hostId} on port ${runningSite.port}`);
      
      // Arrêter le processus
      runningSite.process.kill('SIGTERM');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!runningSite.process.killed) {
          runningSite.process.kill('SIGKILL');
      }
      
      // Libérer le port et nettoyer
      this.releasePort(runningSite.port);
      this.runningSites.delete(hostId);
      
      // Mettre à jour la base de données
      await this.siteInfoModel.updateOne(
          { hostId },
          { 
              $unset: { 
                  port: 1,
                  url: 1 
              },
              lastStopped: new Date()
          }
      ).exec();
      
      return { message: `Site for host ${hostId} stopped successfully` };
  } catch (error) {
      this.logger.error(`Error stopping site for ${hostId}: ${error.message}`);
      
      // Nettoyer même en cas d'erreur
      this.runningSites.delete(hostId);
      this.releasePort(runningSite.port);
      
      // Mettre à jour la base de données avec l'erreur
      await this.siteInfoModel.updateOne(
          { hostId },
          { 
              $unset: { 
                  port: 1,
                  url: 1 
              },
              lastStopped: new Date(),
              error: `Stop failed: ${error.message}`
          }
      ).exec();
      
      return { message: `Site for host ${hostId} stopped with errors` };
  }
}

private async killProcessUsingPort(port: number): Promise<void> {
  try {
    if (!port) return;

    if (process.platform === 'win32') {
      const output = await this.execSystemCommand(`netstat -ano | findstr :${port}`);
      const lines = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const pids = new Set<number>();
      for (const line of lines) {
        const cols = line.split(/\s+/);
        const pid = Number(cols[cols.length - 1]);
        if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        try {
          await this.execSystemCommand(`taskkill /PID ${pid} /F`);
          this.logger.log(`Killed stale process ${pid} on port ${port}`);
        } catch (killErr) {
          this.logger.warn(`Failed to kill process ${pid} on port ${port}: ${killErr.message}`);
        }
      }
      return;
    }

    const output = await this.execSystemCommand(`lsof -ti tcp:${port}`);
    const pids = output
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
        this.logger.log(`Killed stale process ${pid} on port ${port}`);
      } catch (killErr) {
        this.logger.warn(`Failed to kill process ${pid} on port ${port}: ${killErr.message}`);
      }
    }
  } catch (error) {
    this.logger.warn(`No stale process found on port ${port} or kill check failed: ${error.message}`);
  }
}

private async execSystemCommand(command: string, timeoutMs: number = 15000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve((stdout || '').toString());
    });
  });
}

async getSitesStatus(): Promise<{ running: RunningSite[], all: SiteInfo[] }> {
  // First sync with database to ensure latest data
  const dbSiteInfos = await this.siteInfoModel.find().exec();
  
  // Update in-memory map with database records
  for (const dbSite of dbSiteInfos) {
    if (!this.sitesDatabase.has(dbSite.hostId)) {
      this.sitesDatabase.set(dbSite.hostId, {
        hostId: dbSite.hostId,
        outputPath: dbSite.outputPath,
        lastBuilt: dbSite.lastBuilt,
        status: dbSite.status,
        error: dbSite.error
      });
    }
  }
  
  return {
    running: Array.from(this.runningSites.values()),
    all: Array.from(this.sitesDatabase.values())
  };
}

  private resetSiteTimeout(hostId: string): void {
    // Ne pas configurer de timeout si l'arrêt automatique est désactivé
    if (this.disableAutoShutdown) {
      if (this.siteTimeouts.has(hostId)) {
        clearTimeout(this.siteTimeouts.get(hostId)!);
        this.siteTimeouts.delete(hostId);
      }
      return;
    }
    
    if (this.siteTimeouts.has(hostId)) {
      clearTimeout(this.siteTimeouts.get(hostId)!);
    }
    
    const timeout = setTimeout(async () => {
      this.logger.log(`Timeout reached for site ${hostId}, stopping it...`);
      await this.stopSite(hostId);
    }, this.previewTimeout);
    
    this.siteTimeouts.set(hostId, timeout);
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application is shutting down (signal: ${signal})`);
    
    const promises = Array.from(this.runningSites.keys()).map(hostId => 
      this.stopSite(hostId).catch(err => 
        this.logger.error(`Error stopping site ${hostId} during shutdown: ${err.message}`)
      )
    );
    
    await Promise.all(promises);
  }

  private async setupTemplateDirectory(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.templateDir))) {
        this.logger.log(`Template directory not found, creating one at: ${this.templateDir}`);
        await fs.ensureDir(this.templateDir);
        await this.createBaseTemplate();
      } else {
        this.logger.log(`Template directory found at: ${this.templateDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to setup template directory: ${error.message}`);
      throw error;
    }
  }

  private async createBaseTemplate(): Promise<void> {
    try {
      const dirs = [
        'src/app',
        'src/app/api',
        'src/app/api/hosts/[hostId]',
        'src/app/api/properties',
        'src/components',
        'src/config',
        'public',
        'styles'
      ];
      
      for (const dir of dirs) {
        await fs.ensureDir(path.join(this.templateDir, dir));
      }
      
      await this.createTemplateConfigFiles();
      await this.createTemplateAppFiles();
      this.logger.log('Base template created successfully');
    } catch (error) {
      this.logger.error(`Failed to create base template: ${error.message}`);
      throw error;
    }
  }


  /**
   * Create template app files for Next.js
   */
/**
 * Create template app files for Next.js
 */
private async createTemplateAppFiles(): Promise<void> {
  // Root layout.tsx
  const layoutFile = `export const metadata = {
  title: '<%= hostName %> Properties',
  description: 'Property listings by <%= hostName %>',
}

import '../styles/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50" suppressHydrationWarning>
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900"><%= hostName %></h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="bg-white border-t mt-12 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-500 text-center">&copy; <%= new Date().getFullYear() %> <%= hostName %>. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}`;

  // Main page.tsx (Updated to load properties directly)
  const pageFile = `"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [hostData, setHostData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get hostId from environment variable
        const hostId = process.env.NEXT_PUBLIC_HOST_ID;
        
        if (!hostId) {
          throw new Error("Host ID not found");
        }
        
        // Fetch host data
        const hostResponse = await axios.get(\`/hosts/\${hostId}\`);
        setHostData(hostResponse.data);
        
        // Fetch properties directly without auth
        const propertiesResponse = await axios.get(\`/properties?hostId=\${hostId}\`);
        setProperties(propertiesResponse.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
      <h3 className="text-lg font-medium">Error loading data</h3>
      <p>{error}</p>
    </div>
  );

  return (
    <div>
      <section className="mb-8">
        <h2 className="text-3xl font-bold mb-4">Welcome to <%= hostName %> Properties</h2>
        <p className="text-gray-600">
          Discover amazing properties and accommodations tailored just for you.
        </p>
      </section>
      
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property._id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 overflow-hidden">
                <img 
                  src={property.mainPhotos?.[0] || '/placeholder-property.jpg'} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/placeholder-property.jpg' }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
                <p className="text-gray-600 mb-2">{property.city}, {property.country}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">\\160/night</span>
                  <span className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    {property.rating || 'New'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-600">No properties available at the moment</p>
        </div>
      )}
    </div>
  );
}`;

  // API route for hosts
  const hostApiRoute = `import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { hostId } = params;
  
  try {
    // Forward request to main API
    const response = await fetch(\`<%= apiServerUrl %>/hosts/\${hostId}\`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch host data');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching host data:', error);
    return NextResponse.json({ error: 'Failed to fetch host data' }, { status: 500 });
  }
}`;

  // API route for properties
  const propertiesApiRoute = `import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get('hostId') || process.env.NEXT_PUBLIC_HOST_ID;
    
    if (!hostId) {
      return NextResponse.json({ error: 'Host ID is required' }, { status: 400 });
    }
    
    // Forward request to main API without requiring auth
    const response = await fetch(\`<%= apiServerUrl %>/properties?hostId=\${hostId}\`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}`;

  // Site config template - Updated with more values
  const siteConfigTemplate = `export const siteConfig = {
  hostId: "<%= hostId %>",
  hostName: "<%= hostName %>",
  email: "<%= email %>",
  domain: "<%= domain %>",
  apiUrl: "<%= apiUrl %>"
};`;

  // Global CSS 
  const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 244, 244, 245;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}`;

  // Write all template files
  await fs.writeFile(path.join(this.templateDir, 'src/app/layout.js.ejs'), layoutFile);
  await fs.writeFile(path.join(this.templateDir, 'src/app/page.js.ejs'), pageFile);
  await fs.writeFile(path.join(this.templateDir, 'src/app/api/hosts/[hostId]/route.js.ejs'), hostApiRoute);
  await fs.writeFile(path.join(this.templateDir, 'src/app/api/properties/route.js.ejs'), propertiesApiRoute);
  await fs.writeFile(path.join(this.templateDir, 'src/config/site.js.ejs'), siteConfigTemplate);
  
  // Create styles directory with globals.css
  await fs.writeFile(path.join(this.templateDir, 'styles/globals.css'), globalCss);
  
  // Create placeholder image for properties
  await fs.ensureDir(path.join(this.templateDir, 'public'));
  await fs.writeFile(path.join(this.templateDir, 'public/placeholder-property.jpg'), '');
}


  /**
   * Génère un nouveau site pour un hôte donné.
   * Processus :
   * 1. Récupération des données (Hôte + Propriétés)
   * 2. Copie du template Next.js
   * 3. Hydratation des fichiers via EJS
   * 4. Installation des dépendances et build
   * 5. Lancement du serveur Next.js
   */
  async generateSite(sitePath: string, hostId: string): Promise<{ message: string; url: string }> {
  this.logger.log(`Starting site generation for ${hostId}...`);
  
  try {
      // Vérifier si le site existe déjà en base de données
      const existingSite = await this.siteInfoModel.findOne({ hostId }).exec();
      
      if (existingSite) {
        this.logger.log(`Found existing site for ${hostId} with status: ${existingSite.status}`);
      } else {
        this.logger.log(`No existing site found for ${hostId}, will create new one`);
      }
      
      if (existingSite && existingSite.status === 'ready') {
        this.logger.log(`Site already exists for host ${hostId}, starting it...`);
        return this.startSite(hostId);
      }

      if (existingSite) {
        try {
          await this.stopSite(hostId);
          await new Promise((resolve) => setTimeout(resolve, 700));
        } catch (stopErr) {
          this.logger.warn(`Could not fully stop existing site for ${hostId}: ${stopErr.message}`);
        }
      }

      // Récupérer les informations de l'hôte
      const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
      if (!host) {
          throw new Error(`Host with ID ${hostId} not found`);
      }
      this.logger.log(`Host found: ${host.email}`);

      // Récupérer les propriétés de l'hôte
      const hostProperties = await this.propertyModel.find({ firebaseUid: hostId }).exec();
      this.logger.log(`Found ${hostProperties.length} properties for host ${hostId}`);
      
      // Préparer les données pour le template
      const hostData = {
          hostId: host.firebaseUid,
          domainName: host.domainName || host.firebaseUid,
          hostName: host.isAgency ? host.businessName : `${host.firstName || ''} ${host.lastName || ''}`.trim(),
          email: host.email,
          firstName: host.firstName || '',
          lastName: host.lastName || '',
          isAgency: host.isAgency,
          businessName: host.businessName || '',
          country: host.country,
          phoneNumber: host.phoneNumber,
          apiUrl: this.apiServerUrl,
          propertyCount: hostProperties.length
      };

      const outputDir = path.join(this.outputDir, hostId);

        // Mettre à jour la base de données sans réinsérer un hostId déjà existant
        await this.siteInfoModel.updateOne(
          { hostId },
          {
            $set: {
              hostId,
              outputPath: outputDir,
              status: 'building',
              lastBuilt: new Date()
            },
            $unset: {
              error: 1,
              port: 1,
              url: 1
            }
          },
          { upsert: true }
        ).exec();

      this.sitesDatabase.set(hostId, {
          hostId,
          outputPath: outputDir,
          lastBuilt: new Date(),
          status: 'building'
      });

      // Générer le site
      await this.prepareOutputDirectory(outputDir);
      await this.generateFromTemplates(outputDir, hostData);
      await this.setupDependencies(outputDir);
      
      // Mettre à jour le statut après génération réussie
      await this.siteInfoModel.updateOne(
          { hostId },
          { 
              status: 'ready',
              lastBuilt: new Date()
          }
      ).exec();

      this.sitesDatabase.set(hostId, {
          hostId,
          outputPath: outputDir,
          lastBuilt: new Date(),
          status: 'ready'
      });
      
      // Démarrer le site et retourner l'URL avec le domaine correct
      const result = await this.startSite(hostId);

        // Retourner l'URL réellement démarrée (localhost:port ou domaine proxy selon la config)
      return {
          message: result.message,
          url: result.url
      };
  } catch (error) {
      this.logger.error(`Failed to generate site for ${hostId}: ${error.message}`);
      
      // Mettre à jour le statut d'erreur dans la base de données
      await this.siteInfoModel.updateOne(
          { hostId },
          { 
              status: 'error',
              error: error.message,
              lastBuilt: new Date()
          }
      ).exec();

      this.sitesDatabase.set(hostId, {
          hostId,
          outputPath: path.join(this.outputDir, hostId),
          lastBuilt: new Date(),
          status: 'error',
          error: error.message
      });
      
      throw new Error(`Site generation failed: ${error.message}`);
  }
}

// Modifier aussi la méthode startSite pour utiliser le bon domaine
async startSite(hostId: string): Promise<{ message: string; url: string }> {
  // Vérifier d'abord dans la base de données
  const dbSiteInfo = await this.siteInfoModel.findOne({ hostId }).exec();
  
  if (!dbSiteInfo) {
      throw new Error(`Site for host ${hostId} not found. Generate it first.`);
  }
  
  // Synchroniser avec la mémoire si nécessaire
  if (!this.sitesDatabase.has(hostId)) {
      this.sitesDatabase.set(hostId, {
          hostId: dbSiteInfo.hostId,
          outputPath: dbSiteInfo.outputPath,
          lastBuilt: dbSiteInfo.lastBuilt,
          status: dbSiteInfo.status,
          error: dbSiteInfo.error
      });
  }

  const siteInfo = this.sitesDatabase.get(hostId)!;
  
  if (siteInfo.status !== 'ready') {
      const outputPath = siteInfo.outputPath || dbSiteInfo.outputPath || path.join(this.outputDir, hostId);
      const hasGeneratedSite = await fs.pathExists(outputPath) && await fs.pathExists(path.join(outputPath, 'package.json'));

      if (!hasGeneratedSite) {
          throw new Error(`Site for host ${hostId} is not ready (status: ${siteInfo.status})`);
      }

      await this.siteInfoModel.updateOne(
        { hostId },
        {
          $set: {
            outputPath,
            status: 'ready',
            lastBuilt: dbSiteInfo.lastBuilt || new Date(),
          },
          $unset: {
            error: 1,
          },
        }
      ).exec();

      this.sitesDatabase.set(hostId, {
        ...siteInfo,
        outputPath,
        status: 'ready',
        error: undefined,
      });
  }
  
  if (this.runningSites.has(hostId)) {
      const runningSite = this.runningSites.get(hostId)!;
      const isHealthy = await this.isHttpResponsive(runningSite.port, 3000);

      if (isHealthy) {
        this.resetSiteTimeout(hostId);
        return {
            message: 'Site is already running',
            url: runningSite.url
        };
      }

      this.logger.warn(`Site ${hostId} is marked running on port ${runningSite.port} but is unresponsive. Restarting instance.`);
      try {
        await this.stopSite(hostId);
      } catch (stopErr) {
        this.logger.warn(`Failed to stop unresponsive site ${hostId}: ${stopErr.message}`);
      }
  }
  
  try {
    const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
    const domainName = host?.domainName || hostId;
    const maxAttempts = 6;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const port = await this.findAvailablePort();

      try {
        await this.startPreview(hostId, siteInfo.outputPath, port);

        // Utiliser localhost direct pour éviter les problèmes de résolution/host-header en dev
        const url = `http://localhost:${port}`;

        // Mettre à jour la base de données avec les infos de l'instance en cours
        await this.siteInfoModel.updateOne(
          { hostId },
          {
            port,
            url,
            lastStarted: new Date()
          }
        ).exec();

        return {
          message: 'Site started successfully',
          url
        };
      } catch (startErr) {
        const startMessage = startErr?.message || 'Unknown start error';
        lastError = startErr;

        if (this.usedPorts.has(port)) {
          this.releasePort(port);
        }

        if (this.isPortInUseError(startMessage) && attempt < maxAttempts) {
          this.logger.warn(`Port ${port} conflicted for ${hostId}. Retrying with another port (${attempt}/${maxAttempts})...`);
          continue;
        }

        throw startErr;
      }
    }

    throw lastError || new Error('Unable to start site after multiple port attempts');
  } catch (error) {
      this.logger.error(`Failed to start site for ${hostId}: ${error.message}`);
      
      // Enregistrer l'erreur dans la base de données
      await this.siteInfoModel.updateOne(
          { hostId },
          { 
              status: 'error',
              error: `Startup failed: ${error.message}`
          }
      ).exec();

      throw new Error(`Site startup failed: ${error.message}`);
  }
}


/**
 * Create necessary configuration files for the template
 */
private async createTemplateConfigFiles(): Promise<void> {
  // package.json template
  const packageJson = {
    name: "site-template",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start"
    },
    dependencies: {
      next: "^13.4.19",
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      axios: "^1.4.0"
    },
    devDependencies: {
      "@types/node": "^20.1.0",
      "@types/react": "^18.2.6",
      "autoprefixer": "^10.4.14",
      "postcss": "^8.4.24",
      "tailwindcss": "^3.3.2",
      "typescript": "^5.0.4"
    }
  };

  // next.config.js template
  const nextConfigTs = `const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/:hostId',
        destination: '/'
      },
      {
        source: '/:hostId/:path*',
        destination: '/:path*'
      }
    ]
  }
}

module.exports = nextConfig
`;
    
  // tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

  // postcss.config.js
  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

  // tsconfig.json
  const tsConfig = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

  // Write all config files
  await fs.writeFile(path.join(this.templateDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  await fs.writeFile(path.join(this.templateDir, 'next.config.js'), nextConfigTs);
  await fs.writeFile(path.join(this.templateDir, 'tailwind.config.js'), tailwindConfig);
  await fs.writeFile(path.join(this.templateDir, 'postcss.config.js'), postcssConfig);
  await fs.writeFile(path.join(this.templateDir, 'tsconfig.json'), tsConfig);
  
  // Sample env template - Ensuring all required values are included
  await fs.writeFile(path.join(this.templateDir, '.env.template'), `NEXT_PUBLIC_HOST_ID=<%= hostId %>
NEXT_PUBLIC_HOST_NAME=<%= hostName %>
NEXT_PUBLIC_DOMAIN=<%= domain %>
NEXT_PUBLIC_API_URL=<%= apiUrl %>
NEXT_PUBLIC_BASE_PATH=/<%= hostId %>
`);
}

  private async installCoreDependencies(): Promise<void> {
    try {
      const depsDir = path.dirname(this.sharedNodeModules);
      const packageJsonPath = path.join(depsDir, 'package.json');
      
      if (!(await fs.pathExists(packageJsonPath))) {
        const minimalPackageJson = {
          name: "site-generator-dependencies",
          version: "1.0.0",
          private: true,
          dependencies: {
            next: "^13.4.19",
            react: "^18.2.0",
            "react-dom": "^18.2.0",
            axios: "^1.4.0",
            ejs: "^3.1.9"
          },
          devDependencies: {
            typescript: "^5.0.4",
            "autoprefixer": "^10.4.14",
            "postcss": "^8.4.24",
            "tailwindcss": "^3.3.2"
          }
        };
        
        await fs.ensureDir(depsDir);
        await fs.writeFile(packageJsonPath, JSON.stringify(minimalPackageJson, null, 2));
      }
      
      this.logger.log(`Installing core dependencies in ${depsDir}...`);
      await this.executeCommand(depsDir, 'npm install --no-audit --no-fund');
      this.logger.log('Core dependencies installed successfully');
    } catch (error) {
      this.logger.error(`Failed to install core dependencies: ${error.message}`);
      throw error;
    }
  }

  private async processEjsTemplates(dir: string, hostData: any): Promise<void> {
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await this.processEjsTemplates(itemPath, hostData);
        } else if (path.extname(item) === '.ejs') {
          const templateContent = await fs.readFile(itemPath, 'utf8');
          let renderedContent = ejs.render(templateContent, {
            ...hostData,
            apiServerUrl: this.apiServerUrl
          });
          
          const outputPath = itemPath.replace('.ejs', '');
          await fs.writeFile(outputPath, renderedContent);
          await fs.remove(itemPath);
          this.logger.log(`Processed template: ${path.relative(dir, itemPath)}`);
        }
      }

      await this.createEnvFile(dir, hostData);
    } catch (error) {
      this.logger.error(`Error processing EJS templates: ${error.message}`);
      throw error;
    }
  }

  private async prepareOutputDirectory(outputDir: string): Promise<void> {
    try {
      if (await fs.pathExists(outputDir)) {
        this.logger.log(`Cleaning existing output directory: ${outputDir}`);
        await fs.remove(outputDir);
      }
      
      await fs.ensureDir(outputDir);
      this.logger.log(`Output directory prepared: ${outputDir}`);
    } catch (error) {
      this.logger.error(`Error preparing output directory: ${error.message}`);
      throw error;
    }
  }

  private async setupDependencies(outputDir: string): Promise<void> {
    try {
      const nodeModulesPath = path.join(outputDir, 'node_modules');
      
      if (await fs.pathExists(this.sharedNodeModules)) {
        try {
          if (await fs.pathExists(nodeModulesPath)) {
            await fs.remove(nodeModulesPath);
          }
          
          this.logger.log(`Creating symlink to shared node_modules: ${this.sharedNodeModules}`);
          await fs.symlink(this.sharedNodeModules, nodeModulesPath, 'dir');
          this.logger.log('Symlink created successfully');
          return;
        } catch (symlinkError) {
          this.logger.warn(`Failed to create symlink: ${symlinkError.message}. Will try installing dependencies.`);
        }
      }
      
      this.logger.log('Installing dependencies...');
      
      try {
        await this.executeCommand(
          outputDir, 
          'npm install --no-audit --no-fund --loglevel=error',
          600000
        );
        this.logger.log('Dependencies installed successfully');
      } catch (installError) {
        this.logger.warn(`Failed to install dependencies: ${installError.message}`);
        throw new Error('Failed to install dependencies');
      }
    } catch (error) {
      this.logger.error(`Error setting up dependencies: ${error.message}`);
      throw error;
    }
  }

  private async executeCommand(cwd: string, command: string, timeoutMs: number = 180000): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.logger.log(`Executing: ${command} in ${cwd}`);
      
      const childProcess = exec(command, {
        cwd,
        env: { ...process.env, NODE_ENV: 'development' },
        maxBuffer: 10 * 1024 * 1024
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (this.debugMode) {
          this.logger.log(`[CMD OUT] ${data.toString().trim()}`);
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (this.debugMode) {
          this.logger.warn(`[CMD ERR] ${data.toString().trim()}`);
        }
      });
      
      const timeoutId = setTimeout(() => {
        this.logger.warn(`Command timed out after ${timeoutMs}ms: ${command}`);
        try {
          childProcess.kill('SIGKILL');
        } catch (e) {}
        reject(new Error(`Command timed out: ${command}`));
      }, timeoutMs);
      
      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          this.logger.log(`Command completed successfully: ${command}`);
          resolve(stdout);
        } else {
          const errorMsg = `Command exited with code ${code}: ${stderr}`;
          this.logger.warn(errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        this.logger.error(`Error executing command: ${err.message}`);
        reject(err);
      });
    });
  }

// 4. Modification du next.config.js template pour prendre en compte le domainName
private async updateNextConfig(outputDir: string, hostData: any): Promise<void> {
  try {
    const host = await this.hostModel.findOne({ firebaseUid: hostData.hostId }).exec();
    const domainName = host?.domainName || hostData.hostId;
    
    // Mise à jour du fichier next.config.js
    const nextConfigPath = path.join(outputDir, 'next.config.js');
    if (await fs.pathExists(nextConfigPath)) {
      const nextConfigContent = await fs.readFile(nextConfigPath, 'utf8');
      
      // Remplacer la configuration de rewrite pour utiliser domainName
      const updatedNextConfig = nextConfigContent.replace(
        /async rewrites\(\) {[\s\S]*?}/,
        `async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*'
      },
      {
        source: '/${domainName}',
        destination: '/'
      },
      {
        source: '/${domainName}/:path*',
        destination: '/:path*'
      }
    ]
  }`
      );
      
      await fs.writeFile(nextConfigPath, updatedNextConfig);
      this.logger.log(`Updated next.config.js for domain ${domainName}`);
    }
  } catch (error) {
    this.logger.error(`Error updating Next config: ${error.message}`);
    throw error;
  }
}

// 5. Modification de la méthode generateFromTemplates pour appeler updateNextConfig
private async generateFromTemplates(outputDir: string, hostData: any): Promise<void> {
  try {
    this.logger.log(`Generating site from templates for ${hostData.hostId}...`);
    
    await fs.copy(this.templateDir, outputDir, {
      filter: (src) => {
        return !src.includes('node_modules') && 
               !src.includes('.git') && 
               !src.includes('.next') && 
               !src.includes('dist');
      }
    });
    
    await this.processEjsTemplates(outputDir, hostData);
    await this.updateNextConfig(outputDir, hostData); // Ajouter cette ligne
    this.logger.log(`Site generation completed for ${hostData.hostId}`);
  } catch (error) {
    this.logger.error(`Error generating site from templates: ${error.message}`);
    throw error;
  }
}

private async startPreview(hostId: string, siteDir: string, port: number): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      // Récupérer le host pour obtenir le domainName
      const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
      const domainName = host?.domainName || hostId;
      
      const env = {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development',
        NEXT_PUBLIC_HOST_ID: hostId,
        NEXT_PUBLIC_DOMAIN_NAME: domainName,
        NEXT_PUBLIC_API_URL: this.apiServerUrl,
        NEXT_PUBLIC_BASE_URL: `http://localhost:${port}` // URL runtime directe en dev
      };

      this.logger.log(`🌐 Starting dev server for ${hostId} (${domainName}) on port ${port}...`);
      
      const child = spawn(
        npmCmd,
        ['run', 'dev', '--', '--turbo', '--hostname', '127.0.0.1', '--port', port.toString()],
        {
        cwd: siteDir,
        env,
        stdio: this.debugMode ? 'inherit' : 'pipe',
        shell: true
        }
      );

      let serverReady = false;
      let settled = false;

      const cleanupAndSettle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(readinessProbe);
        fn();
      };

      const markReady = () => {
        if (serverReady || settled) return;
        serverReady = true;

        // URL runtime directe en dev
        const url = `http://localhost:${port}`;
        this.runningSites.set(hostId, {
          hostId,
          process: child,
          port,
          startedAt: new Date(),
          url
        });

        this.resetSiteTimeout(hostId);
        this.logger.log(`✅ Dev server for ${hostId} (${domainName}) ready on port ${port}`);
        cleanupAndSettle(() => resolve());
      };

      const failStart = (error: Error) => {
        cleanupAndSettle(() => {
          if (!child.killed) {
            try {
              child.kill();
            } catch {}
          }
          reject(error);
        });
      };

      const timeout = setTimeout(() => {
        failStart(new Error(`Server startup timed out after 2 minutes`));
      }, 120000);

      const readinessProbe = setInterval(async () => {
        if (serverReady || settled) return;
        const responsive = await this.isHttpResponsive(port, 1500);
        if (responsive) {
          markReady();
        }
      }, 1000);

      const detectReadyOrConflict = (output: string) => {
        if (this.debugMode) this.logger.log(`[Next.js ${domainName}] ${output.trim()}`);

        if (!serverReady && (output.includes('Ready') || output.includes('started server') || output.includes('ready -'))) {
          markReady();
          return;
        }

        if (!serverReady && this.isPortInUseError(output)) {
          this.releasePort(port);
          failStart(new Error(`Port ${port} already in use`));
        }
      };
      
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        detectReadyOrConflict(output);
      });

      child.stderr?.on('data', (data) => {
        const error = data.toString();
        if (this.debugMode) this.logger.error(`[Next.js ${domainName} ERROR] ${error.trim()}`);
        detectReadyOrConflict(error);
      });

      child.on('close', (code) => {
        if (settled && serverReady && code === 0) {
          return;
        }

        clearTimeout(timeout);
        clearInterval(readinessProbe);
        
        if (this.runningSites.has(hostId)) {
          this.runningSites.delete(hostId);
          this.releasePort(port);
          
          if (this.siteTimeouts.has(hostId)) {
            clearTimeout(this.siteTimeouts.get(hostId)!);
            this.siteTimeouts.delete(hostId);
          }
        }
        
        if (!serverReady && code !== 0) {
          if (!settled) {
            settled = true;
            reject(new Error(`Server process exited with code ${code}`));
          }
        }
      });

      child.on('error', (error) => {
        failStart(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

private async createEnvFile(dir: string, hostData: any): Promise<void> {
  try {
    // Récupérer le host pour obtenir le domainName
    const host = await this.hostModel.findOne({ firebaseUid: hostData.hostId }).exec();
    const domainName = host?.domainName || hostData.hostId;
    
    const envTemplate = `NEXT_PUBLIC_HOST_ID=${hostData.hostId}
      NEXT_PUBLIC_HOST_NAME=${hostData.hostName}
      NEXT_PUBLIC_DOMAIN_NAME=${domainName}
      NEXT_PUBLIC_DOMAIN=${domainName}.localhost
      NEXT_PUBLIC_API_URL=${this.apiServerUrl}
      NEXT_PUBLIC_BASE_PATH=/${domainName}
      NEXT_PUBLIC_FIREBASE_API_KEY=${process.env.FIREBASE_API_KEY}
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${process.env.FIREBASE_AUTH_DOMAIN}
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID}
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${process.env.FIREBASE_STORAGE_BUCKET}
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${process.env.FIREBASE_MESSAGING_SENDER_ID}
      NEXT_PUBLIC_FIREBASE_APP_ID=${process.env.FIREBASE_APP_ID}
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${process.env.FIREBASE_MEASUREMENT_ID}
      `;

    const envOutputPath = path.join(dir, '.env.local');
    await fs.writeFile(envOutputPath, envTemplate.trim());

    this.logger.log(`Created .env.local file for host ${hostData.hostId} with domain ${domainName}`);
  } catch (error) {
    this.logger.error(`Error creating .env file: ${error.message}`);
    throw error;
  }
}

  /*async deleteSite(hostId: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Attempting to delete site for host ${hostId}`);
      
      // First stop the site if it's running
      if (this.runningSites.has(hostId)) {
        await this.stopSite(hostId);
      }
      
      // Remove from in-memory map
      this.sitesDatabase.delete(hostId);
      
      // Remove from database
      await this.siteInfoModel.deleteOne({ hostId }).exec();
      
      // Remove the site directory
      const siteDir = path.join(this.outputDir, hostId);
      if (await fs.pathExists(siteDir)) {
        await fs.remove(siteDir);
        this.logger.log(`Removed site directory: ${siteDir}`);
      }
      
      return { message: `Site ${hostId} has been completely deleted and can now be regenerated` };
    } catch (error) {
      this.logger.error(`Failed to delete site ${hostId}: ${error.message}`);
      throw new Error(`Site deletion failed: ${error.message}`);
    }
  }*/
}