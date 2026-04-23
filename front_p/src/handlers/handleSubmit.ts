'use client';
import axios from "axios";
import imageCompression from "browser-image-compression";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { auth } from "../firebaseConfig";

// Type définition pour le retour de handleSubmit
interface SubmitResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Function to compress an image before sending
const compressImage = async (file: File): Promise<File> => {
  // Only compress if it's an image file
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Error compressing image:", error);
      throw error;
    }
  }
  // Return original file if not an image
  return file;
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to encode file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};

const prepareDocumentPayload = async (file: File): Promise<string> => {
  const fileToStore = file.type.startsWith('image/') ? await compressImage(file) : file;
  return fileToBase64(fileToStore);
};

// Dedicated cleanup function to ensure all resources are properly deleted
const cleanupResources = async (firebaseUser: any) => {
  try {
    // Delete the Firebase user if it exists
    if (firebaseUser) {
      console.log("Deleting Firebase user due to error in subsequent steps");
      try {
        await deleteUser(firebaseUser);
        console.log("Firebase user deleted successfully");
      } catch (deleteError) {
        console.error("Error deleting Firebase user:", deleteError);
        // We still continue even if deletion fails
      }
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
};

// Fonction principale modifiée pour retourner un objet SubmitResult
export const handleSubmit = async (formData: any, nextStep: Function | null = null): Promise<SubmitResult> => {
  let firebaseUser = null;
  let backendSuccess = false;
  
  try {
    // Preliminary validation of form data
    if (!formData.email || !formData.password) {
      return { success: false, error: "Email et mot de passe sont requis" };
    }
  
    if (!formData.kbisOrId) {
      return { success: false, error: "Le document KBIS/ID est requis" };
    }
  
    if (formData.hasRepresentative && (!formData.proxy || !formData.repId)) {
      return { success: false, error: "Les documents du représentant sont requis quand un représentant est sélectionné" };
    }
  
    // 🔹 Step 1: Create Firebase user first
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      firebaseUser = userCredential.user;
      console.log("Firebase user created with UID:", firebaseUser.uid);
    } catch (firebaseError: any) {
      // Handle specific Firebase auth errors
      console.error("Firebase auth error:", firebaseError);
      
      if (firebaseError.code === 'auth/email-already-in-use') {
        return { 
          success: false, 
          error: "Cette adresse email est déjà utilisée. Veuillez vous connecter ou utiliser une autre adresse email." 
        };
      } else {
        return { 
          success: false, 
          error: firebaseError.message || "Erreur lors de la création du compte" 
        };
      }
    }
    
    // 🔹 Step 2: Encode files to base64 for MongoDB storage
    const filePayloads: any = {};
    filePayloads.kbisOrId = await prepareDocumentPayload(formData.kbisOrId);

    if (formData.hasRepresentative) {
      filePayloads.proxy = await prepareDocumentPayload(formData.proxy);
      filePayloads.repId = await prepareDocumentPayload(formData.repId);
    }
    
    // 🔹 Step 3: Prepare data to send to backend API
    const propertiesCount = Number(formData.propertiesCount);
    
    // Create data object based on DTO structure
    const dataToSend: any = {
      email: formData.email,
      password: formData.password,
      country: formData.country,
      phoneNumber: formData.phoneNumber,
      propertiesCount,
      isAgency: formData.isAgency,
      hasRepresentative: formData.hasRepresentative,
      role: 'host',
      domainName: formData.domainName || undefined,
      firebaseUid: firebaseUser.uid,
      // Include encoded document payloads for MongoDB storage
      ...filePayloads
    };

    // Add agency-specific data if isAgency is true
    if (formData.isAgency) {
      dataToSend.businessName = formData.businessName;
      dataToSend.businessId = formData.businessId;
      dataToSend.headOffice = formData.headOffice;
    } else {
      // Add individual host data
      dataToSend.firstName = formData.firstName;
      dataToSend.lastName = formData.lastName;
      dataToSend.id = formData.id;
      dataToSend.address = formData.address;
    }
        
    // Log what we're sending to the backend for debugging
    console.log("Sending data to backend:", JSON.stringify(dataToSend, null, 2));
    
    // 🔹 Step 4: Send data to the backend API
    try {
      const response = await axios.post("http://localhost:3000/hosts", dataToSend, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("API response:", response.data);
      
      // Mark the backend call as successful
      backendSuccess = true;
      
      // Store Firebase UID in localStorage for later use (only if everything is successful)
      localStorage.setItem('firebaseUserId', firebaseUser.uid);
      
      // Store signup progress in localStorage
      localStorage.setItem('userSignupProgress', JSON.stringify({
        step: 'signup_completed',
        emailVerified: false
      }));
      
      return { success: true, data: response.data };
    } catch (apiError) {
      // Specific handling for API errors
      console.error("API call failed:", apiError);
      
      // Clean up resources since backend call failed
      await cleanupResources(firebaseUser);
      
      // Handle API errors specifically
      if (axios.isAxiosError(apiError)) {
        if (apiError.response) {
          console.error("API response:", apiError.response.data);
          console.error("Status code:", apiError.response.status);
          return {
            success: false,
            error: apiError.response.data.message || "Erreur serveur"
          };
        } else {
          return {
            success: false,
            error: "Erreur de connexion. Vérifiez votre connexion internet."
          };
        }
      } else {
        return {
          success: false,
          error: apiError instanceof Error ? apiError.message : "Erreur inconnue"
        };
      }
    }
  } catch (error) {
    // Only perform cleanup if the backend registration wasn't successful
    if (!backendSuccess) {
      await cleanupResources(firebaseUser);
    }
    
    // Handle errors
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error);
      if (error.response) {
        console.error("API response:", error.response.data);
        console.error("Status code:", error.response.status);
        return {
          success: false,
          error: error.response.data.message || "Erreur serveur"
        };
      } else {
        console.error("Connection or configuration error:", error.message);
        return {
          success: false,
          error: "Erreur de connexion. Vérifiez votre connexion internet."
        };
      }
    } else if (error instanceof Error) {
      console.error("Unknown error:", error);
      return {
        success: false,
        error: error.message
      };
    } else {
      console.error("Unexpected error:", error);
      return {
        success: false,
        error: "Une erreur inattendue s'est produite"
      };
    }
  }
};