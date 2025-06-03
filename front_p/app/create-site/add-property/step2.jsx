"use client";
import "styles/form.css";
import "./mainphoto.css";
import { FaCreditCard, FaPaypal, FaMoneyBillAlt, FaUniversity, FaMapMarkerAlt } from 'react-icons/fa';
import { CiMoneyCheck1 } from "react-icons/ci";
import { MdOutlineSmokingRooms, MdOutlinePets, MdMyLocation } from "react-icons/md";
import { GiPartyPopper } from "react-icons/gi";
import { IoCalendarOutline } from "react-icons/io5";
import { BsPersonRaisedHand } from "react-icons/bs";
import { useRouter } from "next/navigation";
import axios from 'axios';
//import { useHost } from "./HostProvider";
import { FaStar } from 'react-icons/fa';
import { useFirebaseAuth } from './useFirebaseAuth';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import React, { useCallback, useState, useEffect } from 'react';
import AvailabilityManager from './AvailabilityManager';
import { IoArrowBack, IoArrowForward } from 'react-icons/io5';
import styles from './label.module.css';
import SEOContentGenerator from '../../../components/AI/aicomponent';

// Fix the interface to make nextStep required


// Définir les props par défaut
SearchPage2.defaultProps = {
    prevStep: undefined,
    currentStep: 1,
    totalSteps: 3,
    saveUserData: undefined,
    userData: undefined
  };


  const handleTitleGenerated = (newTitle) => {
  setFormData(prev => ({ ...prev, title: newTitle }));
};

const handleDescriptionGenerated = (newDescription) => {
  setFormData(prev => ({ ...prev, description: newDescription }));
};
  
  export default function SearchPage2({ 
    nextStep, 
    prevStep, 
    currentStep, 
    totalSteps, 
  }) {
    const { user, loading } = useFirebaseAuth();
    const [firebaseUserId, setFirebaseUserId] = useState("");
    const router = useRouter();

      const [userData, setUserData] = useState(() => {
        if (typeof window !== 'undefined') {
          const savedData = localStorage.getItem('propertyData');
          return savedData ? JSON.parse(savedData) : {};
        }
        return {};
      });
    
      const saveUserData = (data) => {
        const updatedData = { ...userData, ...data };
        setUserData(updatedData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('propertyData', JSON.stringify(updatedData));
        }
      };
      
  
    useEffect(() => {
      // Check if user is verified before allowing access to this page
      if (typeof window !== 'undefined') {
        const progress = localStorage.getItem('propertyProgress');
        if (progress) {
          const parsedProgress = JSON.parse(progress);
          /*if (!parsedProgress.emailVerified) {
            router.push('/create-site/verify-email');
            return;
          }*/
        }
        
        // Load user data from props instead of local state
        const savedData = localStorage.getItem('propertyData');
        if (savedData && saveUserData) {
          saveUserData(JSON.parse(savedData));
        }
      }
    }, [router, saveUserData]);


  // Récupérer l'ID Firebase au chargement
  useEffect(() => {
    // Si l'utilisateur est chargé depuis Firebase Auth
    if (user && user.uid) {
      setFirebaseUserId(user.uid);
      console.log("Firebase UID récupéré:", user.uid);
    } 
    // Sinon, essayer de récupérer depuis localStorage
    else {
      const savedId = localStorage.getItem('firebaseUserId');
      if (savedId) {
        setFirebaseUserId(savedId);
        console.log("Firebase UID récupéré du localStorage:", savedId);
      }
    }
  }, [user, loading]);

  // États pour la gestion de la carte
  const [mapUrl, setMapUrl] = useState("https://maps.google.com/maps?q=0,0&z=15&output=embed");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    type: "",
    address: "",
    country: "",
    city: "",
    size: "",
    lotSize: "",
    floorNumber: "",
    numberOfBalconies: "",
    rooms: "",
    bedrooms: "",
    bathrooms: "",
    maxGuest: "",
    minNight: "",
    maxNight: "",
    beds_Number: "",
    amenities: {
      WiFi: false,
      Kitchen: false,
      Washer: false,
      Dryer: false,
      Free_parking: false,
      Air_conditioning: false,
      Heating: false,
      TV: false,
      Breakfast: false,
      Laptop_friendly_workspace: false,
      Crib: false,
      Hair_dryer: false,
      Iron: false,
      Essentials: false,
      Smoke_alarm: false,
      Carbon_monoxide_alarm: false,
      Fire_extinguisher: false,
      First_aid_kit: false,
      Lock_on_bedroom_door: false,
      Hangers: false,
      Shampoo: false,
      Garden_or_backyard: false,
      Patio_or_balcony: false,
      BBQ_grill: false,
    },
    policies: {
      smoking: false,
      pets: false,
      parties_or_events: false,
      check_in_start: "",
      check_in_end: "",
      check_out_start: "",
      check_out_end: "",
      quiet_hours_start: "",
      quiet_hours_end: "",
      cleaning_maintenance: "",
      cancellation_policy: "",
      guests_allowed: false,
    },
    means_of_payment: [],
    paymentMethods: {
      "credit card": false,
      "debit card": false,
      "cash": false,
      "check": false,
    },
  });


// Fix 1: Correction de handleInputChange pour éliminer la validation en temps réel des méthodes de paiement 
const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  
  // Ignorer la validation en temps réel pour les photos et méthodes de paiement
  if (name.startsWith('photos_') || name === 'paymentMethods') {
    return;
  }

  const fieldValue = type === "checkbox" ? checked : value;
  
  setFormData(prev => {
    const newFormData = name.includes('.')
      ? (() => {
          const [parent, child] = name.split('.');
          const parentObj = prev[parent] || {};
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: fieldValue,
            },
          };
        })()
      : {
          ...prev,
          [name]: fieldValue
        };
    
    return newFormData;
  });

  // Validation standard pour les autres champs
  const errorMessage = validateField(name, fieldValue);
  
  // Validation spéciale pour minNight/maxNight
  if (name === 'minNight' || name === 'maxNight') {
    const minNights = name === 'minNight' ? parseInt(value) || 0 : parseInt(formData.minNight) || 0;
    const maxNights = name === 'maxNight' ? parseInt(value) || 0 : parseInt(formData.maxNight) || 0;
    
    if (minNights > 0 && maxNights > 0 && minNights > maxNights) {
      setErrors(prevErrors => ({
        ...prevErrors,
        minNight: "Minimum nights cannot exceed maximum nights",
        maxNight: "Maximum nights must be greater than minimum nights"
      }));
    } else {
      setErrors(prevErrors => ({
        ...prevErrors,
        minNight: name === 'minNight' ? errorMessage : prevErrors.minNight,
        maxNight: name === 'maxNight' ? errorMessage : prevErrors.maxNight
      }));
    }
  } else {
    setErrors(prev => ({
      ...prev,
      [name]: errorMessage
    }));
  }
};

const validateTimeRange = (startField, endField, startValue, endValue) => {
  if (!startValue || !endValue) return;

  const startTime = new Date(`1970-01-01T${startValue}`);
  const endTime = new Date(`1970-01-01T${endValue}`);

  if (startTime >= endTime) {
    setErrors(prev => ({
      ...prev,
      [`policies.${startField}`]: "Start time must be earlier than end time",
      [`policies.${endField}`]: "End time must be later than start time"
    }));
  } else {
    // Clear errors if valid
    setErrors(prev => ({
      ...prev,
      [`policies.${startField}`]: prev[`policies.${startField}`]?.includes("Start time") ? "" : prev[`policies.${startField}`],
      [`policies.${endField}`]: prev[`policies.${endField}`]?.includes("End time") ? "" : prev[`policies.${endField}`]
    }));
  }
};
const handlePoliciesChange = (e) => {
  const { name, value, type, checked } = e.target;
  const policyName = name.includes('.') ? name.split('.')[1] : name;
  
  // Update form data
  setFormData(prev => ({
    ...prev,
    policies: {
      ...prev.policies,
      [policyName]: type === "checkbox" ? checked : value,
    },
  }));
  
  // Validate field
  const fullFieldName = `policies.${policyName}`;
  const fieldValue = type === "checkbox" ? checked : value;
  const errorMessage = validateField(fullFieldName, fieldValue);
  
  setErrors(prev => ({
    ...prev,
    [fullFieldName]: errorMessage
  }));
  
  // Handle time validations
  if (policyName === 'check_in_start' || policyName === 'check_in_end') {
    validateTimeRange(
      'check_in_start', 
      'check_in_end',
      policyName === 'check_in_start' ? value : formData.policies.check_in_start,
      policyName === 'check_in_end' ? value : formData.policies.check_in_end
    );
  }
  
  if (policyName === 'check_out_start' || policyName === 'check_out_end') {
    validateTimeRange(
      'check_out_start', 
      'check_out_end',
      policyName === 'check_out_start' ? value : formData.policies.check_out_start,
      policyName === 'check_out_end' ? value : formData.policies.check_out_end
    );
  }
  
  if (policyName === 'quiet_hours_start' || policyName === 'quiet_hours_end') {
    validateTimeRange(
      'quiet_hours_start', 
      'quiet_hours_end',
      policyName === 'quiet_hours_start' ? value : formData.policies.quiet_hours_start,
      policyName === 'quiet_hours_end' ? value : formData.policies.quiet_hours_end
    );
  }
};

// Fix 2: Amélioration de validateFormBeforeSubmit pour inclure la validation des méthodes de paiement lors de la soumission
// Fix: Modify validateFormBeforeSubmit to prevent notifications during calendar navigation
const validateFormBeforeSubmit = (triggerNotification = true) => {
  const newErrors = {};
  let isValid = true;

  // Validate all fields except photos and payment methods
  Object.keys(validationRules).forEach(fieldName => {
    if (fieldName.startsWith('photos_') || fieldName === 'paymentMethods') return;
    
    let value;
    if (fieldName.includes('.')) {
      const [parent, child] = fieldName.split('.');
      value = formData[parent]?.[child];
    } else {
      value = formData[fieldName];
    }
    
    const error = validateField(fieldName, value);
    if (error) {
      newErrors[fieldName] = error;
      isValid = false;
    }
  });

  // Validate min/max night
  const minNight = parseInt(formData.minNight || '0');
  const maxNight = parseInt(formData.maxNight || '0');
  if (minNight > maxNight) {
    newErrors.minNight = "Minimum nights cannot exceed maximum nights";
    newErrors.maxNight = "Maximum nights must be greater than minimum nights";
    isValid = false;
  }

  // Validate payment methods only on submit
  const hasPaymentMethod = Object.values(formData.paymentMethods || {}).some(method => method);
  if (!hasPaymentMethod) {
    newErrors.paymentMethods = "At least one payment method must be selected";
    isValid = false;
  }

  // Validate photos only on submit
  if (!mainPhotos || mainPhotos.length < 2) {
    newErrors.mainPhotos = "At least two main photos are required";
    isValid = false;
  }

  apartmentSpaces.forEach((space, index) => {
    if (!space.photos || space.photos.length === 0) {
      newErrors[`photos_${index}`] = "At least one photo is required for this space";
      isValid = false;
    }
  });

  setErrors(newErrors);
  
  // Only show notification if the function was explicitly called for validation
  // AND not during calendar navigation
  if (!isValid && triggerNotification) {
    // Check if we're currently handling a calendar navigation event
    const isCalendarNavigation = document.activeElement && 
      (document.activeElement.classList.contains('navvButton') || 
      document.activeElement.closest('.calendarNavigation'));
    
    // Only show notification if we're not navigating calendar
    if (!isCalendarNavigation) {
      setNotification({
        show: true,
        message: "Please correct the errors in the form before proceeding.",
        type: 'error'
      });
      
      // Faire défiler jusqu'à la première erreur
      const firstErrorElement = document.querySelector('.error');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  
  return isValid;
};

// Fix 3: Modification des règles de validation pour minNight et maxNight
const minMaxNightRules = {
  minNight: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Minimum nights is required";
      if (!value.match(/^\d+$/)) return "Minimum nights must be a positive integer";
      
      // On ne fait pas de validation relationnelle ici
      return "";
    }
  },
  maxNight: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Maximum nights is required";
      if (!value.match(/^\d+$/)) return "Maximum nights must be a positive integer";
      
      // On ne fait pas de validation relationnelle ici
      return "";
    }
  }
};

const handleSpacePhotoChange = (spaceIndex, photoIndex, event) => {
  if (!event.target.files || event.target.files.length === 0) return;
  
  const file = event.target.files[0];
  const updatedSpaces = [...apartmentSpaces];
  
  if (!updatedSpaces[spaceIndex].photos) {
    updatedSpaces[spaceIndex].photos = [];
  }
  
  updatedSpaces[spaceIndex].photos[photoIndex] = file;
  setApartmentSpaces(updatedSpaces);
  
  // Effacer l'erreur pour cette photo
  setErrors(prev => {
    const newErrors = {...prev};
    delete newErrors[`photos_${spaceIndex}_${photoIndex}`];
    
    // Vérifier s'il reste des photos valides pour cet espace
    if (updatedSpaces[spaceIndex].photos.length > 0) {
      delete newErrors[`photos_${spaceIndex}`];
    }
    
    return newErrors;
  });
};

// Fix 3: Improved handleApartmentSpaceChange with better type validation
const handleApartmentSpaceChange = (index, e) => {
  const { name, value } = e.target;
  const newSpaces = [...apartmentSpaces];
  newSpaces[index][name] = value;
  setApartmentSpaces(newSpaces);
  
  // Validate based on field type
  let errorMessage = '';
  
  if (!value.trim()) {
    // Required field validation
    errorMessage = `${name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')} is required`;
  } else if (name === 'area') {
    // Area must be a positive number
    if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
      errorMessage = "Area must be a positive number";
    }
  } else if (name === 'space_id') {
    // Space ID format validation (optional)
    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
      errorMessage = "Space ID should only contain letters, numbers, hyphens, and underscores";
    }
  } else if (name === 'type') {
    // Type validation - example: ensure only certain types are allowed
    const allowedTypes = ['bedroom', 'bathroom', 'living room', 'kitchen', 'office', 'balcony', 'other'];
    if (!allowedTypes.includes(value.toLowerCase()) && value.length > 0) {
      errorMessage = "Type must be one of: bedroom, bathroom, living room, kitchen, office, balcony, or other";
    }
  }
  
  // Update errors for this specific space field
  setErrors(prev => ({
    ...prev,
    [`${name}_${index}`]: errorMessage
  }));
};

// Fix 4: Improved validateField function
const validateField = (name, value) => {
  // Special handling for policy fields
  if (name.startsWith('policies.')) {
    const policyName = name.split('.')[1];
    
    // If it's a required policy field and empty
    const requiredPolicyFields = ['check_in_start', 'check_in_end', 'check_out_start', 'check_out_end', 'cancellation_policy'];
    if (requiredPolicyFields.includes(policyName) && !value) {
      return `${policyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
    }
  }
  
  // For regular fields
  const rule = validationRules[name];
  if (!rule) return "";
  
  return rule.validate ? rule.validate(value) : "";
};

// Optional: Helper to test if times should be compared
const areValidTimesForComparison = (startTime, endTime) => {
  return startTime && endTime && startTime.trim() !== '' && endTime.trim() !== '';
};

  const validationRules = {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      validate: (value) => {
        if (!value.trim()) return "Title is required";
        if (value.trim().length < 3) return "Title must be at least 3 characters";
        if (value.trim().length > 100) return "Title must be at most 100 characters";
        return "";
      }
    },
    phone: {
      pattern: /^\+?[0-9\s\-()]{8,20}$/,
      validate: (value) => {
        if (value && !value.match(/^\+?[0-9\s\-()]{8,20}$/
      )) {
          return "Please enter a valid phone number";
        }
        return "";
      }
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      validate: (value) => {
        if (value && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return "Please enter a valid email address";
        }
        return "";
      }
    },
    website: {
      pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/,
      validate: (value) => {
        if (value && !value.match(/^(https?:\/\/)?(www\.)?[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/)) {
          return "Please enter a valid website URL";
        }
        return "";
      }
    },
    description: {
      required: true,
      minLength: 20,
      validate: (value) => {
        if (!value.trim()) return "Description is required";
        if (value.trim().length < 20) return "Description must be at least 20 characters";
        return "";
      }
    },
    type: {
      required: true,
      validate: (value) => !value.trim() ? "Property type is required" : ""
    },
    address: {
      required: true,
      validate: (value) => !value.trim() ? "Address is required" : ""
    },
    country: {
      required: true,
      validate: (value) => !value.trim() ? "Country is required" : ""
    },
    city: {
      required: true,
      validate: (value) => !value.trim() ? "City is required" : ""
    },

    size: {
      required: true,
      pattern: /^\d+(\.\d+)?$/,
      validate: (value) => {
        if (!value) return "Living Area is required";
        if (!value.match(/^\d+(\.\d+)?$/)) return "Living area must be a number";
        if (parseFloat(value) > 1000) return "Living area cannot exceed 1000 square meters";
        return "";
      }
    },
    lotSize: {
      validate: (value) => {
        // Only validate if the property type is not apartment
        if (formData.type !== "Appartement") {
          if (!value) return "Total land area is required";
          if (value && !value.match(/^\d+(\.\d+)?$/)) return "Total land area must be a number";
          if (value && parseFloat(value) > 10000) return "Total land area cannot exceed 10000 square meters";
        }
        return "";
      }
    },
    floorNumber: {
      validate: (value) => {
        // Seulement requis si le type est "Appartement"
        if (formData.type === "Appartement" && !value) {
          return "Floor number is required for apartments";
        }
        
        // Validation supplémentaire si une valeur est fournie
        if (value && !value.match(/^\d+$/)) {
          return "Floor number must be a positive integer";
        }
        
        if (value && parseInt(value) > 100) {
          return "Floor number cannot exceed 100";
        }
        
        return "";
      }
    },
    numberOfBalconies: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Number of balconies is required";
        if (value && !value.match(/^\d+$/)) return "Number of balconies must be a positive integer";
        if (parseInt(value) > 10) return "Number of balconies cannot exceed 10";
        return "";
      }
    },
    rooms: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Number of rooms is required";
        if (!value.match(/^\d+$/)) return "Number of rooms must be a positive integer";
        if (parseInt(value) > 30) return "Number of rooms cannot exceed 30";
        return "";
      }
    },
    bedrooms: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Number of bedrooms is required";
        if (!value.match(/^\d+$/)) return "Number of bedrooms must be a positive integer";
        if (parseInt(value) > 20) return "Number of bedrooms cannot exceed 20";
        return "";
      }
    },
    bathrooms: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Number of bathrooms is required";
        if (!value.match(/^\d+$/)) return "Number of bathrooms must be a positive integer";
        if (parseInt(value) > 15) return "Number of bathrooms cannot exceed 15";
        return "";
      }
    },
    maxGuest: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Maximum guests is required";
        if (!value.match(/^\d+$/)) return "Maximum guests must be a positive integer";
        if (parseInt(value) > 300) return "Maximum guests cannot exceed 300";
        return "";
      }
    },
    beds_Number: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Number of beds is required";
        if (!value.match(/^\d+$/)) return "Number of beds must be a positive integer";
        if (parseInt(value) > 30) return "Number of beds cannot exceed 30";
        return "";
      }
    },
    paymentMethods: {
      validate: () => {
        // Vérifie si au moins une méthode de paiement est sélectionnée
        const hasPaymentMethod = Object.values(formData.paymentMethods).some(method => method === true);
        // Retourne une erreur UNIQUEMENT si aucune méthode n'est sélectionnée
        return !hasPaymentMethod ? "At least one payment method must be selected" : "";
      }
    },
    minNight: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Minimum nights is required";
        if (!/^\d+$/.test(value)) return "Must be a positive integer";
        const maxNight = parseInt(formData.maxNight) || 0;
        if (maxNight > 0 && parseInt(value) > maxNight) {
          return "Cannot exceed maximum nights";
        }
        return "";
      }
    },
    
    maxNight: {
      required: true,
      pattern: /^\d+$/,
      validate: (value) => {
        if (!value) return "Maximum nights is required";
        if (!/^\d+$/.test(value)) return "Must be a positive integer";
        const minNight = parseInt(formData.minNight) || 0;
        if (minNight > 0 && parseInt(value) < minNight) {
          return "Must be greater than minimum nights";
        }
        return "";
      }
    },  
  
  // Make sure policy rules are properly defined
  'policies.check_in_start': {
    required: true,
    validate: (value) => !value ? "Check-in start time is required" : ""
  },
  'policies.check_in_end': {
    required: true,
    validate: (value) => !value ? "Check-in end time is required" : ""
  },
  'policies.check_out_start': {
    required: true,
    validate: (value) => !value ? "Check-out start time is required" : ""
  },
  'policies.check_out_end': {
    required: true,
    validate: (value) => !value ? "Check-out end time is required" : ""
  },
  'policies.cancellation_policy': {
    required: true,
    validate: (value) => {
      if (!value) return "Cancellation policy is required";
      return "";
    }
  },
  'policies.cleaning_maintenance': {
    required: true,
    minLength: 10,
    validate: (value) => {
      if (!value || value.trim() === "") return "Cleaning maintenance information is required";
      if (value.trim().length < 10) return "Cleaning maintenance information must be at least 10 characters";
      return "";
    }
  },

  };

  const [errors, setErrors] = useState({});
  

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    
    // For nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const errorMessage = validateField(name, type === "checkbox" ? checked : value);
      setErrors(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: errorMessage
        }
      }));
    } else {
      // For regular fields
      const errorMessage = validateField(name, type === "checkbox" ? checked : value);
      setErrors(prev => ({
        ...prev,
        [name]: errorMessage
      }));
    }
  };

  const [availabilities, setAvailabilities] = useState([]);
  const [currentAvailability, setCurrentAvailability] = useState({
    start_time: "",
    end_time: "",
    price: "",
    touristTax: "",
  });

  // Mise à jour synchronisée de formData lorsque availabilities change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      availabilities
    }));
  }, [availabilities, setFormData]);

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setCurrentAvailability((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddAvailability = () => {
    if (!currentAvailability.start_time || 
        !currentAvailability.end_time || 
        !currentAvailability.price) {
      alert("Veuillez sélectionner des dates et entrer un prix.");
      return;
    }
    
    setAvailabilities((prevAvailabilities) => [
      ...prevAvailabilities,
      {...currentAvailability}
    ]);
    
    setCurrentAvailability({ 
      start_time: "", 
      end_time: "", 
      price: "",
      touristTax: ""
    });
  };

  const handleDateSelect = useCallback(({ startDate, endDate }) => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const start_time = new Date(start.setHours(0, 0, 0, 0)).toISOString();
    const end_time = new Date(end.setDate(end.getDate() + 1)).toISOString();

    setCurrentAvailability((prevData) => ({
      ...prevData,
      start_time,
      end_time,
    }));
  }, []);

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Sélectionner des dates';
  };

  // Fonction mémoïsée pour éviter les recréations inutiles
  const handleRemoveAvailability = useCallback((index) => {
    setAvailabilities(prev => prev.filter((_, i) => i !== index));
  }, []);

  const renderAvailabilitySection = () => {
    // Mémoïser la fonction de callback pour éviter les recréations inutiles
    const handleAvailabilitiesChange = useCallback((newAvailabilities) => {
      setAvailabilities(newAvailabilities);
      setFormData(prev => ({
        ...prev,
        availabilities: newAvailabilities
      }));
    }, [setFormData]);
  
    // Mémoïser la fonction de suppression
    const handleRemoveAvailability = useCallback((index) => {
      setAvailabilities(prev => {
        const newAvailabilities = [...prev];
        newAvailabilities.splice(index, 1);
        return newAvailabilities;
      });
    }, []);
  
    return (
      <section className="section">
        <div className="availability-container">
          <AvailabilityManager 
            onAvailabilitiesChange={handleAvailabilitiesChange}
            initialAvailabilities={availabilities}
          />
        </div>
        
      </section>
    );
  };

// État pour les coordonnées
const [coordinates, setCoordinates] = useState({
    latitude: 0,
    longitude: 0
  });
  
  // État pour suivre la source de la dernière mise à jour (pour éviter les boucles infinies)
  const [lastUpdateSource, setLastUpdateSource] = useState(null);
  
  // Mise à jour de la carte basée sur les changements d'adresse, ville ou pays
  useEffect(() => {
    // Ne pas mettre à jour si la dernière mise à jour vient du clic sur la carte
    if (lastUpdateSource === 'map-click') {
      setLastUpdateSource(null);
      return;
    }
  
    const updateMap = () => {
      let locationQuery = '';
      
      // Construire une chaîne de requête cohérente à partir des données du formulaire
      if (formData.address && formData.city && formData.country) {
        locationQuery = `${formData.address}, ${formData.city}, ${formData.country}`;
      } else if (formData.city && formData.country) {
        locationQuery = `${formData.city}, ${formData.country}`;
      } else if (formData.address && formData.country) {
        locationQuery = `${formData.address}, ${formData.country}`;
      } else if (formData.address && formData.city) {
        locationQuery = `${formData.address}, ${formData.city}`;
      } else if (formData.city) {
        locationQuery = formData.city;
      } else if (formData.country) {
        locationQuery = formData.country;
      } else if (formData.address) {
        locationQuery = formData.address;
      }
      
      // Si nous avons une requête de localisation, mettre à jour la carte
      if (locationQuery) {
        const encodedQuery = encodeURIComponent(locationQuery);
        setMapUrl(`https://maps.google.com/maps?q=${encodedQuery}&z=15&output=embed`);
        
        // Marquer cette mise à jour comme provenant du formulaire
        setLastUpdateSource('form');
        
        // Obtenir les coordonnées à partir de l'adresse (geocoding)
        geocodeAddress(locationQuery);
      }
    };
    
    // Mettre à jour la carte après un délai pour éviter trop d'appels lors de la frappe
    const timeoutId = setTimeout(updateMap, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.address, formData.city, formData.country]);
  
  // Fonction pour convertir une adresse en coordonnées (geocoding)
  const geocodeAddress = async (address) => {
    try {
      // Utilisation de l'API Nominatim d'OpenStreetMap (gratuite)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          
          // Mettre à jour les coordonnées
          const newCoordinates = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          };
          
          setCoordinates(newCoordinates);
          
          // Mettre à jour userLocation pour l'API backend
          setUserLocation(newCoordinates);
          
          // Si la mise à jour vient du formulaire, effectuer un géocodage inverse pour valider les infos
          if (lastUpdateSource === 'form') {
            // Effectuer un géocodage inverse sans mettre à jour le formulaire si un champ est vide
            validateAddressWithReverseGeocode(parseFloat(lat), parseFloat(lon));
          }
        }
      }
    } catch (error) {
      console.error("Error with geocoding:", error);
    }
  };
  
  // Fonction pour valider l'adresse sans écraser les champs déjà remplis
  const validateAddressWithReverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const { road, house_number, city, town, village, country } = data.address;
          
          // Déterminer la ville (peut être dans city, town ou village selon la région)
          const cityValue = city || town || village || '';
          
          // Construire l'adresse
          const streetAddress = house_number 
            ? `${house_number} ${road || ''}`
            : road || '';
          
          // Préparer les nouvelles valeurs, en conservant les valeurs existantes si elles sont déjà remplies
          const newFormData = { ...formData };
          
          // Ne remplir les champs que s'ils étaient vides
          if (!formData.address && streetAddress) newFormData.address = streetAddress;
          if (!formData.city && cityValue) newFormData.city = cityValue;
          if (!formData.country && country) newFormData.country = country;
          
          // Vérifier s'il y a des changements
          if (JSON.stringify(newFormData) !== JSON.stringify(formData)) {
            setFormData(newFormData);
            
            // Valider les champs modifiés
            const updatedErrors = { ...errors };
            if (newFormData.address !== formData.address) {
              updatedErrors.address = validateField('address', newFormData.address);
            }
            if (newFormData.city !== formData.city) {
              updatedErrors.city = validateField('city', newFormData.city);
            }
            if (newFormData.country !== formData.country) {
              updatedErrors.country = validateField('country', newFormData.country);
            }
            
            setErrors(updatedErrors);
          }
        }
      }
    } catch (error) {
      console.error("Error with reverse geocoding validation:", error);
    }
  };
  
  // Fonction pour obtenir la localisation actuelle de l'utilisateur
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Mettre à jour les coordonnées et la carte
          setUserLocation({ latitude, longitude });
          setCoordinates({ latitude, longitude });
          setMapUrl(`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`);
          
          // Marquer cette mise à jour comme provenant de la géolocalisation
          setLastUpdateSource('geolocation');
          
          // Faire une requête de géocodage inverse pour obtenir l'adresse complète
          reverseGeocode(latitude, longitude);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Impossible d'obtenir votre position actuelle. Veuillez vérifier vos paramètres de localisation.");
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      setIsLoadingLocation(false);
    }
  };
  
  // Fonction pour faire du géocodage inverse (convertir lat/lng en adresse) avec OpenStreetMap
  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Utilisation de l'API Nominatim d'OpenStreetMap (gratuite)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const { road, house_number, city, town, village, country, postcode } = data.address;
          
          // Déterminer la ville (peut être dans city, town ou village selon la région)
          const cityValue = city || town || village || '';
          
          // Construire l'adresse
          const streetAddress = house_number 
            ? `${house_number} ${road || ''}`
            : road || '';
          
          // Mettre à jour le formulaire avec les informations obtenues
          setFormData(prev => ({
            ...prev,
            address: streetAddress,
            city: cityValue,
            country: country || '',
            postcode: postcode || prev.postcode // Ajout du code postal si disponible
          }));
          
          // Valider les champs après mise à jour
          const addressError = validateField('address', streetAddress);
          const cityError = validateField('city', cityValue);
          const countryError = validateField('country', country || '');
          
          setErrors(prev => ({
            ...prev,
            address: addressError,
            city: cityError,
            country: countryError
          }));
        }
      }
    } catch (error) {
      console.error("Error with reverse geocoding:", error);
    }
  };
  
  // Fonction pour gérer le clic sur la carte (à ajouter)
  const handleMapClick = (latitude, longitude) => {
    // Mettre à jour les coordonnées
    setCoordinates({ latitude, longitude });
    setUserLocation({ latitude, longitude });
    
    // Marquer cette mise à jour comme provenant d'un clic sur la carte
    setLastUpdateSource('map-click');
    
    // Faire une requête de géocodage inverse pour obtenir l'adresse
    reverseGeocode(latitude, longitude);
  };
  
  // Composant de rendu de la section location
  const renderLocationSection = () => {
    return (
      <section className="section">
      <h2>4. Location</h2>
      
      {/* Adresse complète sur toute la largeur */}
      <div className="inputContainer">
        <label className={styles.label}>
          Address <span className={styles.required}>*</span>
        </label>
        <input
          className="fullWidth"
          type="text"
          placeholder="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.address && <span className="error">{errors.address}</span>}
      </div>
      
      {/* Utilisation de notre nouvelle mise en page en deux colonnes */}
      <div className={styles.twoColumnLayout}>
        {/* Colonne de gauche */}
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              City <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.city && <span className="error">{errors.city}</span>}
          </div>
        </div>
        
        {/* Colonne de droite */}
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              Country <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.country && <span className="error">{errors.country}</span>}
          </div>
        </div>
      </div>
            
        {/*<div className="locationCoordinates">
          <p>Latitude: {coordinates.latitude.toFixed(6)}</p>
          <p>Longitude: {coordinates.longitude.toFixed(6)}</p>
        </div>*/}
            
        {/*<div className="locationControls">
          <button
            type="button"
            className="locationButton"
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            <MdMyLocation size={18} style={{ marginRight: '5px' }} />
            {isLoadingLocation ? 'Chargement...' : 'Use my current location'}
          </button>
        </div>*/}
            
        <div className="mapContainer">
          <iframe
            title="Location"
            src={mapUrl}
            allowFullScreen
            loading="lazy"
            onLoad={() => {
              // L'iframe ne permet pas d'accéder aux événements de clic dans la carte Google Maps
              // Nous devrons utiliser une autre approche pour intégrer des cartes interactives
            }}
          />
          <div className="mapInstructions">
            <p>
              <strong>Note:</strong> L'iframe Google Maps ne permet pas la sélection directe sur la carte. 
              Pour une carte interactive, nous recommandons d'utiliser Leaflet ou Google Maps JavaScript API.
            </p>
          </div>
        </div>
        {/* Pour une solution complète, remplacer l'iframe par une carte interactive */}
        {/* 
        <div className="mapContainer">
          <MapComponent 
            coordinates={coordinates}
            onMapClick={handleMapClick}
            zoom={15}
          />
        </div>
        */}
      </section>
    );
  };

  // État pour stocker les photos principales
  const [mainPhotos, setMainPhotos] = useState([]);

  const [apartmentSpaces, setApartmentSpaces] = useState([
    { space_id: '', type: '', area: '', photos: [] }
  ]);
  
  // État pour stocker les erreurs des espaces
  const [spaceErrors, setSpaceErrors] = useState([
    { type: '', area: '' }
  ]);

  const validateSpaceField = (field, value, index) => {
    switch (field) {
      case 'type':
        return !value.trim() ? "Space type is required" : "";
      case 'area':
        if (!value.trim()) return "Area is required";
        if (!value.match(/^\d+(\.\d+)?$/)) return "Area must be a number";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Mettre à jour les données du formulaire
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    
    // Valider en temps réel
    const error = validateField(name, value);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: error,
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, checked } = e.target;
  
    // Mettre à jour les méthodes de paiement
    setFormData((prevState) => {
      const updatedPayments = checked
        ? [...prevState.means_of_payment, name]
        : prevState.means_of_payment.filter((method) => method !== name);
  
      return {
        ...prevState,
        means_of_payment: updatedPayments,
        paymentMethods: {
          ...prevState.paymentMethods,
          [name]: checked,
        },
      };
    });
  
  };


  // Fonction pour gérer l'upload de photos d'espace
  const handlePhotoChange = (spaceIndex, photoIndex, event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const updatedSpaces = apartmentSpaces.map((space, index) => {
      if (index === spaceIndex) {
        const updatedPhotos = [...space.photos];
        updatedPhotos[photoIndex] = file;
        return { ...space, photos: updatedPhotos };
      }
      return space;
    });
    setApartmentSpaces(updatedSpaces);
    
    // Supprimer la partie qui efface les erreurs ici
  };

  const handleMainPhotoUpload = async (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    // On ajoute simplement le fichier sans validation immédiate
    setMainPhotos([...mainPhotos, file]);
  };

  // Fonction pour supprimer une photo principale
  const removeMainPhoto = (index) => {
    const updatedPhotos = [...mainPhotos];
    updatedPhotos.splice(index, 1);
    setMainPhotos(updatedPhotos);
    
    // Valider si des photos principales sont présentes
    if (updatedPhotos.length === 0) {
      setErrors(prev => ({...prev, mainPhotos: "At least two main photo is required"}));
    }
  };

  const addApartmentSpace = () => {
    setApartmentSpaces([
      ...apartmentSpaces,
      { space_id: '', type: '', area: '', photos: [] },
    ]);
  };

  const addPhotoToSpace = (spaceIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos.push(file);
    setApartmentSpaces(updatedSpaces);
  };
  
  const removeSpacePhoto = (spaceIndex, photoIndex) => {
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos.splice(photoIndex, 1);
    setApartmentSpaces(updatedSpaces);  // Assure-toi de mettre à jour l'état des espaces
  };

  const removeApartmentSpace = (indexToRemove) => {
    setApartmentSpaces((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };


  const addPhotoInput = (spaceIndex) => {
    const updatedSpaces = apartmentSpaces.map((space, index) => {
      if (index === spaceIndex) {
        return { ...space, photos: [...space.photos, null] };
      }
      return space;
    });
    setApartmentSpaces(updatedSpaces);
  };

  const handleAmenitiesChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      amenities: {
        ...prevState.amenities,
        [name]: checked,
      },
    }));
  };


  // Fonction pour uploader une photo vers Firebase Storage
  const uploadToFirebase = async (file, path) => {
    try {
      // Accès au service Firebase Storage
      const storage = getStorage();
      
      // Créer une référence avec un nom unique pour éviter les écrasements
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const fullPath = `${path}/${uniqueFileName}`;
      
      const storageRef = ref(storage, fullPath);
      
      // Upload du fichier
      const snapshot = await uploadBytes(storageRef, file);
      
      // Récupérer l'URL de téléchargement
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file to Firebase:", error);
      throw error;
    }
  };

   // 1. Ajout d'états pour gérer les notifications
const [notification, setNotification] = useState({
  show: false,
  message: '',
  type: 'success', // 'success' ou 'error'
});

const safeSetNotification = (notificationData) => {
  // If this is an error notification, check if we're handling calendar navigation
  if (notificationData.show && notificationData.type === 'error') {
    // Check if any calendar navigation button is the active element or was recently clicked
    const isCalendarButton = document.activeElement && (
      document.activeElement.classList.contains('navvButton') ||
      document.activeElement.closest('.calendarNavigation')
    );
    
    // Skip showing the notification if we're in calendar navigation
    if (isCalendarButton) {
      console.log('Prevented notification during calendar navigation');
      return;
    }
  }
  
  // Set the notification state normally
  setNotification(notificationData);
};

// 2. Composant de notification
const Notification = ({ type, message, onClose }) => {
  // Add auto-close functionality
  useEffect(() => {
    if (type === 'error') {
      // For errors, add a longer timeout
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // For success messages, shorter timeout
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);
// Check if it's a calendar navigation triggered error
const isCalendarNavigationError = 
type === 'error' && 
document.activeElement && 
(document.activeElement.classList.contains('navvButton') || 
 document.activeElement.closest('.calendarNavigation'));

// Don't render if it's from calendar navigation
if (isCalendarNavigationError) {
return null;
}

return (
  <div 
    className={`notification ${type === 'success' ? 'success-notification' : 'error-notification'}`}
    style={{
      position: 'fixed',
      marginTop: '60px',
      top: '20px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '5px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      zIndex: 2000,
      maxWidth: '350px',
      backgroundColor: type === 'success' ? '#4caf50' : '#f44336',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    <div>{message}</div>
    <button 
      onClick={onClose}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'white',
        fontSize: '16px',
        marginLeft: '10px',
        cursor: 'pointer'
      }}
    >
      ×
    </button>
  </div>
);
};


  const [submitAttempted, setSubmitAttempted] = useState(false);
 
  const handleNavigate = async (e) => {
    e.preventDefault();
    console.log("Validating before navigation...");
    
    // Valider le formulaire avant de naviguer
    const isValid = validateFormBeforeSubmit();
    
    if (isValid) {
      console.log("Form is valid. Navigating to the next step...");
      
      // Afficher une notification de succès
      setNotification({
        show: true,
        message: 'Validation réussie, passage à l\'étape suivante.',
        type: 'success'
      });
      
      // Naviguer vers l'étape suivante après un court délai
      setTimeout(() => {
        nextStep();
      }, 1000);
    }
  };
  
  // 5. Mise à jour de handleSubmit pour gérer les notifications et empêcher la navigation en cas d'erreur
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Valider le formulaire avant de naviguer
    const isValid = validateFormBeforeSubmit();
    
    if (!isValid) {
      console.log("Form validation failed. Please fix the errors.");
      return; // Arrêter la soumission si le formulaire n'est pas valide
    }
    
    console.log("Form is valid. Proceeding with submission...");
    
    if (loading) {
      console.error('Authentication loading in progress...');
      safeSetNotification({
        show: true,
        message: 'Authentification en cours, veuillez patienter...',
        type: 'error'
      });
      return;
    }
    
    if (!firebaseUserId) {
      console.error('Firebase ID not available, you must be logged in');
      safeSetNotification({
        show: true,
        message: 'Vous devez être connecté pour créer une propriété',
        type: 'error'
      });
      return;
    }
  
    setIsUploading(true);
    setUploadProgress(0);
  
    try {
      // 1. Upload les photos principales
      const mainPhotoUrls = [];
      for (let i = 0; i < mainPhotos.length; i++) {
        const photo = mainPhotos[i];
        // Vérifier si c'est un fichier ou déjà une URL
        if (photo instanceof File) {
          const downloadURL = await uploadToFirebase(photo, `properties/${firebaseUserId}/main`);
          mainPhotoUrls.push(downloadURL);
        } else if (typeof photo === 'string') {
          // Si c'est déjà une URL (cas de mise à jour), on la conserve
          mainPhotoUrls.push(photo);
        } else if (photo && photo.preview) {
          // Si c'est un objet avec une prévisualisation (cas de certains sélecteurs de fichiers)
          const downloadURL = await uploadToFirebase(photo.file || photo, `properties/${firebaseUserId}/main`);
          mainPhotoUrls.push(downloadURL);
        }
        // Mise à jour de la progression
        setUploadProgress(Math.round((i + 1) / mainPhotos.length * 50)); // 50% pour les photos principales
      }
  
      // 2. Upload les photos des espaces
      const propertySpaces = [];
      for (let i = 0; i < apartmentSpaces.length; i++) {
        const space = apartmentSpaces[i];
        const spacePhotoUrls = [];
        
        // Upload des photos de cet espace
        if (space.photos && Array.isArray(space.photos)) {
          for (let j = 0; j < space.photos.length; j++) {
            const photo = space.photos[j];
            if (photo instanceof File) {
              const downloadURL = await uploadToFirebase(
                photo, 
                `properties/${firebaseUserId}/spaces/${space.space_id || `space-${i}`}`
              );
              spacePhotoUrls.push(downloadURL);
            } else if (typeof photo === 'string') {
              // Si c'est déjà une URL, on la conserve
              spacePhotoUrls.push(photo);
            } else if (photo && photo.preview) {
              // Si c'est un objet avec une prévisualisation
              const downloadURL = await uploadToFirebase(
                photo.file || photo, 
                `properties/${firebaseUserId}/spaces/${space.space_id || `space-${i}`}`
              );
              spacePhotoUrls.push(downloadURL);
            }
          }
        }
        
        propertySpaces.push({
          space_id: space.space_id || `space-${i}-${Date.now()}`,
          type: space.type || '',
          area: !isNaN(parseFloat(space.area)) ? parseFloat(space.area) : 0,
          photos: spacePhotoUrls // URLs des photos uploadées sur Firebase
        });
        
        // Mise à jour de la progression (50% restants pour les espaces)
        setUploadProgress(50 + Math.round((i + 1) / apartmentSpaces.length * 50));
      }
  
      // S'assurer que les coordonnées sont des nombres valides
      const validLatitude = !isNaN(parseFloat(coordinates.latitude)) ? parseFloat(coordinates.latitude) : 0;
      const validLongitude = !isNaN(parseFloat(coordinates.longitude)) ? parseFloat(coordinates.longitude) : 0;
  
      // Assurer que means_of_payment est un tableau
      const meansOfPayment = Array.isArray(formData.means_of_payment) ? 
        formData.means_of_payment : 
        Object.entries(formData.paymentMethods || {})
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key);
  
      // Préparer les données à envoyer à l'API avec les coordonnées exactes
      const propertyData = {
        firebaseUid: firebaseUserId, 
        title: formData.title ? formData.title.trim() : '',
        description: formData.description ? formData.description.trim() : '',
        availabilities: (availabilities || []).map(avail => {
          // Create a fresh object without isPlace property
          return {
            start_time: avail.start_time || '',
            end_time: avail.end_time || '',
            price: !isNaN(parseFloat(avail.price)) && avail.price > 0 ? parseFloat(avail.price) : 0,
            otherPlatformPrice: avail.otherPlatformPrice ? parseFloat(avail.otherPlatformPrice) : null,
            // Replace isPlace with isPrice
            isPrice: Boolean(avail.isPrice), // Convert to boolean
            touristTax: !isNaN(parseFloat(avail.touristTax)) && avail.touristTax > 0 ? parseFloat(avail.touristTax) : 0,
          };
        }),
        mainPhotos: mainPhotoUrls, // URLs des photos principales sur Firebase
        type: formData.type ? formData.type.trim() : '',
        apartmentSpaces: propertySpaces, // Espaces avec URLs des photos
        address: formData.address ? formData.address.trim() : '',
        country: formData.country ? formData.country.trim() : '',
        city: formData.city ? formData.city.trim() : '',
        // Utilisation directe des coordonnées stockées
        latitude: validLatitude,
        longitude: validLongitude,
        size: isNaN(parseFloat(formData.size)) ? 0 : parseFloat(formData.size),
        lotSize: formData.type === "Appartement" ? 0 : 
        (isNaN(parseFloat(formData.lotSize)) ? 0 : parseFloat(formData.lotSize)),       
        floorNumber: isNaN(parseInt(formData.floorNumber, 10)) ? 0 : parseInt(formData.floorNumber, 10),
        numberOfBalconies: isNaN(parseInt(formData.numberOfBalconies, 10)) ? 0 : parseInt(formData.numberOfBalconies, 10),
        rooms: isNaN(parseInt(formData.rooms, 10)) ? 0 : parseInt(formData.rooms, 10),
        bedrooms: isNaN(parseInt(formData.bedrooms, 10)) ? 0 : parseInt(formData.bedrooms, 10),
        bathrooms: isNaN(parseInt(formData.bathrooms, 10)) ? 0 : parseInt(formData.bathrooms, 10),
        beds_Number: isNaN(parseInt(formData.beds_Number, 10)) ? 0 : parseInt(formData.beds_Number, 10),
        maxGuest: isNaN(parseInt(formData.maxGuest, 10)) ? 0 : parseInt(formData.maxGuest, 10),
        minNight: isNaN(parseInt(formData.minNight, 10)) ? 0 : parseInt(formData.minNight, 10),
        maxNight: isNaN(parseInt(formData.maxNight, 10)) ? 0 : parseInt(formData.maxNight, 10),
        amenities: formData.amenities || {},
        policies: formData.policies || {},
        means_of_payment: meansOfPayment,
        phone: formData.phone || '',
        email: formData.email || '',
        website: formData.website || '',
      };
  
      console.log('Data being sent to server:', JSON.stringify(propertyData));
  
      // Envoyer les données à l'API backend
      const response = await axios.post('http://localhost:3000/properties', propertyData, {
        headers: { 'Content-Type': 'application/json' },
      });
  
      console.log('Server response:', response.data);
      
      // Afficher une notification de succès
      safeSetNotification({
        show: true,
        message: 'Property created successfully !',
        type: 'success'
      });
      
      // Redirection ou autre action après succès
      setTimeout(() => {
        nextStep(); // Passer à l'étape suivante seulement en cas de succès
      }, 1500);
  
    } catch (error) {
      console.error('Error details:', error);
      
      let errorMessage = 'Une erreur s\'est produite lors de l\'enregistrement de la propriété.';
      
      if (error.response) {
        console.error('Server error status:', error.response.status);
        console.error('Server error data:', error.response.data);
        
        // Afficher un message d'erreur plus spécifique si disponible
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = "Aucune réponse du serveur. Veuillez vérifier votre connexion internet.";
      } else {
        console.error('General error:', error.message);
        errorMessage = error.message;
      }
      
      // Afficher une notification d'erreur
      safeSetNotification({
        show: true,
        message: `Erreur: ${errorMessage}`,
        type: 'error'
      });
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // 6. Correction du handleFormSubmit pour ne pas naviguer en cas d'erreur
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    const isValid = validateFormBeforeSubmit();
    if (isValid) {
      handleSubmit(e);
      // Ne pas appeler handleNavigate ici car handleSubmit inclut déjà la navigation
    }
  };
  
  // 7. Ajout du rendu du composant de notification dans le composant
  const renderNotification = () => {
    if (!notification.show) return null;
    
    return (
      <Notification 
        type={notification.type} 
        message={notification.message} 
        onClose={() => setNotification({ ...notification, show: false })}
      />
    );
  };
  // Fonction pour déterminer si le champ Total land area doit être affiché
  const shouldShowLotSize = () => {
    return formData.type && formData.type !== "Appartement";
  };
  
  const shouldShowFloor = () => {
    return formData.type === "Appartement";
  };
 
  // Obtenir le nom du type d'espace basé sur le type de propriété sélectionné
  const getSpaceTypeName = () => {
    switch (formData.type) {
      case "Hotel":
        return "Room";      
      case "Appartement":
        return "Unit";        
      case "Villa":
        return "Suite";       
      default:
        return "Space";      
    }
  };
  

  // Fix 5: Amélioration de la fonction de débogage pour le formulaire
const debugForm = () => {
  console.group("État du formulaire");
  console.log("FormData:", formData);
  console.log("Errors:", errors);
  console.log("ApartmentSpaces:", apartmentSpaces);
  console.log("MainPhotos:", mainPhotos);
  console.log("Availabilities:", availabilities);
  console.log("Coordinates:", coordinates);
  console.groupEnd();
  
  // Vérifier les problèmes courants
  const commonIssues = [];
  
  if (!formData.title) commonIssues.push("Title is missing");
  if (!formData.description) commonIssues.push("Description is missing");
  if (!formData.address) commonIssues.push("Address is missing");
  if (!formData.city) commonIssues.push("City is missing");
  if (!formData.country) commonIssues.push("Country is missing");
  
  if (!Array.isArray(mainPhotos) || mainPhotos.length < 2) {
    commonIssues.push("Need at least 2 main photos");
  }
  
  if (!Array.isArray(apartmentSpaces) || apartmentSpaces.length === 0) {
    commonIssues.push("Need at least one apartment space");
  } else {
    apartmentSpaces.forEach((space, i) => {
      if (!space.space_id) commonIssues.push(`Space ${i+1}: ID is missing`);
      if (!space.type) commonIssues.push(`Space ${i+1}: Type is missing`);
      if (!space.area) commonIssues.push(`Space ${i+1}: Area is missing`);
      if (!Array.isArray(space.photos) || space.photos.length === 0) {
        commonIssues.push(`Space ${i+1}: Need at least one photo`);
      }
    });
  }
  
  if (!Array.isArray(availabilities) || availabilities.length === 0) {
    commonIssues.push("Need at least one availability period");
  }
  
  if (commonIssues.length > 0) {
    console.group("Common Issues Found");
    commonIssues.forEach(issue => console.log("- " + issue));
    console.groupEnd();
  } else {
    console.log("No common issues detected");
  }
  
  return commonIssues.length === 0;
};


  // Fonction d'aide pour afficher les messages d'erreur
  const renderError = (error) => {
    if (!error) return null;
    return <span className="error-message text-red-500 text-sm">{error}</span>;
  };

 

  const renderUploadProgress = () => {
    if (!isUploading) return null;
    
    return (
      <div className="upload-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
        <p>Upload en cours: {uploadProgress}%</p>
      </div>
    );
  };
    
  return (
    <div>
    <h2 className={styles.title}>Create your first property</h2>
        <div className="main">
          <form className="propertyForm" onSubmit={handleFormSubmit}>
            <section className="section">
              <h2>1. Description</h2>
              <div className="inputContainer">
                <label className={styles.label}>
                  Property Title <span className={styles.required}>*</span>
                </label>
                <i className="fas fa-user"></i>
                <input
                  className="fullWidth"
                  type="text"
                  placeholder="Property Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.title && <span className="error">{errors.title}</span>}
              </div>
      
              <div className="inputContainer">
                <label className={styles.label}>
                  Description <span className={styles.required}>*</span>
                </label>
                <i className="fas fa-pen"></i>
                <textarea
                  className="fullWidth"
                  placeholder="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.description && <span className="error">{errors.description}</span>}
              </div>
                                     {/* Intégration du SEOContentGenerator */}
              <SEOContentGenerator
                formData={formData}
                onTitleGenerated={handleTitleGenerated}
                onDescriptionGenerated={handleDescriptionGenerated}
                currentTitle={formData.title}
                currentDescription={formData.description}
              />
            </section>
      
            <section className="section">
              <h2>Property Type</h2>
              <div className="inputContainer">
                <label className={styles.label}>
                  Type <span className={styles.required}>*</span>
                </label>
                <i className="fas fa-chevron-down"></i>
                <select
                  className="fullWidth"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">Select property type</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Appartement">Appartement</option>
                  <option value="Villa">Villa</option>
                  <option value="Room">Room</option>
                  <option value="Cabin">Cabin</option>
                </select>
                {errors.type && <span className="error">{errors.type}</span>}
              </div>
            </section>
      
            <section className="section">
              {renderAvailabilitySection()}
            </section>
      
            <section className="section">
              <h2>3. Property Details</h2>
 {/* Dans le JSX, modifiez la section des photos principales : */}
<section className="section">
  <div className="sectionHeader">
    <h2>Main Photos</h2>
    <input
      id="mainPhotoInput"
      type="file"
      accept="image/*"
      onChange={handleMainPhotoUpload}
      style={{ display: 'none' }}
    />
    <p className="text-muted">
      Please upload at least 2 photos showing the outside view of your property.
    </p>
  </div>
  <button
    type="button"
    className="uploadButton"
    onClick={() => document.getElementById('mainPhotoInput').click()}
  >
    Choose File
  </button>
  {renderUploadProgress()}
  {mainPhotos.length > 0 && (
    <div className="photoPreviewContainer">
      <div className="photoGrid">
        {mainPhotos.map((photo, index) => (
          <div key={index} className="photoPreview">
            <img
              src={URL.createObjectURL(photo)}
              alt={`Main photo ${index + 1}`}
              className="previewImage"
            />
            <button
              type="button"
              className="removeButton"
              onClick={() => removeMainPhoto(index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
  {/* Afficher l'erreur seulement après tentative de soumission */}
  {submitAttempted && errors.mainPhotos && (
    <span className="error">{errors.mainPhotos}</span>
  )}
</section>
      
              <section className="section">
  <h2>Details</h2>
  
  <div className={styles.twoColumnLayout}>
    {/* Colonne de gauche */}
    <div className={styles.column}>
      <div className="inputContainer">
        <label className={styles.label}>
          Living area (m²) <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Living area (m²)"
          name="size"
          value={formData.size}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.size && <span className="error">{errors.size}</span>}
      </div>

      {shouldShowFloor() && (
        <div className="inputContainer">
          <label className={styles.label}>
            Floor Number <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            placeholder="Floor Number"
            name="floorNumber"
            value={formData.floorNumber || ''}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.floorNumber && <span className="error">{errors.floorNumber}</span>}
        </div>
      )}

      <div className="inputContainer">
        <label className={styles.label}>
          Number of rooms <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Number of rooms"
          name="rooms"
          value={formData.rooms}
          onChange={handleChange}
        />
        {errors.rooms && <span className="error">{errors.rooms}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Bathrooms <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Bathrooms"
          name="bathrooms"
          value={formData.bathrooms}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.bathrooms && <span className="error">{errors.bathrooms}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Maximum capacity (guests) <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Maximum capacity (guests)"
          name="maxGuest"
          value={formData.maxGuest}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.maxGuest && <span className="error">{errors.maxGuest}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Maximum nights <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Maximum nights"
          name="maxNight"
          value={formData.maxNight}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.maxNight && <span className="error">{errors.maxNight}</span>}
      </div>
    </div>
    
    {/* Colonne de droite */}
    <div className={styles.column}>
      {shouldShowLotSize() && (
        <div className="inputContainer">
          <label className={styles.label}>
            Total land area (m²) <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            placeholder="Total land area (m²)"
            name="lotSize"
            value={formData.lotSize}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.lotSize && <span className="error">{errors.lotSize}</span>}
        </div>
      )}

      <div className="inputContainer">
        <label className={styles.label}>
          Number of Balconies <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Number of Balconies"
          name="numberOfBalconies"
          value={formData.numberOfBalconies || ''}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.numberOfBalconies && <span className="error">{errors.numberOfBalconies}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Bedrooms <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Bedrooms"
          name="bedrooms"
          value={formData.bedrooms}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.bedrooms && <span className="error">{errors.bedrooms}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Number of beds <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Number of beds"
          name="beds_Number"
          value={formData.beds_Number}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.beds_Number && <span className="error">{errors.beds_Number}</span>}
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Minimum nights <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          placeholder="Minimum nights"
          name="minNight"
          value={formData.minNight}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.minNight && <span className="error">{errors.minNight}</span>}
      </div>
    </div>
  </div>
</section>
            </section>
      
  <section className="section">
  <h2>{formData.type ? `${formData.type} ${getSpaceTypeName()}s` : "Property Spaces"}</h2>

  {apartmentSpaces.map((space, index) => (
    <div key={index} className="spaceContainer">
      <div className="spacePhotosSection">
        <div className="sectionHeader">
          <h2 className="photop">Photos</h2>
          <button 
            type="button"
            className="uploadButton"
            onClick={() => document.getElementById(`space-${index}-photo-input`).click()}
          >
            Choose File
          </button>
        </div>

        <input
          type="file"
          id={`space-${index}-photo-input`}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => addPhotoToSpace(index, e)}
        />

        {renderUploadProgress()}

        {space.photos.length > 0 && (
          <div className="photoPreviewContainer">
            <div className="photoGrid">
              {space.photos.map((photo, photoIndex) => (
                <div key={photoIndex} className="photoPreview">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Space photo ${photoIndex + 1}`}
                    className="previewImage"
                  />
                  <button
                    type="button"
                    className="removeButton"
                    onClick={() => removeSpacePhoto(index, photoIndex)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

{submitAttempted && errors[`photos_${index}`] && (
  <span className="error">{errors[`photos_${index}`]}</span>
)}
      </div>
      
      {/* Disposition en 2 colonnes pour les champs du space */}
      <div className={styles.twoColumnLayout}>
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              Space ID <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="space_id"
              placeholder="Space ID"
              value={space.space_id}
              onChange={(e) => handleApartmentSpaceChange(index, e)}
            />
            {errors[`space_id_${index}`] && <span className="error">{errors[`space_id_${index}`]}</span>}
          </div>
        </div>
        
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              Type <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="type"
              placeholder="Type"
              value={space.type}
              onChange={(e) => handleApartmentSpaceChange(index, e)}
            />
            {errors[`type_${index}`] && <span className="error">{errors[`type_${index}`]}</span>}
          </div>
        </div>
      </div>
      
      <div className="inputContainer">
        <label className={styles.label}>
          Area (sqm) <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="area"
          placeholder="Area (sqm)"
          value={space.area}
          onChange={(e) => handleApartmentSpaceChange(index, e)}
        />
        {errors[`area_${index}`] && <span className="error">{errors[`area_${index}`]}</span>}
      </div>

      {/* Boutons pour supprimer un space */}
      {index > 0 && (
        <button
          type="button"
          className="removeButton"
          onClick={() => removeApartmentSpace(index)}
        >
          Remove Space
        </button>
      )}

      {index < apartmentSpaces.length - 1 && <hr className="spaceDivider" />}
    </div>
  ))}

  {/* Bouton d'ajout en dehors de .map */}
  <button type="button" onClick={addApartmentSpace} className="addButton">
    Add New {formData.type ? `${formData.type} ${getSpaceTypeName()}` : "Space"}
  </button>
</section>


        {renderLocationSection()}


    
        <section className="section">
          <h2>5. Amenities</h2>
          <div>
            <div className="amenitiesSection">
              <h3>Essential Amenities</h3>
              <div className="checkboxGroup">
                <label>
                  <input type="checkbox" name="WiFi" 
                    checked={formData.amenities.WiFi}
                    onChange={handleAmenitiesChange} /> WiFi
                </label>
                <label>
                  <input type="checkbox" name="Kitchen" 
                    checked={formData.amenities.Kitchen}
                    onChange={handleAmenitiesChange}/> Kitchen
                </label>
                <label>
                  <input type="checkbox" name="Washer" 
                    checked={formData.amenities.Washer}
                    onChange={handleAmenitiesChange} /> Washer
                </label>
                <label>
                  <input type="checkbox" name="Dryer" 
                    checked={formData.amenities.Dryer}
                    onChange={handleAmenitiesChange} /> Dryer
                </label>
                <label>
                  <input type="checkbox" name="Free_parking" 
                    checked={formData.amenities.Free_parking}
                    onChange={handleAmenitiesChange}/> Free parking
                </label>
                <label>
                  <input type="checkbox" name="Air_conditioning" 
                    checked={formData.amenities.Air_conditioning}
                    onChange={handleAmenitiesChange}/> Air conditioning
                </label>
    <label>
      <input type="checkbox" name="Heating" 
        checked={formData.amenities.Heating}
        onChange={handleAmenitiesChange} /> Heating
    </label>
    <label>
      <input type="checkbox" name="TV" 
        checked={formData.amenities.TV}
        onChange={handleAmenitiesChange}/> TV
    </label>
    <label>
      <input type="checkbox" name="Breakfast" 
        checked={formData.amenities.Breakfast}
        onChange={handleAmenitiesChange} /> Breakfast
    </label>
    <label>
      <input type="checkbox" name="Laptop_friendly_workspace" 
        checked={formData.amenities.Laptop_friendly_workspace}
        onChange={handleAmenitiesChange} /> Laptop-friendly workspace
    </label>
    <label>
      <input type="checkbox" name="Crib" 
        checked={formData.amenities.Crib}
        onChange={handleAmenitiesChange}/> Crib
    </label>
    <label>
      <input type="checkbox" name="Hair_dryer" 
        checked={formData.amenities.Hair_dryer}
        onChange={handleAmenitiesChange} /> Hair dryer
    </label>
    <label>
      <input type="checkbox" name="Iron" 
        checked={formData.amenities.Iron}
        onChange={handleAmenitiesChange}/> Iron
    </label>
    <label>
      <input type="checkbox" name="Essentials" 
        checked={formData.amenities.Essentials}
        onChange={handleAmenitiesChange} /> Essentials
    </label>
  </div>
</div>

<div className="amenitiesSection">
  <h3>Safety Features</h3>
  <div className="checkboxGroup">
    <label>
      <input type="checkbox" name="Smoke_alarm" 
        checked={formData.amenities.Smoke_alarm}
        onChange={handleAmenitiesChange} /> Smoke alarm
    </label>
    <label>
      <input type="checkbox" name="Carbon_monoxide_alarm" 
        checked={formData.amenities.Carbon_monoxide_alarm}
        onChange={handleAmenitiesChange} /> Carbon monoxide alarm
    </label>
    <label>
      <input type="checkbox" name="Fire_extinguisher" 
        checked={formData.amenities.Fire_extinguisher}
        onChange={handleAmenitiesChange} /> Fire extinguisher
    </label>
    <label>
      <input type="checkbox" name="First_aid_kit" 
        checked={formData.amenities.First_aid_kit}
        onChange={handleAmenitiesChange} /> First aid kit
    </label>
    <label>
      <input type="checkbox" name="Lock_on_bedroom_door" 
        checked={formData.amenities.Lock_on_bedroom_door}
        onChange={handleAmenitiesChange}/> Lock on bedroom door
    </label>
  </div>
</div>

<div className="amenitiesSection">
  <h3>Other Features</h3>
  <div className="checkboxGroup">
    <label>
      <input type="checkbox" name="Hangers" 
        checked={formData.amenities.Hangers}
        onChange={handleAmenitiesChange}/> Hangers
    </label>
    <label>
      <input type="checkbox" name="Shampoo" 
        checked={formData.amenities.Shampoo}
        onChange={handleAmenitiesChange}/> Shampoo
    </label>
    <label>
      <input type="checkbox" name="Garden_or_backyard" 
        checked={formData.amenities.Garden_or_backyard}
        onChange={handleAmenitiesChange}/> Garden or backyard
    </label>
    <label>
      <input type="checkbox" name="Patio_or_balcony" 
        checked={formData.amenities.Patio_or_balcony}
        onChange={handleAmenitiesChange} /> Patio or balcony
    </label>
    <label>
      <input type="checkbox" name="BBQ_grill" 
        checked={formData.amenities.BBQ_grill}
        onChange={handleAmenitiesChange}/> BBQ grill
    </label>
  </div>
</div>

</div>
        </section>
        <section className="section">
      <h2>6. Policies</h2>
      <div className="checkboxGroup">
        <label>
          <input 
            type="checkbox" 
            name="smoking"
            checked={formData.policies.smoking}
            onChange={handlePoliciesChange}
          />
          <MdOutlineSmokingRooms size={20} style={{ marginRight: '8px' }} />
          Smoking
        </label>

        <label>
          <input 
            type="checkbox" 
            name="pets"
            checked={formData.policies.pets}
            onChange={handlePoliciesChange} 
          />
          <MdOutlinePets size={20} style={{ marginRight: '8px' }} />
          Pets
        </label>

        <label>
          <input 
            type="checkbox" 
            name="parties_or_events"
            checked={formData.policies.parties_or_events}
            onChange={handlePoliciesChange} 
          />
          <GiPartyPopper size={20} style={{ marginRight: '8px' }} />
          Parties or Events
        </label>

        <label>
          <input 
            type="checkbox" 
            name="guests_allowed"
            checked={formData.policies.guests_allowed}
            onChange={handlePoliciesChange} 
          />
          <BsPersonRaisedHand size={20} style={{ marginRight: '8px' }} />
          Guests Allowed
        </label>
      </div>

      <div className={styles.twoColumnLayout}>
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Check-in Start <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              name="check_in_start"
              value={formData.policies.check_in_start}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.check_in_start'] && 
              <span className="error">{errors['policies.check_in_start']}</span>}
          </div>

          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Check-out Start <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              name="check_out_start"
              value={formData.policies.check_out_start}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.check_out_start'] && 
              <span className="error">{errors['policies.check_out_start']}</span>}
          </div>

          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Quiet Hours Start
            </label>
            <input
              type="time"
              name="quiet_hours_start"
              value={formData.policies.quiet_hours_start}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.quiet_hours_start'] && 
              <span className="error">{errors['policies.quiet_hours_start']}</span>}
          </div>
        </div>
        
        <div className={styles.column}>
          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Check-in End <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              name="check_in_end"
              value={formData.policies.check_in_end}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.check_in_end'] && 
              <span className="error">{errors['policies.check_in_end']}</span>}
          </div>

          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Check-out End <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              name="check_out_end"
              value={formData.policies.check_out_end}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.check_out_end'] && 
              <span className="error">{errors['policies.check_out_end']}</span>}
          </div>

          <div className="inputContainer">
            <label className={styles.label}>
              <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
              Quiet Hours End
            </label>
            <input
              type="time"
              name="quiet_hours_end"
              value={formData.policies.quiet_hours_end}
              onChange={handlePoliciesChange}
              onBlur={handleBlur}
            />
            {errors['policies.quiet_hours_end'] && 
              <span className="error">{errors['policies.quiet_hours_end']}</span>}
          </div>
        </div>
      </div>

      <div className="inputContainer">
        <label className={styles.label}>
          Cleaning Maintenance  <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          placeholder="Cleaning Maintenance"
          name="cleaning_maintenance"
          value={formData.policies.cleaning_maintenance}
          onChange={handlePoliciesChange}
          onBlur={handleBlur}
        />
        {errors['policies.cleaning_maintenance'] && 
          <span className="error">{errors['policies.cleaning_maintenance']}</span>}
      </div>

      <div className="inputContainer">
  <label className={styles.label}>
    Cancellation Policy <span className={styles.required}>*</span>
  </label>
  <select
    name="cancellation_policy"
    value={formData.policies.cancellation_policy || ""}
    onChange={handlePoliciesChange}
    onBlur={handleBlur}
    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
  >
    <option value="">Select a policy</option>
    <option value="Flexible - Full refund 1 day prior to arrival">Flexible - Full refund 1 day prior to arrival</option>
    <option value="Moderate - Full refund 5 days prior to arrival">Moderate - Full refund 5 days prior to arrival</option>
    <option value="Strict - 50% refund until 1 week prior to arrival">Strict - 50% refund until 1 week prior to arrival</option>
    <option value="Non-refundable">Non-refundable</option>
  </select>
  {errors['policies.cancellation_policy'] && 
    <span className="error">{errors['policies.cancellation_policy']}</span>}
</div>
    </section>
        <section className="section">
  <h2>7. Means of payment <span className={styles.required}>*</span> </h2>
  <p className="text-mutedd">
      Please check at least one payment method.
  </p>
  <div>
    <div className="checkboxGroup">
      <label>
        <input
          type="checkbox"
          name="credit card"
          onChange={handlePaymentChange}
        />
        <FaCreditCard size={20} style={{ marginRight: '8px' }} />
        Credit Card
      </label>

      <label>
        <input
          type="checkbox"
          name="debit card"
          onChange={handlePaymentChange}
        />
        <FaCreditCard size={20} style={{ marginRight: '8px' }} />
        Debit Card
      </label>

      <label>
        <input
          type="checkbox"
          name="cash"
          onChange={handlePaymentChange}
        />
        <FaMoneyBillAlt size={20} style={{ marginRight: '8px' }} />
        Cash
      </label>

      <label>
        <input
          type="checkbox"
          name="check"
          onChange={handlePaymentChange}
        />
        <CiMoneyCheck1 size={25} style={{ marginRight: '8px' }} />
        Check
      </label>

    </div>
    {submitAttempted && errors.paymentMethods && (
      <span className="error">{errors.paymentMethods}</span>
    )}
  </div>
</section>


        <section className="section"> 
  <h2>8. Contact</h2>
  <input
    type="text"
    placeholder="Phone"
    name="phone"
    value={formData.phone}
    onChange={handleChange}
    onBlur={handleBlur}
  />
  {errors.phone && <span className="error">{errors.phone}</span>}

  <input
    type="email"
    placeholder="Email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    onBlur={handleBlur}
  />
  {errors.email && <span className="error">{errors.email}</span>}

  <input
    type="text"
    placeholder="Website"
    name="website"
    value={formData.website}
    onChange={handleChange}
    onBlur={handleBlur}
  />
  {errors.website && <span className="error">{errors.website}</span>}
</section>
{renderNotification()}
  
<div className="flex justify-between mt-4">
  <button 
    type="button" 
    onClick={prevStep} 
    className="button"
  >
    Step 1: Create Your Account
  </button>
  <button 
    className="button" 
    type="submit" 
  >
    Step 3: Choose Payment Plan
  </button>
</div>
      </form>
      </div>
      </div>
    );
  };