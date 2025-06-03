'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import countries from '@/utils/countries';
import validateNationalId from '@/components/addProperty/IdValidate';
import styles from './HostSignupStep1.module.css';
import { handleSubmit } from '../../src/handlers/handleSubmit';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../src/firebaseConfig";
import axios from "axios";

interface FormData {
  firstName: string;
  lastName: string;
  address: string;
  id: string;
  businessName?: string;
  businessId?: string;
  headOffice?: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  phoneNumber: string;
  propertiesCount: string;
  isAgency: boolean;
  kbisOrId: File | null;
  hasRepresentative: boolean;
  proxy: File | null;
  repId: File | null;
  domainName?: string;
}

interface StepProps {
  nextStep: () => void;
  prevStep?: () => void;
  currentStep?: number;
  totalSteps?: number;
}

export default function Step1({ nextStep, prevStep, currentStep, totalSteps }: StepProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    address: '',
    id: '',
    businessName: '',
    businessId: '',
    headOffice: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'FR',
    phoneNumber: '',
    propertiesCount: '',
    isAgency: false,
    kbisOrId: null,
    hasRepresentative: false,
    proxy: null,
    repId: null,
    domainName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phonePrefix, setPhonePrefix] = useState('+33');
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.code === formData.country));
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const selectedCountry = countries.find(c => c.code === formData.country);
    if (selectedCountry) {
      setSelectedCountry(selectedCountry);
      setPhonePrefix(selectedCountry.prefix);
    }
  }, [formData.country]);

  // Fonction de validation pour un champ spécifique
  const validateField = (name: string, value: any, formData: FormData) => {
    let error = '';
    
    // Validation des champs requis
    const requiredFields = formData.isAgency
      ? ['businessName', 'businessId', 'headOffice', 'email', 'password', 'confirmPassword', 'phoneNumber', 'propertiesCount']
      : ['firstName', 'lastName', 'id', 'address', 'email', 'password', 'confirmPassword', 'phoneNumber', 'propertiesCount'];

    if (requiredFields.includes(name) && !value) {
      return 'This field is required';
    }

    // Validations spécifiques
    switch (name) {
      case 'email':
        if (value && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value)) {
          error = 'Please enter a valid Gmail address (example@gmail.com)';
        }
        break;
      case 'password':
        if (value && value.length < 8) {
          error = 'Password must be at least 8 characters long';
        }
        break;
      case 'confirmPassword':
        if (value && formData.password !== value) {
          error = 'Passwords do not match';
        }
        break;
      case 'businessId':
        if (value) {
          const businessIdLength = value.replace(/\s/g, '').length;
          if (businessIdLength < 8 || businessIdLength > 14) {
            error = 'Business ID must be between 8 and 14 digits';
          }
        }
        break;
        case 'domainName':
          if (value) {
            if (!/^[a-zA-Z0-9]+$/.test(value)) {
              error = 'Domain name can only contain letters and numbers';
            } else if (value.length < 3 || value.length > 20) {
              error = 'Domain name must be between 3 and 20 characters';
            }
          }
          break;
      case 'phoneNumber':
        if (!value) {
          error = 'This field is required';
        }
        break;
      case 'id':
        if (selectedCountry && value && !validateNationalId(selectedCountry.code, value)) {
          error = `Invalid ID format for ${selectedCountry.name}`;
        }
        break;
      case 'kbisOrId':
        if (!value) {
          error = 'Please upload your KBIS document or identity document';
        }
        break;
      case 'proxy':
        if (formData.hasRepresentative && !value) {
          error = 'Please upload the proxy document';
        }
        break;
      case 'repId':
        if (formData.hasRepresentative && !value) {
          error = 'Please upload the representative\'s identity document';
        }
        break;
    }

    return error;
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;
  
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      // Valider tous les champs après un changement de checkbox
      const newErrors = { ...errors };
      Object.keys(formData).forEach(key => {
        const fieldError = validateField(key, formData[key as keyof FormData], { ...formData, [name]: checked });
        if (fieldError) newErrors[key] = fieldError;
        else delete newErrors[key];
      });
      setErrors(newErrors);
      return;
    }
  
    if (type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      newValue = files?.[0] || null;
      setFormData(prev => ({ ...prev, [name]: newValue }));
      
      // Validation immédiate pour les fichiers
      const error = validateField(name, newValue, formData);
      setErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
      return;
    }

    // Validation supplémentaire pour domainName (convertir en minuscules)
  if (name === 'domainName') {
    const domainValue = newValue.toLowerCase();
    if (domainValue !== newValue) {
      setFormData(prev => ({ ...prev, [name]: domainValue }));
    }
    const domainError = validateField(name, domainValue, { ...formData, [name]: domainValue });
    setErrors(prev => ({
      ...prev,
      [name]: domainError || ''
    }));
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
  
      newValue = formatted.trim();
    }
  
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Validation en temps réel pour tous les champs modifiés
    const error = validateField(name, newValue, { ...formData, [name]: newValue });
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
  
    // Validation supplémentaire pour confirmPassword quand password change
    if (name === 'password') {
      const confirmError = validateField('confirmPassword', formData.confirmPassword, { 
        ...formData, 
        password: newValue 
      });
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmError || ''
      }));
    }
  }, [errors, formData, phonePrefix]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Valider le champ quand il perd le focus
    const value = formData[name as keyof FormData];
    const error = validateField(name, value, formData);
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));}

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    // Valider tous les champs
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof FormData], formData);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Marquer tous les champs comme touchés avant la validation
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);

    const isFormValid = validateForm();
    
    if (!isFormValid) {
      console.error('Le formulaire est invalide');
      return;
    }

    try {
      await handleSubmit(formData, nextStep);
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
    }
  };

  return (
    <form onSubmit={onSubmit} method="POST">
        <h2 className={styles.title}>Create Your Host Account</h2>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Personal Information</h3>
            <div className={styles.formToggle}>
              <label className={styles.toggleLabel}>
                <input 
                  type="checkbox" 
                  name="isAgency" 
                  checked={formData.isAgency}
                  onChange={handleChange} 
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSwitch}></span>
                <span>I am a real estate agency</span>
              </label>
            </div>        
            {formData.isAgency ? (
                <>
                <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Business Name <span className={styles.required}>*</span>
                </label>
                <input 
                  type="text" 
                  name="businessName" 
                  value={formData.businessName}
                  placeholder="Your Business Name" 
                  className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
                  onChange={handleChange}
                  onBlur={handleBlur} 
                />
                {errors.businessName && <span className={styles.errorMessage}>{errors.businessName}</span>}
              </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Business ID <span className={styles.required}>*</span>
                  <span className={styles.helperText}>(8 to 14 digits)</span>
                </label>
                <input 
                  type="text" 
                  name="businessId" 
                  value={formData.businessId}
                  placeholder="123 456 789 12345" 
                  className={`${styles.input} ${errors.businessId ? styles.inputError : ''}`}
                  onChange={handleChange} 
                  onBlur={handleBlur}
                />
                {errors.businessId && <span className={styles.errorMessage}>{errors.businessId}</span>}
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
                    value={formData.firstName}
                    placeholder="Your First Name" 
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    onChange={handleChange} 
                    onBlur={handleBlur}
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
                    value={formData.lastName}
                    placeholder="Your Last Name" 
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    onChange={handleChange}
                    onBlur={handleBlur} 
                  />
                  {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
                </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                   National ID Number <span className={styles.required}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="id" 
                    value={formData.id}
                    placeholder={selectedCountry ? `Enter your ${selectedCountry.name} ID` : "Enter your ID"}
                    className={`${styles.input} ${errors.id ? styles.inputError : ''}`}
                    onChange={handleChange} 
                    onBlur={handleBlur}
                  />
                  {errors.id && <span className={styles.errorMessage}>{errors.id}</span>}
                </div>  
                    </>
                )}
              </div>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Contact Information</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email <span className={styles.required}>*</span>
              </label>
              <input 
                type="email" 
                name="email" 
                value={formData.email}
                placeholder="your.email@example.com" 
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                onChange={handleChange} 
                onBlur={handleBlur}
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
                  value={formData.country}
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
                    value={formData.phoneNumber}
                    placeholder="Phone Number" 
                    className={`${styles.input} ${styles.phoneNumber} ${errors.phoneNumber ? styles.inputError : ''}`}
                    onChange={handleChange} 
                    onBlur={handleBlur}
                  />
                </div>
                {errors.phoneNumber && <span className={styles.errorMessage}>{errors.phoneNumber}</span>}
              </div>
            </div>
            {formData.isAgency ? (
                <div className={styles.formGroup}>
                <label className={styles.label}>
                    Head Office <span className={styles.required}>*</span>
                </label>
                <input 
                    type="text" 
                    name="headOffice" 
                    value={formData.headOffice}
                    placeholder="Enter Head Office Address" 
                    className={`${styles.input} ${errors.headOffice ? styles.inputError : ''}`}
                    onChange={handleChange} 
                    onBlur={handleBlur}
                />
                {errors.headOffice && <span className={styles.errorMessage}>{errors.headOffice}</span>}
                </div>):(
                    <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Address <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        placeholder="Your Home Address"
                        className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                    {errors.address && <span className={styles.errorMessage}>{errors.address}</span>}
                    </div>
                )}
          </div>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Account Security</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Password <span className={styles.required}>*</span>
              </label>
              <input 
                type="password" 
                name="password" 
                value={formData.password}
                placeholder="At least 8 characters" 
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                onChange={handleChange} 
                onBlur={handleBlur}
              />
              {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Confirm Password <span className={styles.required}>*</span>
              </label>
              <input 
                type="password" 
                name="confirmPassword" 
                value={formData.confirmPassword}
                placeholder="Confirm your password" 
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                onChange={handleChange} 
                onBlur={handleBlur}
              />
              {errors.confirmPassword && <span className={styles.errorMessage}>{errors.confirmPassword}</span>}
            </div>
          </div>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Property Information</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Number of Properties for Rent <span className={styles.required}>*</span>
              </label>
              <input 
                type="number" 
                name="propertiesCount" 
                value={formData.propertiesCount}
                placeholder="How many properties do you have?" 
                min="1"
                className={`${styles.input} ${errors.propertiesCount ? styles.inputError : ''}`}
                onChange={handleChange} 
                onBlur={handleBlur}
              />
              {errors.propertiesCount && <span className={styles.errorMessage}>{errors.propertiesCount}</span>}
            </div>
          </div>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Website Information</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Domain Name <span className={styles.required}>*</span>
              </label>
              <input 
                type="text" 
                name="domainName" 
                value={formData.domainName}
                placeholder="What would you like your website name to be?" 
                className={`${styles.input} ${errors.domainName ? styles.inputError : ''}`}
                onChange={handleChange} 
                onBlur={handleBlur}
              />
              {errors.domainName && <span className={styles.errorMessage}>{errors.domainName}</span>}
            </div>
          </div>
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Verification Documents</h3>
            <div className={styles.formGroup}>
              <label className={styles.fileUploadLabel}>
                <span className={styles.label}>
                  Business Registration Document or ID Document <span className={styles.required}>*</span>
                  <span className={styles.helperText}>Only .pdf, .docx, .jpg, .jpeg, and .png files are accepted</span>
                </span>
                <div className={`${styles.fileUpload} ${errors.kbisOrId ? styles.fileError : ''}`}>
                  <input 
                    type="file" 
                    name="kbisOrId" 
                    onChange={handleChange} 
                    className={styles.fileInput} 
                    accept=".pdf,.jpg,.jpeg,.png, .docx"
                  />
                  <div className={styles.fileInfo}>
                    {formData.kbisOrId ? (
                      <span className={styles.fileName}>{formData.kbisOrId.name}</span>
                    ) : (
                      <>
                        <span className={styles.fileIcon}>📄</span>
                        <span className={styles.fileText}>Upload file</span>
                      </>
                    )}
                  </div>
                </div>
                {errors.kbisOrId && <span className={styles.errorMessage}>{errors.kbisOrId}</span>}
              </label>
            </div>
            <div className={styles.formToggle}>
              <label className={styles.toggleLabel}>
                <input 
                  type="checkbox" 
                  name="hasRepresentative" 
                  checked={formData.hasRepresentative}
                  onChange={handleChange} 
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSwitch}></span>
                <span>The real owner is not the representative</span>
              </label>
            </div>
            {formData.hasRepresentative && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.fileUploadLabel}>
                    <span className={styles.label}>
                      Proxy Document <span className={styles.required}>*</span>
                      <span className={styles.helperText}>Only .pdf, .docx, .jpg, .jpeg, and .png files are accepted</span>
                    </span>
                    <div className={`${styles.fileUpload} ${errors.proxy ? styles.fileError : ''}`}>
                      <input 
                        type="file" 
                        name="proxy" 
                        onChange={handleChange} 
                        className={styles.fileInput} 
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                      />
                      <div className={styles.fileInfo}>
                        {formData.proxy ? (
                          <span className={styles.fileName}>{formData.proxy.name}</span>
                        ) : (
                          <>
                            <span className={styles.fileIcon}>📄</span>
                            <span className={styles.fileText}>Upload file</span>
                          </>
                        )}
                      </div>
                    </div>
                    {errors.proxy && <span className={styles.errorMessage}>{errors.proxy}</span>}
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fileUploadLabel}>
                    <span className={styles.label}>
                      Representative ID <span className={styles.required}>*</span>
                      <span className={styles.helperText}>Only .pdf, .docx, .jpg, .jpeg, and .png files are accepted</span>
                    </span>
                    <div className={`${styles.fileUpload} ${errors.repId ? styles.fileError : ''}`}>
                      <input 
                        type="file" 
                        name="repId" 
                        onChange={handleChange} 
                        className={styles.fileInput} 
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                      />
                      <div className={styles.fileInfo}>
                        {formData.repId ? (
                          <span className={styles.fileName}>{formData.repId.name}</span>
                        ) : (
                          <>
                            <span className={styles.fileIcon}>📄</span>
                            <span className={styles.fileText}>Upload file</span>
                          </>
                        )}
                      </div>
                    </div>
                    {errors.repId && <span className={styles.errorMessage}>{errors.repId}</span>}
                  </label>
                </div>
              </>
            )}
          </div>
          
        
          <div className="flex justify-between mt-4">
          {prevStep && currentStep && currentStep > 1 && (
            <button 
              type="button" 
              onClick={prevStep} 
              className={styles.button}
            >
              Step 1: Create Your Account
            </button>
          )}
          <button 
            type="submit" 
            className={styles.button}
          >
            {currentStep && currentStep < (totalSteps || 4) ? "Step 2: Verify your Mail" : "Step 2: Verify your Mail"}
          </button>
        </div>
        </form>
   
  );
}