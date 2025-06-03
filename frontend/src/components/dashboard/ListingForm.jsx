// app/dashboard/components/ListingForm.jsx
//import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './ListingForm.module.css';
import "./mainphoto.css";
import { FaCreditCard, FaPaypal, FaMoneyBillAlt, FaUniversity, FaMapMarkerAlt } from 'react-icons/fa';
import { CiMoneyCheck1 } from "react-icons/ci";
import { GiPartyPopper } from "react-icons/gi";
import { IoCalendarOutline } from "react-icons/io5";
import { BsPersonRaisedHand } from "react-icons/bs";
import { CalendarPicker } from "./CalendarPicker";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { FaStar } from 'react-icons/fa';
import { useFirebaseAuth } from './useFirebaseAuth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MdOutlineSmokingRooms, MdOutlinePets, MdOutlineMyLocation, MdMyLocation } from "react-icons/md";
//import styles from './label.module.css';
import React, { useCallback, useState, useEffect } from 'react';
import AvailabilityManager from './AvailabilityManager';
import "./mainphoto.css";

export default function ListingForm({ initialData, onSubmit, onCancel }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();
  
  const [firebaseUserId, setFirebaseUserId] = useState("");
  const [mapUrl, setMapUrl] = useState("https://maps.google.com/maps?q=0,0&z=15&output=embed");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    website: initialData?.website || '',
    description: initialData?.description || '',
    place: initialData?.place || '',
    type: initialData?.type || '',
    address: initialData?.address || '',
    country: initialData?.country || '',
    state: initialData?.state || '',
    city: initialData?.city || '',
    size: initialData?.size || '',
    lotSize: initialData?.lotSize || '',
    floorNumber: initialData?.floorNumber || '',
    numberOfBalconies: initialData?.numberOfBalconies || '',
    rooms: initialData?.rooms || '',
    bedrooms: initialData?.bedrooms || '',
    bathrooms: initialData?.bathrooms || '',
    maxGuest: initialData?.maxGuest || '',
    minNight: initialData?.minNight || '',
    maxNight: initialData?.maxNight || '',
    beds_Number: initialData?.beds_Number || '',
    amenities: initialData?.amenities || {
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
    policies: initialData?.policies || {
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
    means_of_payment: initialData?.means_of_payment || [],
    paymentMethods: initialData?.paymentMethods || {
      "credit card": false,
      "debit card": false,
      "paypal": false,
      "cash": false,
      "check": false,
      "bank transfer": false,
    },
  });
  
  const [mainPhotos, setMainPhotos] = useState([]);
  const [apartmentSpaces, setApartmentSpaces] = useState([
    { space_id: '', type: '', area: '', photos: [] }
  ]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentAvailability, setCurrentAvailability] = useState({
    start_time: "",
    end_time: "",
    price: "",
    touristTax: "",
  });

  const tabs = ['basic info', 'details', 'location', 'spaces', 'amenities', 'policies', 'payment'];
  const [currentTab, setCurrentTab] = useState(tabs[0]);
  const [errors, setErrors] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  useEffect(() => {
    if (user && user.uid) {
      setFirebaseUserId(user.uid);
      console.log("Firebase UID récupéré:", user.uid);
    } else {
      const savedId = localStorage.getItem('firebaseUserId');
      if (savedId) {
        setFirebaseUserId(savedId);
        console.log("Firebase UID récupéré du localStorage:", savedId);
      }
    }
  }, [user, loading]);

  useEffect(() => {
    const updateMap = () => {
      let locationQuery = '';
      
      if (formData.address && formData.city && formData.state) {
        locationQuery = `${formData.address}, ${formData.city}, ${formData.state}`;
      } else if (formData.city && formData.state) {
        locationQuery = `${formData.city}, ${formData.state}`;
      } else if (formData.city) {
        locationQuery = formData.city;
      } else if (formData.state) {
        locationQuery = formData.state;
      } else if (formData.address) {
        locationQuery = formData.address;
      }
      
      if (locationQuery) {
        const encodedQuery = encodeURIComponent(locationQuery);
        setMapUrl(`https://maps.google.com/maps?q=${encodedQuery}&z=15&output=embed`);
      }
    };
    
    const timeoutId = setTimeout(updateMap, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.address, formData.city, formData.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const category = name.split('.')[0];
      const field = name.split('.')[1];
      
      setFormData({
        ...formData,
        [category]: {
          ...formData[category],
          [field]: checked
        }
      });
  
      // Clear payment error when a payment method checkbox is selected
      if (category === 'paymentMethods') {
        setErrors(prev => ({
          ...prev,
          paymentMethods: ''
        }));
      }
    } else {
      setFormData({
        ...formData,
        [name]: ['price', 'bedrooms', 'bathrooms', 'size', 'lotSize', 'rooms', 'touristTax', 'maxGuest', 'minNight', 'maxNight', 'beds_Number', 'floorNumber', 'numberOfBalconies'].includes(name)
          ? Number(value) 
          : value
      });
    }

    // Clear payment error when a method is selected
    if (checked) {
      setErrors(prev => ({
        ...prev,
        paymentMethods: ''
      }));
    }
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

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setMapUrl(`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Impossible d'obtenir votre position actuelle. Veuillez vérifier vos paramètres de localisation.");
          setIsLoadingLocation(false);
        }
      );
    } else {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      setIsLoadingLocation(false);
    }
  };

  const handlePoliciesChange = (e) => {
    const { name, type, checked, value } = e.target;
  
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      setFormData((prevState) => ({
        ...prevState,
        [parent]: {
          ...prevState[parent],
          [child]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        policies: {
          ...prevState.policies,
          [name]: type === "checkbox" ? checked : value,
        },
      }));
    }
  };

  const handleMainPhotoUpload = (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setMainPhotos([...mainPhotos, file]);
  };

  const addApartmentSpace = () => {
    setApartmentSpaces([
      ...apartmentSpaces,
      { space_id: '', type: '', area: '', photos: [] },
    ]);
  };

  const removeApartmentSpace = (indexToRemove) => {
    setApartmentSpaces((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApartmentSpaceChange = (index, event) => {
    const { name, value } = event.target;
    const updatedSpaces = apartmentSpaces.map((space, spaceIndex) =>
      spaceIndex === index
        ? { ...space, [name]: value }
        : space
    );
    setApartmentSpaces(updatedSpaces);
  };

  const addPhotoToSpace = (spaceIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos.push(file);
    setApartmentSpaces(updatedSpaces);
  };

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setCurrentAvailability((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddAvailability = () => {
    setAvailabilities((prevAvailabilities) => [
      ...prevAvailabilities,
      currentAvailability,
    ]);
    setCurrentAvailability({ start_time: "", end_time: "", price: "",touristTax: "", });
  };

  const handleDateSelect = (range) => {
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);

    const start_time = new Date(start.setHours(0, 0, 0, 0)).toISOString();
    const end_time = new Date(end.setDate(end.getDate() + 1)).toISOString();

    setCurrentAvailability((prevData) => ({
      ...prevData,
      start_time,
      end_time,
      touristTax: prevData.touristTax || '',
    }));
  };

  const MainPhotoPreview = ({ photos, onRemove }) => {
    return (
      <div className="main-photos-grid">
        {photos.map((photo, index) => (
          <div key={index} className="photo-preview-container">
            <div className="photo-preview">
              {/* Check if the photo is a File object or a URL string */}
              <img 
                src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)} 
                alt={`Main property preview ${index + 1}`} 
                className="preview-image"
              />
              <button
                type="button"
                className="remove-photo-btn"
                onClick={() => onRemove(index)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // And for the apartment spaces photos:
  const SpacePhotoPreview = ({ photos, spaceIndex, onRemove }) => {
    return (
      <div className="space-photos-grid">
        {photos.map((photo, photoIndex) => (
          <div key={photoIndex} className="photo-preview-container">
            <div className="photo-preview">
              {/* Check if the photo is a File object or a URL string */}
              <img 
                src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)} 
                alt={`Space ${spaceIndex + 1} preview ${photoIndex + 1}`} 
                className="preview-image"
              />
              <button
                type="button"
                className="remove-photo-btn"
                onClick={() => onRemove(spaceIndex, photoIndex)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const shouldShowLotSize = () => {
    return formData.type !== "Appartement";
  };
  
  const shouldShowFloor = () => {
    return formData.type === "Appartement";
  };

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

  const validateCurrentTab = () => {
    const newErrors = {};
    let isValid = true;

    switch(currentTab) {
      case 'basic info':
        if (!formData.title) {
          newErrors.title = 'Title is required';
          isValid = false;
        }
        if (!formData.place) {
          newErrors.place = 'Place is required';
          isValid = false;
        }
        if (!formData.description) {
          newErrors.description = 'Description is required';
          isValid = false;
        }
        if (!formData.type) {
          newErrors.type = 'Property type is required';
          isValid = false;
        }
        if (!formData.phone) {
          newErrors.phone = 'Phone is required';
          isValid = false;
        }
        if (!formData.email) {
          newErrors.email = 'Email is required';
          isValid = false;
        }
        break;
      case 'details':
        if (!formData.size) {
          newErrors.size = 'Size is required';
          isValid = false;
        }
        if (!formData.rooms) {
          newErrors.rooms = 'Number of rooms is required';
          isValid = false;
        }
        if (!formData.bedrooms) {
          newErrors.bedrooms = 'Bedrooms is required';
          isValid = false;
        }
        if (!formData.bathrooms) {
          newErrors.bathrooms = 'Bathrooms is required';
          isValid = false;
        }
        if (!formData.beds_Number) {
          newErrors.beds_Number = 'Number of beds is required';
          isValid = false;
        }
        if (!formData.maxGuest) {
          newErrors.maxGuest = 'Maximum guests is required';
          isValid = false;
        }
        if (!formData.minNight) {
          newErrors.minNight = 'Minimum nights is required';
          isValid = false;
        }
        if (!formData.maxNight) {
          newErrors.maxNight = 'Maximum nights is required';
          isValid = false;
        }
        if (mainPhotos.length < 3) {
          newErrors.mainPhotos = 'Minimum 3 photos required';
          isValid = false;
        }
        break;
      case 'location':
        if (!formData.address) {
          newErrors.address = 'Address is required';
          isValid = false;
        }
        if (!formData.city) {
          newErrors.city = 'City is required';
          isValid = false;
        }
        if (!formData.state) {
          newErrors.state = 'State is required';
          isValid = false;
        }
        if (!formData.country) {
          newErrors.country = 'Country is required';
          isValid = false;
        }
        break;
      case 'spaces':
        if (apartmentSpaces.length === 0) {
          newErrors.spaces = 'At least one space is required';
          isValid = false;
        } else {
          apartmentSpaces.forEach((space, index) => {
            if (!space.space_id) {
              newErrors[`space_id_${index}`] = 'Space ID is required';
              isValid = false;
            }
            if (!space.type) {
              newErrors[`type_${index}`] = 'Type is required';
              isValid = false;
            }
            if (!space.area) {
              newErrors[`area_${index}`] = 'Area is required';
              isValid = false;
            }
            if (space.photos.length === 0) {
              newErrors[`photos_${index}`] = 'At least one photo is required';
              isValid = false;
            }
          });
        }
        break;
      case 'payment':
        if (formData.means_of_payment.length === 0) {
          newErrors.paymentMethods = 'Please select at least one payment method';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateBasicInfoTab = () => {
    const newErrors = {};
    let isValid = true;
    
    if (!formData.title) {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    if (!formData.place) {
      newErrors.place = 'Place is required';
      isValid = false;
    }
    if (!formData.description) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    if (!formData.type) {
      newErrors.type = 'Property type is required';
      isValid = false;
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone is required';
      isValid = false;
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };
  
  const validateDetailsTab = () => {
    const newErrors = {};
    let isValid = true;
    
    if (!formData.size) {
      newErrors.size = 'Size is required';
      isValid = false;
    }
    if (!formData.rooms) {
      newErrors.rooms = 'Number of rooms is required';
      isValid = false;
    }
    if (!formData.bedrooms) {
      newErrors.bedrooms = 'Bedrooms is required';
      isValid = false;
    }
    if (!formData.bathrooms) {
      newErrors.bathrooms = 'Bathrooms is required';
      isValid = false;
    }
    if (!formData.beds_Number) {
      newErrors.beds_Number = 'Number of beds is required';
      isValid = false;
    }
    if (!formData.maxGuest) {
      newErrors.maxGuest = 'Maximum guests is required';
      isValid = false;
    }
    if (!formData.minNight) {
      newErrors.minNight = 'Minimum nights is required';
      isValid = false;
    }
    if (!formData.maxNight) {
      newErrors.maxNight = 'Maximum nights is required';
      isValid = false;
    }
    if (mainPhotos.length < 3) {
      newErrors.mainPhotos = 'Minimum 3 photos required';
      isValid = false;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const validateLocationTab = () => {
    const newErrors = {};
    let isValid = true;
    
    if (!formData.address) {
      newErrors.address = 'Address is required';
      isValid = false;
    }
    if (!formData.city) {
      newErrors.city = 'City is required';
      isValid = false;
    }
    if (!formData.state) {
      newErrors.state = 'State is required';
      isValid = false;
    }
    if (!formData.country) {
      newErrors.country = 'Country is required';
      isValid = false;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const validateSpacesTab = () => {
    const newErrors = {};
    let isValid = true;
    
    if (apartmentSpaces.length === 0) {
      newErrors.spaces = 'At least one space is required';
      isValid = false;
    } else {
      apartmentSpaces.forEach((space, index) => {
        if (!space.space_id) {
          newErrors[`space_id_${index}`] = 'Space ID is required';
          isValid = false;
        }
        if (!space.type) {
          newErrors[`type_${index}`] = 'Type is required';
          isValid = false;
        }
        if (!space.area) {
          newErrors[`area_${index}`] = 'Area is required';
          isValid = false;
        }
        if (space.photos.length === 0) {
          newErrors[`photos_${index}`] = 'At least one photo is required';
          isValid = false;
        }
      });
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const handlePaymentChange = (e) => {
    const { name, checked } = e.target;
    
    setFormData(prevState => {
      const updatedPaymentMethods = {
        ...prevState.paymentMethods,
        [name]: checked,
      };
      
      const updatedMeansOfPayment = Object.entries(updatedPaymentMethods)
        .filter(([_, isChecked]) => isChecked)
        .map(([method]) => method);
  
      return {
        ...prevState,
        paymentMethods: updatedPaymentMethods,
        means_of_payment: updatedMeansOfPayment,
      };
    });
  
    if (Object.values(formData.paymentMethods).some(Boolean) || checked) {
      setErrors(prev => ({
        ...prev,
        paymentMethods: ''
      }));
    }
  };

  const validatePaymentTab = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    // Check if at least one payment method is selected
    if (!formData.means_of_payment || formData.means_of_payment.length === 0) {
      newErrors.paymentMethods = 'Please select at least one payment method';
      isValid = false;
    } else {
      newErrors.paymentMethods = '';
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const validateAllTabs = () => {
    const basicInfoValid = validateBasicInfoTab();
    const detailsValid = validateDetailsTab();
    const locationValid = validateLocationTab();
    const spacesValid = validateSpacesTab();
    const paymentValid = validatePaymentTab();
    
    return basicInfoValid && detailsValid && locationValid && spacesValid && paymentValid;
  };

  const [deletedMainPhotos, setDeletedMainPhotos] = useState([]);
  const [deletedSpacePhotos, setDeletedSpacePhotos] = useState([]);

  // When initializing from initialData, update your state setup:
  useEffect(() => {
    if (initialData) {
      // Set form data from initialData...
  
      setFormData(prev => ({
        ...prev,
        // ... other fields
        means_of_payment: initialData.means_of_payment || [],
        // ... other fields
      }));
      
      // If you're using a separate state for payment methods
      if (initialData.means_of_payment?.length > 0) {
        setPaymentMethods(initialData.means_of_payment);
      }
      
      // Handle main photos
      if (initialData.mainPhotos && initialData.mainPhotos.length > 0) {
        // If editing, these will be URLs not files
        setMainPhotos(initialData.mainPhotos);
      }
      
      // Handle apartment spaces
      if (initialData.apartmentSpaces && initialData.apartmentSpaces.length > 0) {
        setApartmentSpaces(initialData.apartmentSpaces);
      } else {
        setApartmentSpaces([{ space_id: '', type: '', area: '', photos: [] }]);
      }
    }
  }, [initialData]);

  // Update the removeMainPhoto function to track deleted Firebase URLs
  const removeMainPhoto = (index) => {
    const photoToRemove = mainPhotos[index];
    const updatedPhotos = [...mainPhotos];
    updatedPhotos.splice(index, 1);
    setMainPhotos(updatedPhotos);
    
    // If this is a Firebase URL (string), add it to deletedMainPhotos
    if (typeof photoToRemove === 'string' && photoToRemove.includes('firebasestorage.googleapis.com')) {
      setDeletedMainPhotos([...deletedMainPhotos, photoToRemove]);
    }
  };

  // Update the removeSpacePhoto function to track deleted Firebase URLs
  const removeSpacePhoto = (spaceIndex, photoIndex) => {
    const space = apartmentSpaces[spaceIndex];
    const photoToRemove = space.photos[photoIndex];
    
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos.splice(photoIndex, 1);
    setApartmentSpaces(updatedSpaces);
    
    // If this is a Firebase URL (string), add it to deletedSpacePhotos
    if (typeof photoToRemove === 'string' && photoToRemove.includes('firebasestorage.googleapis.com')) {
      setDeletedSpacePhotos([...deletedSpacePhotos, {
        spaceId: space.space_id,
        photoUrl: photoToRemove
      }]);
    }
  };

  // Add this function before the handleSubmit function
  const uploadFileToFirebase = async (file, path) => {
    if (!file) return null;
    
    const storage = getStorage();
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${file.name.replace(/\s/g, '_')}`;
    const storageRef = ref(storage, `${path}/${uniqueFileName}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

// Updated handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Validate all form fields
  if (!validateAllTabs()) {
    // Find the first tab with errors and navigate to it
    if (errors.title || errors.place || errors.description || errors.type || errors.phone || errors.email) {
      setCurrentTab('basic info');
    } else if (errors.size || errors.rooms || errors.bedrooms || errors.bathrooms || 
              errors.beds_Number || errors.maxGuest || errors.minNight || errors.maxNight || 
              errors.mainPhotos) {
      setCurrentTab('details');
    } else if (errors.address || errors.city || errors.state || errors.country) {
      setCurrentTab('location');
    } else if (errors.spaces || Object.keys(errors).some(key => key.startsWith('space_'))) {
      setCurrentTab('spaces');
    } else if (errors.paymentMethods) {
      setCurrentTab('payment');
    }
    
    setIsSubmitting(false);
    toast.error('Please complete all required fields');
    return;
  }
  
  if (loading) {
    console.error('Authentication loading in progress...');
    setIsSubmitting(false);
    return;
  }
  
  if (!firebaseUserId) {
    console.error('Firebase ID not available, you must be logged in');
    toast.error('You must be logged in to create a property');
    setIsSubmitting(false);
    return;
  }

  try {
    // Show loading toast
    const loadingToastId = toast.loading("Uploading images ...", {
      autoClose: false, // Keep open until we manually close it
    });

    // 1. Upload main photos to Firebase Storage and get download URLs
    const mainPhotoUrls = [];
    for (const photo of mainPhotos) {
      // Skip if photo is already a URL string (occurs when editing)
      if (typeof photo === 'string') {
        mainPhotoUrls.push(photo);
        continue;
      }
      const downloadURL = await uploadFileToFirebase(photo, `properties/${firebaseUserId}/main`);
      mainPhotoUrls.push(downloadURL);
    }

    // 2. Upload apartment space photos to Firebase Storage
    const apartmentSpacesWithUrls = await Promise.all(
      apartmentSpaces.map(async (space, index) => {
        // Upload each photo in the space
        const photoUrls = await Promise.all(
          (space.photos || []).map(async (photo) => {
            // Skip if photo is already a URL string (occurs when editing)
            if (typeof photo === 'string') {
              return photo;
            }
            return uploadFileToFirebase(photo, `properties/${firebaseUserId}/spaces/${space.space_id || `space-${index}`}`);
          })
        );

        return {
          space_id: space.space_id || `space-${index}-${Date.now()}`,
          type: space.type || '',
          area: !isNaN(parseFloat(space.area)) ? parseFloat(space.area) : 0,
          photos: photoUrls.filter(url => url) // Filter out any nulls
        };
      })
    );

    // Update loading message
    toast.update(loadingToastId, {
      render: "Saving property data...",
      type: "info",  
      isLoading: true,
      autoClose: 3000,
    });

    // Prepare the property data with Firebase Storage URLs
    const propertyData = {
      firebaseUid: firebaseUserId, 
      title: formData.title?.trim() || '',
      place: formData.place?.trim() || '',
      description: formData.description?.trim() || '',
      availabilities: availabilities.map(avail => ({
        start_time: avail.start_time || '',
        end_time: avail.end_time || '',
        price: !isNaN(parseFloat(avail.price)) && avail.price > 0 ? parseFloat(avail.price) : 0,
        touristTax: !isNaN(parseFloat(avail.touristTax)) && avail.touristTax > 0 ? parseFloat(avail.touristTax) : 0,
      })),
      mainPhotos: mainPhotoUrls, // Use the Firebase Storage URLs instead of file objects
      type: formData.type?.trim() || '',
      apartmentSpaces: apartmentSpacesWithUrls, // Use spaces with Firebase URLs
      address: formData.address?.trim() || '',
      country: formData.country?.trim() || '',
      state: formData.state?.trim() || '',
      city: formData.city?.trim() || '',
      size: isNaN(parseFloat(formData.size)) ? 0 : parseFloat(formData.size),
      lotSize: isNaN(parseFloat(formData.lotSize)) ? 0 : parseFloat(formData.lotSize),
      floorNumber: isNaN(parseInt(formData.floorNumber, 10)) ? 0 : parseInt(formData.floorNumber, 10),
      numberOfBalconies: isNaN(parseInt(formData.numberOfBalconies, 10)) ? 0 : parseInt(formData.numberOfBalconies, 10),
      rooms: isNaN(parseInt(formData.rooms, 10)) ? 0 : parseInt(formData.rooms, 10),
      bedrooms: isNaN(parseInt(formData.bedrooms, 10)) ? 0 : parseInt(formData.bedrooms, 10),
      bathrooms: isNaN(parseInt(formData.bathrooms, 10)) ? 0 : parseInt(formData.bathrooms, 10),
      beds_Number: isNaN(parseInt(formData.beds_Number, 10)) ? 0 : parseInt(formData.beds_Number, 10),
      maxGuest: isNaN(parseInt(formData.maxGuest, 10)) ? 0 : parseInt(formData.maxGuest, 10),
      minNight: isNaN(parseInt(formData.minNight, 10)) ? 0 : parseInt(formData.minNight, 10),
      maxNight: isNaN(parseInt(formData.maxNight, 10)) ? 0 : parseInt(formData.maxNight, 10),
      amenities: {
        WiFi: Boolean(formData.amenities?.WiFi),
        Kitchen: Boolean(formData.amenities?.Kitchen),
        Washer: Boolean(formData.amenities?.Washer),
        Dryer: Boolean(formData.amenities?.Dryer),
        Free_parking: Boolean(formData.amenities?.Free_parking),
        Air_conditioning: Boolean(formData.amenities?.Air_conditioning),
        Heating: Boolean(formData.amenities?.Heating),
        TV: Boolean(formData.amenities?.TV),
        Breakfast: Boolean(formData.amenities?.Breakfast),
        Laptop_friendly_workspace: Boolean(formData.amenities?.Laptop_friendly_workspace),
        Crib: Boolean(formData.amenities?.Crib),
        Hair_dryer: Boolean(formData.amenities?.Hair_dryer),
        Iron: Boolean(formData.amenities?.Iron),
        Essentials: Boolean(formData.amenities?.Essentials),
        Smoke_alarm: Boolean(formData.amenities?.Smoke_alarm),
        Carbon_monoxide_alarm: Boolean(formData.amenities?.Carbon_monoxide_alarm),
        Fire_extinguisher: Boolean(formData.amenities?.Fire_extinguisher),
        First_aid_kit: Boolean(formData.amenities?.First_aid_kit),
        Lock_on_bedroom_door: Boolean(formData.amenities?.Lock_on_bedroom_door),
        Hangers: Boolean(formData.amenities?.Hangers),
        Shampoo: Boolean(formData.amenities?.Shampoo),
        Garden_or_backyard: Boolean(formData.amenities?.Garden_or_backyard),
        Patio_or_balcony: Boolean(formData.amenities?.Patio_or_balcony),
        BBQ_grill: Boolean(formData.amenities?.BBQ_grill),
      },
      policies: {
        smoking: formData.policies?.smoking ?? false,
        pets: formData.policies?.pets ?? false,
        parties_or_events: formData.policies?.parties_or_events ?? false,
        check_in_start: formData.policies?.check_in_start ?? '',
        check_in_end: formData.policies?.check_in_end ?? '',
        check_out_start: formData.policies?.check_out_start ?? '',
        check_out_end: formData.policies?.check_out_end ?? '',
        quiet_hours_start: formData.policies?.quiet_hours_start ?? '',
        quiet_hours_end: formData.policies?.quiet_hours_end ?? '',
        cleaning_maintenance: formData.policies?.cleaning_maintenance ?? '',
        cancellation_policy: formData.policies?.cancellation_policy ?? '',
        guests_allowed: formData.policies?.guests_allowed ?? false,
      },
      means_of_payment: formData.means_of_payment || [],
      phone: formData.phone ?? '',
      email: formData.email ?? '',
      website: formData.website ?? '',
    };

    // Send the property data with Firebase URLs to the server
    const response = await axios.post('http://localhost:3000/properties', propertyData, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Close loading toast and show success
    toast.dismiss(loadingToastId);
    toast.success('Property created successfully!');
    
    // Redirect after 2 seconds
    setTimeout(() => {
      router.push(`http://localhost:3002/MyWebsite/property/view/${response.data.id}`);
    }, 2000);
    
  } catch (error) {
    console.error('Error submitting form:', error);
    toast.error('Error creating property. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

const renderAvailability = () => {
  const handleAvailabilitiesChange = useCallback((newAvailabilities) => {
    setAvailabilities(newAvailabilities);
    setFormData(prev => ({
      ...prev,
      availabilities: newAvailabilities
    }));
  }, [setFormData]);

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

const renderLocationSection = () => {
  return (
    <section className="section"> 
      <h2>Location</h2>
      
      <input
        className="fullWidth"
        type="text"
        placeholder="Address"
        name="address"
        value={formData.address || ''}
        onChange={handleChange}
        required
      />
      {errors.address && <span className="error">{errors.address}</span>}

      <input
        type="text"
        placeholder="Country"
        name="country"
        value={formData.country || ''}
        onChange={handleChange}
        required
      />
      {errors.country && <span className="error">{errors.country}</span>}

      <input
        type="text"
        placeholder="State"
        name="state"
        value={formData.state || ''}
        onChange={handleChange}
        required
      />
      {errors.state && <span className="error">{errors.state}</span>}

      <input
        type="text"
        placeholder="City"
        name="city"
        value={formData.city || ''}
        onChange={handleChange}
        required
      />
      {errors.city && <span className="error">{errors.city}</span>}
      
      <div className="locationControls">
        <button 
          type="button" 
          className="locationButton"
          onClick={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          <MdMyLocation size={18} style={{ marginRight: '5px' }} />
          {isLoadingLocation ? 'Loading...' : 'Use my current location'}
        </button>
      </div>
      
      <div className="mapContainer">
        <iframe
          title="Location"
          src={mapUrl || ''}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </section>
  );
};

const renderBasicTab = () => (
  <div className={styles.tabContent}>
    <h3>Basic Information</h3>
    <div className={styles.formGroup}>
      <label>Title*</label>
      <input
        type="text"
        name="title"
        value={formData.title || ''}
        onChange={handleChange}
        required
      />
      {errors.title && <span className={styles.error}>{errors.title}</span>}
    </div>

    <div className={styles.formGroup}>
      <label>Description*</label>
      <textarea
        name="description"
        value={formData.description || ''}
        onChange={handleChange}
        rows={4}
        required
      />
      {errors.description && <span className={styles.error}>{errors.description}</span>}
    </div>

    <div className={styles.formGroup}>
      <label>Property Type*</label>
      <select
        name="type"
        value={formData.type || ''}
        onChange={handleChange}
        required
      >
        <option value="">Select type</option>
        <option value="Hotel">Hotel</option>
        <option value="Appartement">Appartement</option>
        <option value="Villa">Villa</option>
        <option value="Room">Room</option>
        <option value="Cabin">Cabin</option>
      </select>
      {errors.type && <span className={styles.error}>{errors.type}</span>}
    </div>
  </div>
);

const renderContactTab = () => (
  <div className={styles.tabContent}>
    <h3>Contact Information</h3>
    
    <div className={styles.formGroup}>
      <label>Phone*</label>
      <input
        type="text"
        name="phone"
        value={formData.phone || ''}
        onChange={handleChange}
        required
      />
      {errors.phone && <span className={styles.error}>{errors.phone}</span>}
    </div>

    <div className={styles.formGroup}>
      <label>Email*</label>
      <input
        type="email"
        name="email"
        value={formData.email || ''}
        onChange={handleChange}
        required
      />
      {errors.email && <span className={styles.error}>{errors.email}</span>}
    </div>

    <div className={styles.formGroup}>
      <label>Website</label>
      <input
        type="text"
        name="website"
        value={formData.website || ''}
        onChange={handleChange}
      />
    </div>
  </div>
);

const renderDetailsTab = () => (
  <div className={styles.tabContent}>
    <h3>Property Details</h3>
    <div className={styles.twoColumnLayout}>
      <div className={styles.column}>
        <div className={styles.formGroup}>
          <label>Living area (m²)*</label>
          <input
            type="number"
            name="size"
            value={formData.size || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.size && <span className={styles.error}>{errors.size}</span>}
        </div>

        {shouldShowFloor() && (
          <div className={styles.formGroup}>
            <label>Floor Number*</label>
            <input
              type="number"
              name="floorNumber"
              value={formData.floorNumber || ''}
              onChange={handleChange}
              min="1"
              required
            />
            {errors.floorNumber && <span className={styles.error}>{errors.floorNumber}</span>}
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Number of rooms*</label>
          <input
            type="number"
            name="rooms"
            value={formData.rooms || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.rooms && <span className={styles.error}>{errors.rooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Bathrooms*</label>
          <input
            type="number"
            name="bathrooms"
            value={formData.bathrooms || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.bathrooms && <span className={styles.error}>{errors.bathrooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Maximum capacity (guests)*</label>
          <input
            type="number"
            name="maxGuest"
            value={formData.maxGuest || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.maxGuest && <span className={styles.error}>{errors.maxGuest}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Maximum nights*</label>
          <input
            type="number"
            name="maxNight"
            value={formData.maxNight || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.maxNight && <span className={styles.error}>{errors.maxNight}</span>}
        </div>
      </div>

      <div className={styles.column}>
        {shouldShowLotSize() && (
          <div className={styles.formGroup}>
            <label>Total land area (m²)*</label>
            <input
              type="number"
              name="lotSize"
              value={formData.lotSize || ''}
              onChange={handleChange}
              min="1"
              required
            />
            {errors.lotSize && <span className={styles.error}>{errors.lotSize}</span>}
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Number of Balconies*</label>
          <input
            type="number"
            name="numberOfBalconies"
            value={formData.numberOfBalconies || ''}
            onChange={handleChange}
            min="0"
            required
          />
          {errors.numberOfBalconies && <span className={styles.error}>{errors.numberOfBalconies}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Bedrooms*</label>
          <input
            type="number"
            name="bedrooms"
            value={formData.bedrooms || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.bedrooms && <span className={styles.error}>{errors.bedrooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Number of beds*</label>
          <input
            type="number"
            name="beds_Number"
            value={formData.beds_Number || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.beds_Number && <span className={styles.error}>{errors.beds_Number}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Minimum nights*</label>
          <input
            type="number"
            name="minNight"
            value={formData.minNight || ''}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.minNight && <span className={styles.error}>{errors.minNight}</span>}
        </div>
      </div>
    </div>
    {renderAvailability()}
  </div>
);

const renderPhotosTab = () => (
  <div className={styles.tabContent}>
    <h3>Property Photos</h3>
    <div className={styles.formGroup}>
      <label>Main Photos (Minimum 2)*</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleMainPhotoUpload}
        style={{ display: 'none' }}
        id="mainPhotoInput"
      />
      <button
        type="button"
        onClick={() => document.getElementById('mainPhotoInput').click()}
        className={styles.uploadButton}
      >
        Choose File
      </button>

      <div className={styles.photoGrid}>
        {mainPhotos && mainPhotos.map((photo, photoIndex) => (
          <div key={photoIndex} className="photo-preview-container">
            <div className="photo-preview">
              <img 
                src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)} 
                alt={`Property preview ${photoIndex + 1}`} 
                className="preview-image"
              />
              <button
                type="button"
                className="remove-photo-btn"
                onClick={() => removeMainPhoto(photoIndex)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {(!mainPhotos || mainPhotos.length < 2) && <span className={styles.error}>Minimum 2 photos required</span>}
    </div>
  </div>
);

const renderSpacesTab = () => (
  <div className={styles.tabContent}>
    <h3>{formData.type ? `${formData.type} ${getSpaceTypeName()}s` : "Property Spaces"}</h3>

    {apartmentSpaces && apartmentSpaces.map((space, index) => (
      <div key={index} className={styles.spaceContainer}>
        <div className={styles.twoColumnLayout}>
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label>Space ID*</label>
              <input
                type="text"
                name="space_id"
                placeholder="Space ID"
                value={space.space_id || ''}
                onChange={(e) => handleApartmentSpaceChange(index, e)}
                required
              />
              {errors[`space_id_${index}`] && <span className={styles.error}>{errors[`space_id_${index}`]}</span>}
            </div>
          </div>
          
          <div className={styles.column}>
            <div className={styles.formGroup}>
              <label>Type*</label>
              <input
                type="text"
                name="type"
                placeholder="Type"
                value={space.type || ''}
                onChange={(e) => handleApartmentSpaceChange(index, e)}
                required
              />
              {errors[`type_${index}`] && <span className={styles.error}>{errors[`type_${index}`]}</span>}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Area (sqm)*</label>
          <input
            type="text"
            name="area"
            placeholder="Area (sqm)"
            value={space.area || ''}
            onChange={(e) => handleApartmentSpaceChange(index, e)}
            required
          />
          {errors[`area_${index}`] && <span className={styles.error}>{errors[`area_${index}`]}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Photos*</label>
          <input
            type="file"
            id={`space-${index}-photo-input`}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => addPhotoToSpace(index, e)}
          />
          <button 
            type="button"
            onClick={() => document.getElementById(`space-${index}-photo-input`).click()}
          >
            Choose File
          </button>

          <div className={styles.photoGrid}>
            {space.photos && space.photos.map((photo, photoIndex) => (
              <div key={photoIndex} className={styles.photoPreview}>
                <img
                  src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                  alt={`Space photo ${photoIndex + 1}`}
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  onClick={() => removeSpacePhoto(index, photoIndex)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {(!space.photos || space.photos.length === 0) && <span className={styles.error}>At least one photo is required</span>}
        </div>

        {index > 0 && (
          <button
            type="button"
            onClick={() => removeApartmentSpace(index)}
            className={styles.removeButton}
          >
            Remove Space
          </button>
        )}
      </div>
    ))}

    <button type="button" onClick={addApartmentSpace} className={styles.addButton}>
      Add New {formData.type ? `${formData.type} ${getSpaceTypeName()}` : "Space"}
    </button>
  </div>
);

const renderAmenitiesTab = () => (
  <div className={styles.tabContent}>
    <h3>Amenities</h3>
    
    <div className={styles.amenitiesSection}>
      <h4>Essential Amenities</h4>
      <div className={styles.checkboxGroup}>
        {Object.entries({
          WiFi: 'WiFi',
          Kitchen: 'Kitchen',
          Washer: 'Washer',
          Dryer: 'Dryer',
          Free_parking: 'Free parking',
          Air_conditioning: 'Air conditioning',
          Heating: 'Heating',
          TV: 'TV',
          Breakfast: 'Breakfast',
          Laptop_friendly_workspace: 'Laptop-friendly workspace',
          Crib: 'Crib',
          Hair_dryer: 'Hair dryer',
          Iron: 'Iron',
          Essentials: 'Essentials'
        }).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              name={key}
              checked={formData.amenities?.[key] || false}
              onChange={handleAmenitiesChange}
            />
            {label}
          </label>
        ))}
      </div>
    </div>

    <div className={styles.amenitiesSection}>
      <h4>Safety Features</h4>
      <div className={styles.checkboxGroup}>
        {Object.entries({
          Smoke_alarm: 'Smoke alarm',
          Carbon_monoxide_alarm: 'Carbon monoxide alarm',
          Fire_extinguisher: 'Fire extinguisher',
          First_aid_kit: 'First aid kit',
          Lock_on_bedroom_door: 'Lock on bedroom door'
        }).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              name={key}
              checked={formData.amenities?.[key] || false}
              onChange={handleAmenitiesChange}
            />
            {label}
          </label>
        ))}
      </div>
    </div>

    <div className={styles.amenitiesSection}>
      <h4>Other Features</h4>
      <div className={styles.checkboxGroup}>
        {Object.entries({
          Hangers: 'Hangers',
          Shampoo: 'Shampoo',
          Garden_or_backyard: 'Garden or backyard',
          Patio_or_balcony: 'Patio or balcony',
          BBQ_grill: 'BBQ grill'
        }).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              name={key}
              checked={formData.amenities?.[key] || false}
              onChange={handleAmenitiesChange}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  </div>
);

const renderPoliciesTab = () => (
  <div className={styles.tabContent}>
    <h3>Policies</h3>
    
    <div className={styles.checkboxGroup}>
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
        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Check-in Start*
          </label>
          <input
            type="time"
            name="check_in_start"
            value={formData.policies.check_in_start}
            onChange={handlePoliciesChange}
            required
          />
          {errors['policies.check_in_start'] && <span className={styles.error}>{errors['policies.check_in_start']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Check-out Start*
          </label>
          <input
            type="time"
            name="check_out_start"
            value={formData.policies.check_out_start}
            onChange={handlePoliciesChange}
            required
          />
          {errors['policies.check_out_start'] && <span className={styles.error}>{errors['policies.check_out_start']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Quiet Hours Start
          </label>
          <input
            type="time"
            name="quiet_hours_start"
            value={formData.policies.quiet_hours_start}
            onChange={handlePoliciesChange}
          />
        </div>
      </div>
      
      <div className={styles.column}>
        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Check-in End*
          </label>
          <input
            type="time"
            name="check_in_end"
            value={formData.policies.check_in_end}
            onChange={handlePoliciesChange}
            required
          />
          {errors['policies.check_in_end'] && <span className={styles.error}>{errors['policies.check_in_end']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Check-out End*
          </label>
          <input
            type="time"
            name="check_out_end"
            value={formData.policies.check_out_end}
            onChange={handlePoliciesChange}
            required
          />
          {errors['policies.check_out_end'] && <span className={styles.error}>{errors['policies.check_out_end']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>
            <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
            Quiet Hours End
          </label>
          <input
            type="time"
            name="quiet_hours_end"
            value={formData.policies.quiet_hours_end}
            onChange={handlePoliciesChange}
          />
        </div>
      </div>
    </div>

    <div className={styles.formGroup}>
      <label>Cleaning Maintenance*</label>
      <input
        type="text"
        name="cleaning_maintenance"
        value={formData.policies.cleaning_maintenance}
        onChange={handlePoliciesChange}
        required
      />
      {errors['policies.cleaning_maintenance'] && <span className={styles.error}>{errors['policies.cleaning_maintenance']}</span>}
    </div>

    <div className={styles.formGroup}>
      <label>Cancellation Policy*</label>
      <select
        name="cancellation_policy"
        value={formData.policies.cancellation_policy}
        onChange={handlePoliciesChange} 
        className={styles.formSelect}
        required
      >
        <option value="">Select a policy</option>
        <option value="Flexible - Full refund 1 day prior to arrival">Flexible - Full refund 1 day prior to arrival</option>
        <option value="Moderate - Full refund 5 days prior to arrival">Moderate - Full refund 5 days prior to arrival</option>
        <option value="Strict - 50% refund until 1 week prior to arrival">Strict - 50% refund until 1 week prior to arrival</option>
        <option value="Non-refundable">Non-refundable</option>
      </select>
      {errors['policies.cancellation_policy'] && <span className={styles.error}>{errors['policies.cancellation_policy']}</span>}
    </div>
  </div>
);

const renderPaymentTab = () => (
  <div className={styles.tabContent}>
    <h3>Means of payment*</h3>
    <p className={styles.textMuted}>
      Please check at least one payment method.
    </p>
    
    <div className={styles.checkboxGroup}>
      <label>
        <input
          type="checkbox"
          name="credit card"
          onChange={handlePaymentChange}
          checked={formData.means_of_payment?.includes('credit card')}
        />
        <FaCreditCard size={20} style={{ marginRight: '8px' }} />
        Credit Card
      </label>

      <label>
        <input
          type="checkbox"
          name="debit card"
          onChange={handlePaymentChange}
          checked={formData.means_of_payment?.includes('debit card')}
        />
        <FaCreditCard size={20} style={{ marginRight: '8px' }} />
        Debit Card
      </label>

      <label>
        <input
          type="checkbox"
          name="cash"
          onChange={handlePaymentChange}
          checked={formData.means_of_payment?.includes('cash')}
        />
        <FaMoneyBillAlt size={20} style={{ marginRight: '8px' }} />
        Cash
      </label>

      <label>
        <input
          type="checkbox"
          name="check"
          onChange={handlePaymentChange}
          checked={formData.means_of_payment?.includes('check')}
        />
        <CiMoneyCheck1 size={25} style={{ marginRight: '8px' }} />
        Check
      </label>
    </div>
    {errors.paymentMethods && <span className={styles.error}>{errors.paymentMethods}</span>}
  </div>
);

const renderTabContent = () => {
  switch(currentTab) {
    case 'basic info':
      return (
        <>
          {renderBasicTab()}
          {renderContactTab()}
        </>
      );
    case 'details':
      return (
        <>
          {renderPhotosTab()}
          {renderDetailsTab()}
        </>
      );
    case 'location':
      return renderLocationSection();
    case 'spaces':
      return renderSpacesTab();
    case 'amenities':
      return renderAmenitiesTab();
    case 'policies':
      return renderPoliciesTab();
    case 'payment':
      return renderPaymentTab();
    default:
      return null;
  }
};

const handleNext = () => {
  if (!validateCurrentTab()) {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
    return;
  }
  
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < tabs.length - 1) {
    setCurrentTab(tabs[currentIndex + 1]);
  }
};

const handleBack = () => {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex > 0) {
    setCurrentTab(tabs[currentIndex - 1]);
  }
};

return (
  <div className={styles.formContainer}>
    <div className={styles.formHeader}>
      <h2>{initialData ? 'Edit Listing' : 'Create New Listing'}</h2>
      <button onClick={onCancel} className={styles.closeButton}>
        <X size={24} />
      </button>
    </div>

    <div className={styles.tabs}>
      {tabs.map(tab => (
        <button
          key={tab}
          className={`${styles.tab} ${currentTab === tab ? styles.activeTab : ''}`}
          onClick={() => setCurrentTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>

    <form onSubmit={handleSubmit} className={styles.formContent}>
      {renderTabContent()}

      <div className={styles.formActions}>
        {currentTab !== tabs[0] && (
          <button
            type="button"
            onClick={handleBack}
            className={styles.secondaryButton}
          >
            Back
          </button>
        )}
        
        <button
          type={currentTab === tabs[tabs.length - 1] ? 'submit' : 'button'}
          className={`${styles.primaryButton} ${Object.keys(errors).length > 0 ? styles.hasErrors : ''}`}
          onClick={currentTab === tabs[tabs.length - 1] ? undefined : handleNext}
          disabled={isSubmitting}
        >
          {currentTab === tabs[tabs.length - 1] ? 'Submit Listing' : 'Next'}
          {Object.keys(errors).length > 0 && currentTab !== tabs[tabs.length - 1] && (
            <span className={styles.errorIndicator}>!</span>
          )}
        </button>
      </div>
    </form>
  </div>
);}