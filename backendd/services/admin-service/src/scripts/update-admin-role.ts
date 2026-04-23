// src/scripts/update-admin-role.ts
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Initialize Firebase Admin SDK
function parseServiceAccount(raw: string): admin.ServiceAccount {
  return JSON.parse(raw) as admin.ServiceAccount;
}

function loadServiceAccount(): admin.ServiceAccount {
  const envJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (envJson) {
    return parseServiceAccount(envJson);
  }

  const localConfigPath = path.resolve(process.cwd(), 'config', 'firebase-service-account.json');
  if (fs.existsSync(localConfigPath)) {
    return parseServiceAccount(fs.readFileSync(localConfigPath, 'utf-8'));
  }

  const sharedConfigPath = path.resolve(process.cwd(), '..', 'config', 'firebase-service-account.json');
  if (fs.existsSync(sharedConfigPath)) {
    return parseServiceAccount(fs.readFileSync(sharedConfigPath, 'utf-8'));
  }

  throw new Error(
    "Firebase service account introuvable. Définissez FIREBASE_SERVICE_ACCOUNT_KEY ou ajoutez config/firebase-service-account.json",
  );
}

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Updates the Firebase custom claims to include role: 'admin'
 */
async function updateAdminRole(email: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);

    // Set custom claim { role: 'admin' }
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

    console.log(`✅ Custom claim { role: 'admin' } set for user ${email}`);
  } catch (error) {
    console.error(`❌ Failed to update role for ${email}:`, error);
  }
}

// === Call the function with your admin's email ===
const email = 'estatias.services@gmail.com';
updateAdminRole(email);
