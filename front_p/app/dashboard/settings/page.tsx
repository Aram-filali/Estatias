'use client';
import { useState, memo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, 
  FaSignOutAlt, FaUser, FaGlobe, FaLock, FaPlug, 
  FaEnvelope, FaEye, FaEyeSlash, FaFileAlt
} from 'react-icons/fa';
import styles from './settings.module.css';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faFileAlt, faUpload, faSave } from '@fortawesome/free-solid-svg-icons';
import stylesMy from './MyWebsite.module.css';
import { HostData } from '../../../types/hostTypes';
import DocumentCard from '../../../components/dashboard/documentCard';
import SocialMediaTab from '../../../components/dashboard/SocialMediaTab'; // Adjust path as needed
import { useDocumentsHandler } from '../../../src/handlers/useDocumentHandler';
import countries from '@/utils/countries';

interface UserProfile {
  firstname: string;
  lastname: string;
  businessname: string;
  headoffice: string;
  phone: string;
  country: string;
  profileImage?: string;
  isAgency: boolean;
}

interface UpdateProfileDto {
  id: string;
  name: string;
  businessname: string;
  headoffice: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  websiteUrl: string;
  notifications: Notification[];
  isAgency: boolean;
   // Add social media fields
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
}

interface Notification {
  id: number;
  text: string;
  date: string;
  type?: string;
  isRead: boolean;
  actionUrl?: string;
}


// Interface pour les props du composant DocumentsTab
interface DocumentsTabProps {
  hostData: HostData;
  authToken: string | null;
}



// Composant DocumentsTab
// Updated DocumentsTab component
function DocumentsTab({ hostData, authToken }: DocumentsTabProps) {
  // Utiliser le handler personnalisé
  const { handleUpdateDocuments, fetchDocuments, documentUrls, isLoading, error } = useDocumentsHandler(hostData, authToken);

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  // Initialize formData with actual fetched data
  const [formData, setFormData] = useState({
    kbisOrId: '',
    proxy: '',
    repId: '',
    hasRepresentative: false, // Will be updated when documents are fetched
    previews: {
      kbisOrId: '',
      proxy: '',
      repId: '',
    },
    isAgency: hostData?.isAgency || false,
  });
    
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Update formData when documentUrls change (after fetch)
  useEffect(() => {
    if (documentUrls.kbisOrId || documentUrls.proxy || documentUrls.repId) {
      setFormData(prev => ({
        ...prev,
        hasRepresentative: !!(documentUrls.proxy || documentUrls.repId), // Set to true if proxy or repId exists
      }));
    }
  }, [documentUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
  
    setFormData(prev => ({
      ...prev,
      [name]: file,
      previews: {
        ...prev.previews,
        [name]: file ? URL.createObjectURL(file) : ''
      }
    }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSave = async () => {
    setStatusMessage(null);
    const success = await handleUpdateDocuments(formData);
    
    if (success) {
      setStatusMessage('Documents updated successfully!');
    } else if (error) {
      setStatusMessage(`Error: ${error}`);
    }

    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const router = useRouter();

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(formData.previews).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [formData.previews]);

  // Helper function to get document name from URL or file
  const getDocumentName = (
    formField: string | File | undefined, 
    existingUrl: string | null | undefined
  ): string => {
    // If user selected a new file
    if (formField instanceof File) {
      return formField.name;
    }
    
    // If there's an existing document URL, extract filename or show "Document uploaded"
    if (existingUrl && typeof existingUrl === 'string' && existingUrl.trim() !== '') {
      try {
        // Try to extract filename from Firebase URL
        const urlParts = existingUrl.split('/o/');
        if (urlParts.length > 1) {
          const pathWithQuery = urlParts[1];
          const pathWithoutQuery = pathWithQuery.split('?')[0];
          const decodedPath = decodeURIComponent(pathWithoutQuery);
          const filename = decodedPath.split('/').pop();
          if (filename) {
            return filename;
          }
        }
        // Fallback: show that document exists
        return 'Document uploaded';
      } catch (error) {
        return 'Document uploaded';
      }
    }
    
    return 'No document uploaded';
  };

  return (
    <div className={stylesMy.contentArea}>
      <div className={stylesMy.sectionHeader}>
        <h2>Your Documents</h2>
      </div>
      
      {statusMessage && (
        <div className={`${styles.successPopup} ${error ? styles.errorPopupContent : styles.successPopupContent}`}>
          {statusMessage}
        </div>
      )}

      <div className={stylesMy.documentsList}>
        <DocumentCard 
          icon={faIdCard}
          title={hostData?.isAgency ? 'KBIS Document' : 'Identity Document'}
          documentName={getDocumentName(formData.kbisOrId, documentUrls.kbisOrId)}
          previewUrl={formData.previews.kbisOrId}
          existingDocumentUrl={documentUrls.kbisOrId}
          fieldName="kbisOrId"
          onFileChange={handleFileChange}
        />
        
        {formData.hasRepresentative && (
          <>
            <DocumentCard 
              icon={faFileAlt}
              title="Proxy Document"
              documentName={getDocumentName(formData.proxy, documentUrls.proxy)}
              previewUrl={formData.previews.proxy}
              existingDocumentUrl={documentUrls.proxy}
              fieldName="proxy"
              onFileChange={handleFileChange}
            />
            
            <DocumentCard 
              icon={faIdCard}
              title="Representative's ID Document"
              documentName={getDocumentName(formData.repId, documentUrls.repId)}
              previewUrl={formData.previews.repId}
              existingDocumentUrl={documentUrls.repId}
              fieldName="repId"
              onFileChange={handleFileChange}
            />
          </>
        )}
        
        <div className={stylesMy.formToggle}>
          <label className={stylesMy.toggleLabel}>
            <input 
              type="checkbox" 
              name="hasRepresentative" 
              checked={formData.hasRepresentative}
              onChange={handleCheckboxChange} 
              className={stylesMy.toggleInput}
            />
            <span className={stylesMy.toggleSwitch}></span>
            <span>The real owner is not the representative</span>
          </label>
        </div>
        
        <div className={stylesMy.actionButtons}>
          <button 
            className={stylesMy.saveButton} 
            onClick={handleSave}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faSave} /> {isLoading ? 'Saving...' : 'Save Documents'}
          </button>
        </div>
      </div>
    </div>
  );
}


// Main Settings Component
export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstname: '',
    lastname: '',
    businessname: '',
    headoffice: '',
    phone: '',
    country: '',
    isAgency: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const [error, setErrorr] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [host, setHost] = useState<UpdateProfileDto | null>(null);
  //const [loading, setLoading] = useState(true);



  // Phone number handling states
  const [phonePrefix, setPhonePrefix] = useState('+33');
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.code === 'FR'));
  const [isClient, setIsClient] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Add these to component state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

    // Dans le composant principal Settings

  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);



  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Update phone prefix when country changes
  useEffect(() => {
    if (!isClient || !host) return;
    
    const selectedCountry = countries.find(c => c.code === host.country);
    if (selectedCountry) {
      setSelectedCountry(selectedCountry);
      setPhonePrefix(selectedCountry.prefix);
    }
  }, [host?.country, isClient]);


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          await fetchHostData(user.uid, token);
          await fetchSubscriptionData(user.uid, token);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setErrorr("Authentication error. Please try logging in again.");
        } finally {
          setLoading(false);
        }
      } else {
        setErrorr("You must be logged in to view the dashboard.");
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Extract token from URL when component mounts
  useEffect(() => {
    // Extract token from query parameters 
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setResetToken(token);
    }
  }, []);


  // 2. Fix the handleChange function to use correct field names
const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  
  if (!host) return;
  
  let newValue: any = value;

  if (name === 'phone') {
    if (!phonePrefix) return;
    let digits = value.replace(/\D/g, '');
    const prefixDigits = phonePrefix.replace(/\D/g, '');
    if (digits.startsWith(prefixDigits)) {
      digits = digits.slice(prefixDigits.length);
    }

    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 5 || i === 8) formatted += ' ';
      formatted += digits[i];
    }

    newValue = formatted.trim();
  }

  setHost({
    ...host,
    [name]: newValue
  });
}, [host, phonePrefix]);

  const passwordHandleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(""); // Reset error message

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    // Password complexity validation
    if (newPassword.length < 8) {
      setErrorMessage("New password must contain at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setErrorMessage("User not found, please log in again.");
      setIsSubmitting(false);
      return;
    }

    const userId = user.uid;
    const email = user.email;

    if (!email) {
      setErrorMessage("User email not available.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Verify current password by reauthenticating user
      try {
        // Create credential object
        const credential = EmailAuthProvider.credential(email, currentPassword);
        
        // Reauthenticate user
        await reauthenticateWithCredential(user, credential);
        
        // If we reach here, reauthentication succeeded = correct password
      } catch (authError) {
        console.error("Reauthentication error:", authError);
        setErrorMessage("Current password is incorrect.");
        setIsSubmitting(false);
        return;
      }

      // 2. If reauthentication succeeded, send password change request
      const response = await axios.post(
        `${API_BASE_URL}/hosts/change-password`, 
        { userId, newPassword }
      );

      console.log("Server response:", response);

      if (response.status === 201 && response.data.message) {
        setSuccessMessage('Password successfully changed!');
        setShowSuccessPopup(true);
        
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      } else {
        throw new Error(response.data.error || 'Failed to change password.');
      }
    } catch (error: any) {
      console.error("Error during request:", error);
      
      if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Server connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!host || !authToken) {
      setError("Cannot update profile: No authentication data available");
      return;
    }
    
    try {
      // Prepare data to send to backend
      const updateData = {
        firebaseUid: host.id,
        isAgency: host.isAgency,
        // Fields specific to account type
        ...(host.isAgency ? {
          businessname: host.businessname,
          headoffice: host.headoffice,
        } : {
          firstname: host.firstname,
          lastname: host.lastname,
        }),
        // Common fields
        country: host.country,
        email: host.email,
        phoneNumber: host.phone,
        //notifications: host.notifications || [],
        websiteUrl: host.websiteUrl || ''
      };
  
      // Send data to backend
      const response = await axios.patch(
        `${API_BASE_URL}/hosts/profile/${host.id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
  
      if (response.status === 200) {
        // Update successful
        setHost(response.data.profile);
        setSuccessMessage('Profile updated successfully!');
        setShowSuccessPopup(true);
        
        // Hide popup after 3 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };



  

  const handleUpdateDocuments = async (documentsData: any) => {
    // This would contain the logic to update documents
    // For now, just return a success
    return true;
  };

  const fetchHostData = async (hostId: string, token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/hosts/profile/${hostId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profileData = response.data.profile;

    console.log("Full response data:", response.data);
    console.log("Profile data:", profileData);
    console.log("phoneNumber from backend:", profileData.phoneNumber);
    console.log("country from backend:", profileData.country);

    // Format phone number for display
    let formattedPhone = '';
    if (profileData.phoneNumber) {
      // Remove any existing formatting and country prefix
      let digits = profileData.phoneNumber.replace(/\D/g, '');
      
      // Find the country to get its prefix
      const userCountry = countries.find(c => c.code === (profileData.country || 'FR'));
      if (userCountry) {
        const prefixDigits = userCountry.prefix.replace(/\D/g, '');
        // Remove country prefix if it exists at the start
        if (digits.startsWith(prefixDigits)) {
          digits = digits.slice(prefixDigits.length);
        }
      }
      
      // Format the remaining digits
      let formatted = '';
      for (let i = 0; i < digits.length; i++) {
        if (i === 2 || i === 5 || i === 8) formatted += ' ';
        formatted += digits[i];
      }
      formattedPhone = formatted.trim();
    }

    // Set host data with proper initialization
    setHost({
      id: profileData.id || profileData.firebaseUid,
      name: profileData.name || `${profileData.firstname || ''} ${profileData.lastname || ''}`.trim(),
      businessname: profileData.businessname || '',
      headoffice: profileData.headoffice || '',
      firstname: profileData.firstname || '',
      lastname: profileData.lastname || '',
      email: profileData.email || '',
      phone: formattedPhone, // Use formatted phone
      country: profileData.country || 'FR',
      status: profileData.status || '',
      websiteUrl: profileData.websiteUrl || '',
      notifications: profileData.notifications || [],
      isAgency: profileData.isAgency || false,
      // Social media fields
      facebookUrl: profileData.facebookUrl || '',
      instagramUrl: profileData.instagramUrl || '',
      linkedinUrl: profileData.linkedinUrl || '',
      twitterUrl: profileData.twitterUrl || '',
      youtubeUrl: profileData.youtubeUrl || '',
      tiktokUrl: profileData.tiktokUrl || '',
    });

  } catch (err) {
    console.error("Error fetching host data:", err);
    setError("Failed to load host data.");
  }
};

  const fetchSubscriptionData = async (hostId: string, token: string) => {
    // Function placeholder as mentioned in your original code
    try {
      // Add implementation here when needed
    } catch (err) {
      console.error("Error fetching subscription data:", err);
    }
  };



  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [errorr, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


const handleDeleteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setDeleteConfirm(e.target.value);
};

const handleDeleteAccount = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (deleteConfirm !== "DELETE") {
    setDeleteError("Please type DELETE to confirm account deletion");
    return;
  }

  setShowFinalConfirm(true);
};

const confirmFinalDelete = async () => {
  setDeleteLoading(true);
  setDeleteError("");
  setDeleteSuccess("");
  setShowFinalConfirm(false);

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Please log in again");

    const token = await currentUser.getIdToken(true);

    const response = await axios.post(
      `${API_BASE_URL}/hosts/delete-host`, 
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data?.message === 'Account deleted successfully') {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      //setDeleteSuccess("Account deleted successfully! Redirecting...");
      setTimeout(() => router.push("/"), 2000);
    } else {
      throw new Error(response.data?.error || "Failed to delete account");
    }
  } catch (err: any) {
    if (err.code === "auth/requires-recent-login") {
      setDeleteError("Please log out and log back in before deleting your account.");
    } else {
      setDeleteError(err.response?.data?.message || err.message || "An error occurred");
    }
  } finally {
    setDeleteLoading(false);
  }
};


// Add this callback function to handle updates from the SocialMediaTab
const handleSocialUpdate = useCallback((updatedSocialData: any) => {
  setHost(prev => prev ? { ...prev, ...updatedSocialData } : null);
}, []);


  return (
    <div>
      {/* Success popup */}
      {showSuccessPopup && (
        <div className={styles.successPopup}>
          <div className={styles.successPopupContent}>
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      <header className={styles.header}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Profile Settings</h1>
        </div>
        <div className={styles.profileSection}>
         
          <div className={styles.profileInfo}>
            <span>{host?.name}</span>
            <div className={styles.avatar}>{host?.name?.charAt(0) || ''}</div>
          </div>
        </div>
      </header>

      <div className={styles.settingsContainer}>
        <div className={styles.settingsTabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser /> Profile
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'documents' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FaFileAlt /> Documents
          </button>

          <button 
            className={`${styles.tabButton} ${activeTab === 'security' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FaLock /> Password
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'social' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('social')}
          >
            <FaGlobe /> Social Media
          </button>

         {/* <button 
            className={`${styles.tabButton} ${activeTab === 'integrations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <FaPlug /> Integrations
          </button>*/}
        </div>

        <div className={styles.settingsContent}>
          {activeTab === 'profile' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>Profile Settings</h2>
              
              <div className={styles.profileSettings}>
                
                
                <form className={styles.profileForm} onSubmit={handleProfileUpdate}>
                  {/* Show these fields only if NOT an agency */}
                  {(!host?.isAgency) && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="firstname">First Name</label>
                        <input 
                          type="text" 
                          id="firstname"
                          name="firstname"
                          placeholder="Enter your first name" 
                          value={host?.firstname || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="lastname">Last Name</label>
                        <input 
                          type="text" 
                          id="lastname" 
                          name="lastname"
                          placeholder="Enter your last name"
                          value={host?.lastname || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Show these fields only if IS an agency */}
                  {(host?.isAgency) && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="businessname">Business Name</label>
                        <input 
                          type="text" 
                          id="businessname" 
                          name="businessname"
                          placeholder="Enter your business name"
                          value={host?.businessname || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="headoffice">Head Office</label>
                        <input 
                          type="text" 
                          id="headoffice" 
                          name="headoffice"
                          placeholder="Enter your head office"
                          value={host?.headoffice || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Always show these fields */}
                  <div className={styles.inputRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="country">Country</label>
                      <select 
                        name="country" 
                        value={host?.country || 'FR'}
                        className={styles.select}
                        onChange={handleChange}
                      >
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="phone">Phone Number</label>
                      
                      <div className={styles.phoneInput}>
                        <span className={styles.phonePrefix}>{phonePrefix}</span>
                        <input 
                          type="tel" 
                          name="phone" 
                          value={host?.phone || ''}
                          placeholder="Phone Number" 
                          className={`${styles.input} ${styles.phoneNumber}`}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button type="submit" className={styles.primaryButton}>Save Changes</button>
                </form>
              </div>
            </div>
          )}

{activeTab === 'security' && (
  <div className={styles.settingsSection}>
    <h2 className={styles.sectionTitle}>Password Settings</h2>
    
    <div className={styles.securitySettings}>
      <form className={styles.passwordForm} onSubmit={passwordHandleChange}>
        <h3>Change Password</h3>
        
        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}
        
        <div className={styles.formGroup}>
          <label htmlFor="currentPassword">Current Password</label>
          <div className={styles.passwordInput}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="currentPassword" 
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              className={styles.showPasswordButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="newPassword">New Password</label>
          <div className={styles.passwordInput}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="newPassword" 
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <div className={styles.passwordInput}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="confirmPassword" 
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className={styles.primaryButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* Section de suppression de compte */}
      <div className={styles.dangerZone}>
        <h3 className={styles.dangerTitle}>Delete Account</h3>
        <p className={styles.warningText}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        
        <form onSubmit={handleDeleteAccount} className={styles.deleteForm}>
          <div className={styles.formGroup}>
            <label htmlFor="deleteConfirm" className={styles.label}>
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={handleDeleteInputChange}
              className={`${styles.input} ${styles.deleteInput}`}
              placeholder="Type DELETE"
              required
              autoComplete="off"
            />
          </div>
          
          {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
          {deleteSuccess && <div className={styles.successMessage}>{deleteSuccess}</div>}
          
          <button
            type="submit" // Changé de type="button" à type="submit"
            className={`${styles.button} ${styles.deleteButton}`}
            disabled={deleteLoading || deleteConfirm !== "DELETE"}
          >
            {deleteLoading ? "Processing..." : "Delete My Account"}
          </button>
        </form>
      </div>
    </div>
  </div>
)}

{showFinalConfirm && (
  <div className={styles.modalOverlay}>
    <div className={styles.confirmationModal}>
      <h3>Confirm Account Deletion</h3>
      <p>This action cannot be undone. All your data will be permanently deleted.</p>
      
      <div className={styles.modalButtons}>
        <button 
          onClick={() => setShowFinalConfirm(false)}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button 
          onClick={confirmFinalDelete}
          className={styles.deleteButton}
          disabled={deleteLoading}
        >
          {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </div>
  </div>
)}
            
         {/* Social Media Tab */}
          {activeTab === 'social' && (
            <SocialMediaTab 
              host={host}
              authToken={authToken}
              onUpdateHost={handleSocialUpdate}
            />
          )}
            
          {/*activeTab === 'integrations' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>Integrations</h2>
              
              <div className={styles.integrationsSettings}>
                <div className={styles.integrationCategory}>
                  <h3>Booking Channels</h3>
                  
                  <div className={styles.integrationItem}>
                    <div className={styles.integrationInfo}>
                      <div className={styles.integrationLogo}>Airbnb</div>
                      <div className={styles.integrationDetails}>
                        <h4>Airbnb</h4>
                        <p>Sync your calendar and bookings with Airbnb</p>
                      </div>
                    </div>
                    <div className={styles.integrationStatus}>
                      <span className={styles.statusBadge}>Connected</span>
                      <button className={styles.secondaryButton}>Configure</button>
                    </div>
                  </div>
                  
                  <div className={styles.integrationItem}>
                    <div className={styles.integrationInfo}>
                      <div className={styles.integrationLogo}>Booking</div>
                      <div className={styles.integrationDetails}>
                        <h4>Booking.com</h4>
                        <p>Sync your calendar and bookings with Booking.com</p>
                      </div>
                    </div>
                    <div className={styles.integrationStatus}>
                      <button className={styles.primaryButton}>Connect</button>
                    </div>
                  </div>
                </div>
                
                <div className={styles.integrationCategory}>
                  <h3>Payment Processors</h3>
                  
                  <div className={styles.integrationItem}>
                    <div className={styles.integrationInfo}>
                      <div className={styles.integrationLogo}>Stripe</div>
                      <div className={styles.integrationDetails}>
                        <h4>Stripe</h4>
                        <p>Accept credit card payments on your booking website</p>
                      </div>
                    </div>
                    <div className={styles.integrationStatus}>
                    <span className={styles.statusBadge}>Connected</span>
                      <button className={styles.secondaryButton}>Configure</button>
                    </div>
                  </div>
                  
                  <div className={styles.integrationItem}>
                    <div className={styles.integrationInfo}>
                      <div className={styles.integrationLogo}>PayPal</div>
                      <div className={styles.integrationDetails}>
                        <h4>PayPal</h4>
                        <p>Accept PayPal payments on your booking website</p>
                      </div>
                    </div>
                    <div className={styles.integrationStatus}>
                      <button className={styles.primaryButton}>Connect</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )*/}
          
          {activeTab === 'documents' && host && host.id && (
            <DocumentsTab 
              hostData={{
                firstName: host.firstname,
                lastName: host.lastname,
                address: host.headoffice || '',
                firebaseUid: host.id, // This is the key mapping!
                businessName: host.businessname,
                businessId: '',
                headOffice: host.headoffice,
                email: host.email,
                country: host.country,
                phoneNumber: host.phone,
                propertiesCount: '0',
                isAgency: host.isAgency,
                kbisOrId: null,
                hasRepresentative: false,
                proxy: null,
                repId: null,
              } as HostData} 
              authToken={authToken}
            />
          )}
          {activeTab === 'documents' && (!host || !host.id) && (
            <div>Loading host data...</div>
          )}
        </div>
      </div>
    </div>
  );
}