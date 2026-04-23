# Estatias - Plateforme SaaS de Gestion et Génération de Sites de Location Saisonnière

**Estatias** est une solution SaaS innovante permettant aux propriétaires de biens immobiliers (Airbnb, gîtes, locations saisonnières) de créer instantanément leur propre site web de réservation directe, sans aucune compétence technique.

## 🚀 Vision du Projet

L'objectif d'Estatias est de redonner de l'indépendance aux hôtes en réduisant leur dépendance aux grandes plateformes (Airbnb, Booking.com) et en supprimant les commissions élevées. En un clic, un hôte peut générer un site professionnel, performant et optimisé pour la conversion.

## ✨ Fonctionnalités Principales

- **Générateur de Site Automatisé** : Création instantanée d'un site web Next.js complet et indépendant.
- **Tableau de Bord Centralisé** : Gestion des propriétés, tarifs et calendriers depuis une interface unique.
- **IA Content Generation** : Génération automatique de titres accrocheurs et de descriptions détaillées optimisées pour le SEO.
- **Synchronisation iCal** : Synchronisation des calendriers avec les plateformes externes pour éviter les doubles réservations.
- **Paiements Sécurisés** : Intégration native de Stripe pour recevoir les paiements directement.
- **Architecture Microservices** : Système robuste et scalable divisé en services spécialisés (Booking, Property, Site Generator, etc.).

## 🛠️ Stack Technologique

### Frontend
- **Framework** : Next.js 15 (App Router), React 19
- **Style** : Tailwind CSS 4, Ant Design 5, Framer Motion
- **State Management** : Redux Toolkit
- **Validation** : React Hook Form, Class-validator

### Backend (Architecture Microservices)
- **Framework** : NestJS 11
- **Base de données** : MongoDB (via Mongoose)
- **Authentification** : JWT, Passport, Firebase Admin
- **Paiement** : Stripe SDK
- **Proxy/Tunneling** : Ngrok

## ⚙️ Installation et Exécution

### Pré-requis
- **Node.js** (v18+)
- **MongoDB** (Local ou Atlas)
- **PM2** (`npm install -g pm2`)

### Lancement Rapide (Windows)

Le projet inclut des scripts automatisés pour faciliter le lancement de l'ensemble des microservices :

1.  **Backend** :
    ```bash
    ./start-backend-dev.bat
    ```
    *Ce script installe les dépendances de chaque service et les lance via PM2.*

2.  **Frontend (Dashboard)** :
    ```bash
    ./start-frontend-dev.bat
    ```

3.  **Visualiser les logs** :
    ```bash
    pm2 logs
    ```

## 📖 Usage

1.  **Connexion** : Accédez au Dashboard via le frontend.
2.  **Ajout de Biens** : Enregistrez vos propriétés avec photos, équipements et tarifs.
3.  **Génération** : Cliquez sur "Générer mon site". Le service compile alors une instance dédiée de votre site.
4.  **Personnalisation** : Utilisez l'IA pour optimiser vos contenus et configurez votre domaine ou URL personnalisée.

---
*Projet développé par **Aram Filali***