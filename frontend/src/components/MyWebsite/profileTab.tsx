import React, { useState, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSave, faTimes, faUserCircle, faEnvelope, faHome } from '@fortawesome/free-solid-svg-icons';
import styles from './MyWebsite.module.css';
import countries from '@/utils/countries';
import validateNationalId from './IdValidate';
import { HostData } from '@/types/hostTypes';
import { profileApi } from './profileApi';
import { toast } from 'react-toastify'; 

// Ajout de l'interface pour les props du composant
interface ProfileTabProps {
  hostData?: HostData;
  onSave?: (data: Partial<HostData>) => Promise<boolean>;
  onDeleteAccount?: () => Promise<boolean>;
}

export default function ProfileTab({ hostData: externalHostData, onSave: externalOnSave, onDeleteAccount: externalOnDeleteAccount }: ProfileTabProps = {}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<HostData>>({});
  const [hostData, setHostData] = useState<HostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phonePrefix, setPhonePrefix] = useState('+33');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  useEffect(() => {
    // Si des données externes sont fournies, les utiliser
    if (externalHostData) {
      setHostData(externalHostData);
      setFormData(externalHostData);
      
      const country = countries.find(c => c.code === externalHostData.country);
      if (country) {
        setSelectedCountry(country);
        setPhonePrefix(country.prefix);
      }
      setLoading(false);
    } else {
      
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const data = await profileApi.getProfile();
          setHostData(data);
          setFormData(data);
          
          const country = countries.find(c => c.code === data.country);
          if (country) {
            setSelectedCountry(country);
            setPhonePrefix(country.prefix);
          }
        } catch (error) {
          toast.error('Failed to load profile data');
          console.error('Error loading profile:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [externalHostData]);

  React.useEffect(() => {
    const country = countries.find(c => c.code === formData.country);
    if (country) {
      setSelectedCountry(country);
      setPhonePrefix(country.prefix);
    }
  }, [formData.country]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newErrors = { ...errors };

    if (type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      setFormData(prev => ({ ...prev, [name]: files?.[0] || null }));
      return;
    }

    if (name === 'phoneNumber') {
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

      setFormData(prev => ({ ...prev, [name]: formatted.trim() }));
      return;
    }

    if (name === 'id' && selectedCountry) {
      try {
        if (value && !validateNationalId(selectedCountry.code, value)) {
          newErrors.id = "Invalid ID format for selected country.";
        } else {
          delete newErrors.id;
        }
      } catch (error) {
        newErrors.id = "Invalid country code.";
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors, selectedCountry, phonePrefix]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const requiredFields = formData.isAgency
      ? ['businessName', 'businessId', 'headOffice', 'email', 'phoneNumber']
      : ['firstName', 'lastName', 'id', 'address', 'email', 'phoneNumber'];

    requiredFields.forEach(field => {
      if (!formData[field as keyof HostData]) {
        newErrors[field] = 'This field is required';
      }
    });

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email as string)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.businessId) {
      const businessIdLength = formData.businessId.toString().replace(/\s/g, '').length;
      if (businessIdLength < 8 || businessIdLength > 14) {
        newErrors.businessId = 'Business ID must contain between 8 and 14 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Utiliser la fonction de sauvegarde externe si fournie, sinon utiliser l'API directement
      if (externalOnSave) {
        const success = await externalOnSave(formData);
        if (success) {
          setIsEditing(false);
          toast.success('Profile updated successfully');
        } else {
          toast.error('Failed to update profile');
        }
      } else {
        const updatedData = await profileApi.updateProfile(formData);
        setHostData(updatedData);
        setFormData(updatedData);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setLoading(true);
      
      // Utiliser la fonction de suppression externe si fournie, sinon utiliser l'API directement
      if (externalOnDeleteAccount) {
        const success = await externalOnDeleteAccount();
        if (success) {
          toast.success('Account deleted successfully');
          window.location.href = '/login';
        } else {
          toast.error('Failed to delete account');
        }
      } else {
        await profileApi.deleteAccount();
        toast.success('Account deleted successfully');
        window.location.href = '/login';
      }
    } catch (error) {
      toast.error('Failed to delete account');
      console.error('Error deleting account:', error);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  if (loading && !hostData) {
    return <div className={styles.loading}>Loading profile information...</div>;
  }

  if (!hostData) {
    return <div className={styles.error}>Failed to load profile data. Please try again later.</div>;
  }

  return (
    <div className={styles.profileSection}>
      <div className={styles.sectionHeader}>
        <h2>Profile Information</h2>
        {!isEditing ? (
          <button 
            className={styles.editButton} 
            onClick={() => setIsEditing(true)}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faEdit} /> Edit Profile
          </button>
        ) : (
          <div className={styles.actionButtons}>
            <button 
              className={styles.saveButton} 
              onClick={handleSave}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faSave} /> Save
            </button>
            <button 
              className={styles.cancelButton} 
              onClick={() => {
                setIsEditing(false);
                setFormData({...hostData});
                setErrors({});
              }}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
          </div>
        )}
      </div>
      
      {/* Rest of your component remains the same */}
      {isEditing ? (
        <div className={styles.editForm}>
          {formData.isAgency ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Business Name <span className={styles.required}>*</span>
                </label>
                <input 
                  type="text" 
                  name="businessName" 
                  value={formData.businessName || ''}
                  placeholder="Your Business Name" 
                  className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
                {errors.businessName && <span className={styles.errorMessage}>{errors.businessName}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Business ID <span className={styles.required}>*</span>
                  <span className={styles.helperText}>(8 to 14 digits)</span>
                </label>
                <input 
                  type="text" 
                  name="businessId" 
                  value={formData.businessId || ''}
                  placeholder="123 456 789 12345" 
                  className={`${styles.input} ${errors.businessId ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
                {errors.businessId && <span className={styles.errorMessage}>{errors.businessId}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Head Office <span className={styles.required}>*</span>
                </label>
                <input 
                  type="text" 
                  name="headOffice" 
                  value={formData.headOffice || ''}
                  placeholder="Enter Head Office Address" 
                  className={`${styles.input} ${errors.headOffice ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
                {errors.headOffice && <span className={styles.errorMessage}>{errors.headOffice}</span>}
              </div>
            </>
          ) : (
            <>
              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    First Name <span className={styles.required}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="firstName" 
                    value={formData.firstName || ''}
                    placeholder="Your First Name" 
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    onChange={handleChange} 
                  />
                  {errors.firstName && <span className={styles.errorMessage}>{errors.firstName}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Last Name <span className={styles.required}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="lastName" 
                    value={formData.lastName || ''}
                    placeholder="Your Last Name" 
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    onChange={handleChange} 
                  />
                  {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  ID <span className={styles.required}>*</span>
                </label>
                <input 
                  type="text" 
                  name="id" 
                  value={formData.id || ''}
                  placeholder="Enter your ID" 
                  className={`${styles.input} ${errors.id ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
                {errors.id && <span className={styles.errorMessage}>{errors.id}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Address <span className={styles.required}>*</span>
                </label>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address || ''}
                  placeholder="Your Home Address" 
                  className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
                {errors.address && <span className={styles.errorMessage}>{errors.address}</span>}
              </div>
            </>
          )}
          
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Email <span className={styles.required}>*</span>
            </label>
            <input 
              type="email" 
              name="email" 
              value={formData.email || ''}
              placeholder="your.email@example.com" 
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              onChange={handleChange} 
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>
          
          <div className={styles.inputRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Country <span className={styles.required}>*</span>
              </label>
              <select 
                name="country" 
                value={formData.country || ''}
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
              <label className={styles.label}>
                Phone Number <span className={styles.required}>*</span>
              </label>
              <div className={styles.phoneInput}>
                <span className={styles.phonePrefix}>{phonePrefix}</span>
                <input 
                  type="tel" 
                  name="phoneNumber" 
                  value={formData.phoneNumber || ''}
                  placeholder="Phone Number" 
                  className={`${styles.input} ${styles.phoneNumber} ${errors.phoneNumber ? styles.inputError : ''}`}
                  onChange={handleChange} 
                />
              </div>
              {errors.phoneNumber && <span className={styles.errorMessage}>{errors.phoneNumber}</span>}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Number of Properties for Rent <span className={styles.required}>*</span>
            </label>
            <input 
              type="number" 
              name="propertiesCount" 
              value={formData.propertiesCount || ''}
              placeholder="How many properties do you have?" 
              min="1"
              className={`${styles.input} ${errors.propertiesCount ? styles.inputError : ''}`}
              onChange={handleChange} 
            />
            {errors.propertiesCount && <span className={styles.errorMessage}>{errors.propertiesCount}</span>}
          </div>
          
          <div className={styles.deleteAccountSection}>
            <h3>Danger Zone</h3>
            {!confirmDelete ? (
              <button 
                className={styles.deleteButton} 
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faTrash} /> Delete Account
              </button>
            ) : (
              <div className={styles.confirmDelete}>
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <div className={styles.confirmButtons}>
                  <button 
                    className={styles.confirmButton} 
                    onClick={handleDeleteAccount}
                    disabled={loading}
                  >
                    Yes, Delete
                  </button>
                  <button 
                    className={styles.cancelButton} 
                    onClick={() => setConfirmDelete(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.profileInfo}>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <FontAwesomeIcon icon={faUserCircle} />
            </div>
            <div className={styles.infoContent}>
              <h3>Personal Details</h3>
              {hostData.isAgency ? (
                <>
                  <p><strong>Business Name:</strong> {hostData.businessName}</p>
                  <p><strong>Business ID:</strong> {hostData.businessId}</p>
                  <p><strong>Head Office:</strong> {hostData.headOffice}</p>
                </>
              ) : (
                <>
                  <p><strong>Name:</strong> {hostData.firstName} {hostData.lastName}</p>
                  <p><strong>ID:</strong> {hostData.id}</p>
                  <p><strong>Address:</strong> {hostData.address}</p>
                </>
              )}
            </div>
          </div>
          
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <FontAwesomeIcon icon={faEnvelope} />
            </div>
            <div className={styles.infoContent}>
              <h3>Contact Information</h3>
              <p><strong>Email:</strong> {hostData.email}</p>
              <p><strong>Phone:</strong> {phonePrefix} {hostData.phoneNumber}</p>
              <p><strong>Country:</strong> {selectedCountry?.name}</p>
            </div>
          </div>
          
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <FontAwesomeIcon icon={faHome} />
            </div>
            <div className={styles.infoContent}>
              <h3>Property Information</h3>
              <p><strong>Properties Listed:</strong> {hostData.properties?.length || 0}</p>
              <p><strong>Properties Capacity:</strong> {hostData.propertiesCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}