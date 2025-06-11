// src/scripts/update-admin-role.ts
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import serviceAccountJson from '../../config/firebase-service-account.json';

dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = serviceAccountJson as admin.ServiceAccount;

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
