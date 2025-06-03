import * as admin from 'firebase-admin';

// Ajouter un claim au user Firebase
async function addCustomClaimToAdmin(firebaseUid: string) {
  try {
    // Ajout du claim
    await admin.auth().setCustomUserClaims('xuGpKdnahvTJYOqvdpG8QY3IVr53', { role: 'admin' });
    await admin.auth().setCustomUserClaims('lqayYCcg9TMXDemyBhiK5JtGfvh2', { role: 'admin' });
    console.log(`Custom claim "role" ajouté pour l'admin avec UID: ${firebaseUid}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du custom claim:', error);
  }
}

// Exemple d'utilisation avec un UID Firebase d'un admin
addCustomClaimToAdmin('xuGpKdnahvTJYOqvdpG8QY3IVr53');
addCustomClaimToAdmin('lqayYCcg9TMXDemyBhiK5JtGfvh2');
