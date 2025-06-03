// fileUpload.ts
/*import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseConfig";

export const uploadFileToFirebase = async (file: File): Promise<string> => {
  if (!file) {
    return '';
  }
  const storageRef = ref(storage, `uploads/${file.name}`);
  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef); // Récupère l'URL du fichier téléchargé
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    return '';
  }
};*/
