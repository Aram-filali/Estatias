"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./editProfile.module.css";
import axios from "axios";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
} from "firebase/auth";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

const getUserProfile = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error parsing user profile:", error);
    return null;
  }
};

const setUserProfile = (userData) => {
  try {
    localStorage.setItem("user", JSON.stringify(userData));
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
};

export default function EditProfile() {
  const [profileData, setProfileData] = useState({
    firebaseUid: "",
    fullname: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    delete: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const router = useRouter();

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setError("You must be logged in to view this page.");
        router.push("/Login");
        return;
      }

      try {
        await firebaseUser.reload();
        setUser(firebaseUser);

        const providersData = firebaseUser.providerData || [];
        const isGoogle = providersData.some(
          (provider) => provider.providerId === "google.com"
        );
        setIsGoogleUser(isGoogle);

        const token = await firebaseUser.getIdToken(true);
        localStorage.setItem("token", token);

        setProfileData({
          firebaseUid: firebaseUser.uid,
          fullname: firebaseUser.displayName || "",
        });

        const response = await apiClient.post(
          "/users/login",
          {
            idToken: token,
            firebaseUid: firebaseUser.uid,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.user) {
          const userData = response.data.user;
          setProfileData({
            firebaseUid: userData.firebaseUid || firebaseUser.uid,
            fullname: userData.fullname || firebaseUser.displayName || "",
          });
          setUserProfile(userData);
        }
      } catch (fetchErr) {
        if (fetchErr.response?.status === 404) {
          try {
            const token = await firebaseUser.getIdToken(true);
            const createResponse = await apiClient.post(
              "users/signup", 
              {
                fullname: firebaseUser.displayName || "",
                email: firebaseUser.email,
                role: "user",
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (createResponse.data?.user) {
              const newUserData = createResponse.data.user;
              setProfileData({
                firebaseUid: newUserData.firebaseUid,
                fullname: newUserData.fullname || "",
              });
              setUserProfile(newUserData);
              setSuccess("Profile created successfully!");
            }
          } catch (createErr) {
            setError("Failed to create user profile. Please try again.");
          }
        } else {
          setError("Failed to fetch user profile. Please try again.");
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading({ profile: true, password: !!passwordData.newPassword, delete: false });
    setError("");
    setSuccess("");

    if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError("New passwords do not match");
            setLoading({ profile: false, password: false, delete: false });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            setLoading({ profile: false, password: false, delete: false });
            return;
        }

        if (!isGoogleUser && !passwordData.currentPassword) {
            setError("Current password is required to set a new password");
            setLoading({ profile: false, password: false, delete: false });
            return;
        }
    }

    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Please sign in to update your profile");

        const token = await currentUser.getIdToken(true);

        const updateUserDto = {
            firebaseUid: currentUser.uid,
            fullname: profileData.fullname,
        };

        if (passwordData.newPassword) {
            updateUserDto.newPassword = passwordData.newPassword;
            if (!isGoogleUser) {
                updateUserDto.currentPassword = passwordData.currentPassword;
            }
        }

        const response = await apiClient.patch(
            "/users/update-user",
            { idToken: token, updateUserDto },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.user) {
            setSuccess("Profile updated successfully!");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            
            const updatedUser = {
                ...JSON.parse(localStorage.getItem("user") || "{}"),
                ...response.data.user
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            
            setTimeout(() => setSuccess(""), 3000);
        } else {
            throw new Error(response.data?.error || "Unexpected response format");
        }
    } catch (err) {
        console.error("Update error:", err);
        
        let errorMessage = "An error occurred updating your profile";
        
        if (err.response?.data?.message) {
            const message = err.response.data.message;
            
            if (message.includes('Current password is incorrect')) {
                errorMessage = "The current password you entered is incorrect";
            } else if (message.includes('Password must be at least 6 characters')) {
                errorMessage = "Password must be at least 6 characters long";
            } else if (message.includes('EMAIL_REQUIRED')) {
                errorMessage = "Email is required for password verification";
            } else if (message.includes('INVALID_LOGIN_CREDENTIALS')) {
                errorMessage = "Invalid email or password";
            } else if (message.includes('auth/requires-recent-login')) {
                errorMessage = "Please sign in again before changing your password";
            } else {
                errorMessage = message;
            }
        } else if (err.message) {
            errorMessage = err.message;
        }
        
        setError(errorMessage);
    } finally {
        setLoading({ profile: false, password: false, delete: false });
    }
  };

  const handleDeleteInputChange = (e) => {
    setDeleteConfirm(e.target.value);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    if (deleteConfirm !== "DELETE") {
        setError("Please type DELETE to confirm account deletion");
        return;
    }

    setShowFinalConfirm(true);
  };

  const confirmFinalDelete = async () => {
    setLoading({ ...loading, delete: true });
    setError("");
    setSuccess("");
    setShowFinalConfirm(false);

    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Please log in again");

        const token = await currentUser.getIdToken(true);

        const response = await apiClient.post(
            "/users/delete-user",
            {
                idToken: token,
                firebaseUid: currentUser.uid,
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (response.data?.message === 'Account deleted successfully') {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setSuccess("Account deleted successfully! Redirecting...");
            setTimeout(() => router.push("/"), 2000);
        } else {
            throw new Error(response.data?.error || "Failed to delete account");
        }
    } catch (err) {
        if (err.code === "auth/requires-recent-login") {
            setError("Please log out and log back in before deleting your account.");
        } else {
            setError(err.response?.data?.message || err.message || "An error occurred");
        }
    } finally {
        setLoading({ ...loading, delete: false });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.mainTitle}>Manage Your Account</h1>
  
        {/* Profile update form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile Information</h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="fullname" className={styles.label}>
                Full Name
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={profileData.fullname}
                onChange={handleProfileChange}
                className={styles.input}
                placeholder="Enter your full name"
                required
              />
            </div>
  
            {/* Password change fields */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Change Password</h2>
              {isGoogleUser ? (
                <div className={styles.infoMessage}>
                 You can set a password for direct login or continue using Google authentication.
                </div>
              ) : (
                <div className={styles.infoMessage}></div>
              )}
              
              {!isGoogleUser && (
                <div className={styles.formGroup}>
                  <label htmlFor="currentPassword" className={styles.label}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Enter your current password"
                  />
                </div>
              )}
  
              <div className={styles.passwordFields}>
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword" className={styles.label}>
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Enter your new password"
                  />
                </div>
  
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Confirm your new password"
                  />
                </div>
              </div>
            </div>
  
            <div className={styles.actions}>
              <button
                type="submit"
                className={`${styles.button} ${styles.submitButton}`}
                disabled={loading.profile || loading.password}
              >
                {loading.profile || loading.password ? "Updating Profile..." : "Update Profile"}
              </button>
            </div>
          </form>
        </div>
  
        <div className={styles.divider}></div>

        {/* Delete Account Section */}
        <div className={styles.section}>
          <h2 className={styles.dangerTitle}>Delete Account</h2>
          <div className={styles.dangerZone}>
            
            <form onSubmit={handleDeleteAccount} className={styles.form}>
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
              
              <button
                type="submit"
                className={`${styles.button} ${styles.deleteButton}`}
                disabled={loading.delete || deleteConfirm !== "DELETE"}
              >
                {loading.delete ? "Processing..." : "Delete My Account"}
              </button>
            </form>
          </div>
        </div>

        {showFinalConfirm && (
  <div className={styles.modalOverlay}>
    <div className={styles.confirmationModal}>
      <h3>Delete your account</h3>
      <p>Are you absolutely sure you want to delete your account?</p>
      <p>This action is <strong>irreversible</strong> and will result in the permanent loss of all your personal data.</p>
      
      <div className={styles.modalButtons}>
        <button
          onClick={() => setShowFinalConfirm(false)}
          className={`${styles.button} ${styles.cancelButton}`}
        >
          Cancel
        </button>
        <button
          onClick={confirmFinalDelete}
          className={`${styles.button} ${styles.deleteButton}`}
          disabled={loading.delete}
        >
          {loading.delete ? "Deleting..." : "Yes, permanently delete"}
        </button>
      </div>
    </div>
  </div>
)}

  
        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className={`${styles.button} ${styles.cancelButton}`}
          >
            Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
}