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
import SEOBoostPopup from './AI/SEOBoost';

export default function ListingForm({ initialData, onSubmit, onCancel }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();
  
  const [firebaseUserId, setFirebaseUserId] = useState("");
  const [mapUrl, setMapUrl] = useState("https://maps.google.com/maps?q=0,0&z=15&output=embed");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSEOBoostPopup, setShowSEOBoostPopup] = useState(false);
    const [pendingSubmissionData, setPendingSubmissionData] = useState(null);
      const [isUploading, setIsUploading] = useState(false);
      const [uploadProgress, setUploadProgress] = useState(0);

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

  const [showSyncPopup, setShowSyncPopup] = useState(false);

  const [syncData, setSyncData] = useState(null);
  const [isSyncedAvailabilities, setIsSyncedAvailabilities] = useState(false);

// 2. Fixed handleSyncComplete function with proper error handling
const handleSyncComplete = (syncResult) => {
  console.log('🔄 Sync completed with data:', syncResult);
  
  try {
    // Stocker les données de synchronisation
    if (syncResult && syncResult.syncData) {
      console.log('📊 Setting sync data:', syncResult.syncData);
      setSyncData(syncResult.syncData);
      setIsSyncedAvailabilities(true);
    }
    
    // Mettre à jour les availabilities
    if (syncResult && syncResult.availabilities && Array.isArray(syncResult.availabilities)) {
      console.log('📅 Setting availabilities:', syncResult.availabilities);
      setAvailabilities(syncResult.availabilities);
    }
    
    // Fermer le popup de sync
    setShowSyncPopup(false);
    
    // Afficher une notification de succès
    if (typeof safeSetNotification === 'function') {
      safeSetNotification({
        show: true,
        message: `${syncResult.availabilities?.length || 0} dates synchronisées avec succès !`,
        type: 'success'
      });
    }
    
    // Force re-render by updating a timestamp or trigger
    console.log('✅ Sync complete, data should now be visible');
    
  } catch (error) {
    console.error('❌ Error in handleSyncComplete:', error);
    if (typeof safeSetNotification === 'function') {
      safeSetNotification({
        show: true,
        message: 'Erreur lors de la synchronisation des données',
        type: 'error'
      });
    }
  }
};
  /*const [availabilities, setAvailabilities] = useState([]);
  const [currentAvailability, setCurrentAvailability] = useState({
    start_time: "",
    end_time: "",
    price: "",
    touristTax: "",
  });*/

  

  // Mise à jour synchronisée de formData lorsque availabilities change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      availabilities
    }));
  }, [availabilities, setFormData]);

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

  // État pour les coordonnées
  const [coordinates, setCoordinates] = useState({
      latitude: 0,
      longitude: 0
    });
    
    // État pour suivre la source de la dernière mise à jour (pour éviter les boucles infinies)
    const [lastUpdateSource, setLastUpdateSource] = useState(null);



   const handleActualSubmit = async (overrideData = {}) => {
  console.log('=== DÉBUT handleActualSubmit ===');
  console.log('overrideData reçu:', overrideData);
  console.log('formData actuel:', { title: formData.title, description: formData.description });

  setIsUploading(true);
  setUploadProgress(0);

  try {
    const finalFormData = {
      ...formData,
      ...overrideData
    };

    console.log('Données fusionnées:', {
      title: finalFormData.title,
      description: finalFormData.description
    });

    console.log('=== DONNÉES DE SOUMISSION ===');
    console.log('formData.title:', formData.title);
    console.log('formData.description:', formData.description);
    console.log('overrideData:', overrideData);
    console.log('finalFormData final:', {
      title: finalFormData.title,
      description: finalFormData.description
    });

    const mainPhotoUrls = [];
    for (let i = 0; i < mainPhotos.length; i++) {
      const photo = mainPhotos[i];
      if (photo instanceof File) {
        const downloadURL = await uploadToFirebase(photo, `properties/${firebaseUserId}/main`);
        mainPhotoUrls.push(downloadURL);
      } else if (typeof photo === 'string') {
        mainPhotoUrls.push(photo);
      } else if (photo && photo.preview) {
        const downloadURL = await uploadToFirebase(photo.file || photo, `properties/${firebaseUserId}/main`);
        mainPhotoUrls.push(downloadURL);
      }
      setUploadProgress(Math.round((i + 1) / mainPhotos.length * 50));
    }

    const propertySpaces = [];
    for (let i = 0; i < apartmentSpaces.length; i++) {
      const space = apartmentSpaces[i];
      const spacePhotoUrls = [];

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
            spacePhotoUrls.push(photo);
          } else if (photo && photo.preview) {
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
        photos: spacePhotoUrls
      });

      setUploadProgress(50 + Math.round((i + 1) / apartmentSpaces.length * 50));
    }

    const validLatitude = !isNaN(parseFloat(coordinates.latitude)) ? parseFloat(coordinates.latitude) : 0;
    const validLongitude = !isNaN(parseFloat(coordinates.longitude)) ? parseFloat(coordinates.longitude) : 0;

    const meansOfPayment = Array.isArray(finalFormData.means_of_payment)
      ? finalFormData.means_of_payment
      : Object.entries(finalFormData.paymentMethods || {})
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key);

    const propertyData = {
      firebaseUid: firebaseUserId,
      title: finalFormData.title ? finalFormData.title.trim() : '',
      description: finalFormData.description ? finalFormData.description.trim() : '',
      availabilities: (availabilities || []).map(avail => ({
        start_time: avail.start_time || '',
        end_time: avail.end_time || '',
        price: !isNaN(parseFloat(avail.price)) && avail.price > 0 ? parseFloat(avail.price) : 0,
        otherPlatformPrice: avail.otherPlatformPrice ? parseFloat(avail.otherPlatformPrice) : null,
        isPrice: Boolean(avail.isPrice),
        touristTax: !isNaN(parseFloat(avail.touristTax)) && avail.touristTax > 0 ? parseFloat(avail.touristTax) : 0,
      })),
      syncData: syncData || null,
      isSyncedProperty: isSyncedAvailabilities,
      mainPhotos: mainPhotoUrls,
      type: finalFormData.type ? finalFormData.type.trim() : '',
      apartmentSpaces: propertySpaces,
      address: finalFormData.address ? finalFormData.address.trim() : '',
      country: finalFormData.country ? finalFormData.country.trim() : '',
      city: finalFormData.city ? finalFormData.city.trim() : '',
      latitude: validLatitude,
      longitude: validLongitude,
      size: isNaN(parseFloat(finalFormData.size)) ? 0 : parseFloat(finalFormData.size),
      lotSize:
        finalFormData.type === 'Appartement'
          ? 0
          : isNaN(parseFloat(finalFormData.lotSize))
          ? 0
          : parseFloat(finalFormData.lotSize),
      floorNumber: isNaN(parseInt(finalFormData.floorNumber, 10)) ? 0 : parseInt(finalFormData.floorNumber, 10),
      numberOfBalconies: isNaN(parseInt(finalFormData.numberOfBalconies, 10))
        ? 0
        : parseInt(finalFormData.numberOfBalconies, 10),
      rooms: isNaN(parseInt(finalFormData.rooms, 10)) ? 0 : parseInt(finalFormData.rooms, 10),
      bedrooms: isNaN(parseInt(finalFormData.bedrooms, 10)) ? 0 : parseInt(finalFormData.bedrooms, 10),
      bathrooms: isNaN(parseInt(finalFormData.bathrooms, 10)) ? 0 : parseInt(finalFormData.bathrooms, 10),
      beds_Number: isNaN(parseInt(finalFormData.beds_Number, 10)) ? 0 : parseInt(finalFormData.beds_Number, 10),
      maxGuest: isNaN(parseInt(finalFormData.maxGuest, 10)) ? 0 : parseInt(finalFormData.maxGuest, 10),
      minNight: isNaN(parseInt(finalFormData.minNight, 10)) ? 0 : parseInt(finalFormData.minNight, 10),
      maxNight: isNaN(parseInt(finalFormData.maxNight, 10)) ? 0 : parseInt(finalFormData.maxNight, 10),
      amenities: finalFormData.amenities || {},
      policies: finalFormData.policies || {},
      means_of_payment: meansOfPayment,
      phone: finalFormData.phone || '',
      email: finalFormData.email || '',
      website: finalFormData.website || '',
    };

    console.log('=== DONNÉES ENVOYÉES AU SERVEUR ===');
    console.log('Titre final:', propertyData.title);
    console.log('Description finale:', propertyData.description);
    console.log('PropertyData complet:', JSON.stringify(propertyData, null, 2));

    const response = await axios.post('http://localhost:3000/properties', propertyData, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('Server response:', response.data);

    safeSetNotification({
      show: true,
      message: 'Property created successfully!',
      type: 'success',
    });

      router.push(`http://localhost:3002/MyWebsite/property/view/${response.data.id}`);
  } catch (error) {
    console.error('Error details:', error);

    let errorMessage = 'An error occurred while saving the property.';

    if (error.response) {
      console.error('Server error status:', error.response.status);
      console.error('Server error data:', error.response.data);
      errorMessage = error.response.data.message || error.response.data.error || errorMessage;
    } else if (error.request) {
      console.error('No response received:', error.request);
      errorMessage = 'No response from server. Please check your internet connection.';
    } else {
      console.error('General error:', error.message);
      errorMessage = error.message;
    }

    safeSetNotification({
      show: true,
      message: `Error: ${errorMessage}`,
      type: 'error',
    });
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
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



const handleSEOBoost = async (generatedContent = {}) => {
  console.log('=== DÉBUT handleSEOBoost ===');
  console.log('Contenu généré reçu:', generatedContent);
  console.log('FormData actuel:', {
    title: formData.title,
    description: formData.description
  });
  
  setShowSEOBoostPopup(false);
  
  try {
    // 🔥 CORRECTION : Utiliser le contenu généré au lieu du formData actuel
    const overrideData = {
      title: generatedContent.title || formData.title || '',
      description: generatedContent.description || formData.description || ''
    };
    
    console.log('Données override finales:', overrideData);
    
    // Passer les données générées à handleActualSubmit
    await handleActualSubmit(overrideData);
    
  } catch (error) {
    console.error('Error during SEO boost:', error);
    safeSetNotification({
      show: true,
      message: 'Error during submission. Please try again.',
      type: 'error'
    });
  }
};

// ✅ CORRECTION : Ces fonctions mettent à jour le formData pour l'affichage UI
const handleTitleGenerated = (title) => {
  console.log('=== TITRE GÉNÉRÉ ===', title);
  setFormData(prev => {
    const updated = { ...prev, title };
    console.log('FormData mis à jour avec titre:', updated);
    return updated;
  });
};

const handleDescriptionGenerated = (description) => {
  console.log('=== DESCRIPTION GÉNÉRÉE ===', description);
  setFormData(prev => {
    const updated = { ...prev, description };
    console.log('FormData mis à jour avec description:', updated);
    return updated;
  });
};

// GARDER handleSkipSEO simple
const handleSkipSEO = async () => {
  setShowSEOBoostPopup(false);
  await handleActualSubmit();
};

// Handle closing popup without action
const handleClosePopup = () => {
  setShowSEOBoostPopup(false);
  setPendingSubmissionData(null);
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
      if (value && !/^\+?[0-9\s\-()]{8,20}$/.test(String(value))) {
        return "Please enter a valid phone number";
      }
      return "";
    }
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validate: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        return "Please enter a valid email address";
      }
      return "";
    }
  },
  website: {
    pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/,
    validate: (value) => {
      if (value && !/^(https?:\/\/)?(www\.)?[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/.test(String(value))) {
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
      if (value === undefined || value === null || value === '') {
        return "Living Area is required";
      }
      
      // Convert to string if it's a number
      const stringValue = typeof value === 'string' ? value : String(value);
      
      if (!/^\d+(\.\d+)?$/.test(stringValue)) {
        return "Living area must be a number";
      }
      
      const numericValue = parseFloat(stringValue);
      if (numericValue > 1000) {
        return "Living area cannot exceed 1000 square meters";
      }
      
      return "";
    }
  },
  lotSize: {
    validate: (value) => {
      // Only validate if the property type is not apartment
      if (formData.type !== "Appartement") {
        if (!value) return "Total land area is required";
        if (value && !/^\d+(\.\d+)?$/.test(String(value))) return "Total land area must be a number";
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
      if (value && !/^\d+$/.test(String(value))) {
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
      if (value && !/^\d+$/.test(String(value))) return "Number of balconies must be a positive integer";
      if (parseInt(value) > 10) return "Number of balconies cannot exceed 10";
      return "";
    }
  },
  rooms: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Number of rooms is required";
      if (!/^\d+$/.test(String(value))) return "Number of rooms must be a positive integer";
      if (parseInt(value) > 30) return "Number of rooms cannot exceed 30";
      return "";
    }
  },
  bedrooms: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Number of bedrooms is required";
      if (!/^\d+$/.test(String(value))) return "Number of bedrooms must be a positive integer";
      if (parseInt(value) > 20) return "Number of bedrooms cannot exceed 20";
      return "";
    }
  },
  bathrooms: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Number of bathrooms is required";
      if (!/^\d+$/.test(String(value))) return "Number of bathrooms must be a positive integer";
      if (parseInt(value) > 15) return "Number of bathrooms cannot exceed 15";
      return "";
    }
  },
  maxGuest: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Maximum guests is required";
      if (!/^\d+$/.test(String(value))) return "Maximum guests must be a positive integer";
      if (parseInt(value) > 300) return "Maximum guests cannot exceed 300";
      return "";
    }
  },
  beds_Number: {
    required: true,
    pattern: /^\d+$/,
    validate: (value) => {
      if (!value) return "Number of beds is required";
      if (!/^\d+$/.test(String(value))) return "Number of beds must be a positive integer";
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
      if (!/^\d+$/.test(String(value))) return "Must be a positive integer";
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
      if (!/^\d+$/.test(String(value))) return "Must be a positive integer";
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
  }
};

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
      safeSetNotification({
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

// GARDER handleFormSubmit identique
const handleFormSubmit = (e) => {
  e.preventDefault();
  //setSubmitAttempted(true);
  
  const isValid = validateFormBeforeSubmit();
  if (isValid) {
    setShowSEOBoostPopup(true);
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

const renderAvailability = () => {
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
  // Valider l'onglet courant avant de passer au suivant
  if (!validateCurrentTab()) {
    // Trouver le premier champ en erreur
    const firstErrorField = Object.keys(errors).find(field => errors[field]);
    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
    return;
  }

  // Passer à l'onglet suivant
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < tabs.length - 1) {
    setCurrentTab(tabs[currentIndex + 1]);
    
    // Nettoyer les erreurs de l'onglet précédent
    setErrors(prev => {
      const newErrors = { ...prev };
      const fieldsToClear = getTabFields(currentTab);
      fieldsToClear.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  }
};

// Fonction utilitaire pour obtenir les champs d'un onglet
const getTabFields = (tab) => {
  switch(tab) {
    case 'basic info':
      return ['title', 'description', 'type', 'phone', 'email'];
    case 'details':
      return ['size', 'rooms', 'bedrooms', 'bathrooms', 'beds_Number', 'maxGuest', 'minNight', 'maxNight', 'mainPhotos'];
    case 'location':
      return ['address', 'country', 'city', 'state'];
    case 'spaces':
      return apartmentSpaces.flatMap((_, index) => [
        `space_id_${index}`, 
        `type_${index}`, 
        `area_${index}`, 
        `photos_${index}`
      ]);
    case 'payment':
      return ['paymentMethods'];
    default:
      return [];
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

  <form onSubmit={handleFormSubmit} className={styles.formContent}>
    {currentTab === 'basic info' && (
      <>
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
      </>
    )}

    {currentTab === 'details' && (
      <>
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
      </>
    )}

    {currentTab === 'location' && (
      <div className={styles.tabContent}>
        <h3>Location</h3>
        <div className={styles.formGroup}>
          <label>Address*</label>
          <input
            type="text"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            required
          />
          {errors.address && <span className={styles.error}>{errors.address}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Country*</label>
          <input
            type="text"
            name="country"
            value={formData.country || ''}
            onChange={handleChange}
            required
          />
          {errors.country && <span className={styles.error}>{errors.country}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>City*</label>
          <input
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            required
          />
          {errors.city && <span className={styles.error}>{errors.city}</span>}
        </div>

        <div className={styles.formGroup}>
          <button 
            type="button" 
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            <MdMyLocation size={18} style={{ marginRight: '5px' }} />
            {isLoadingLocation ? 'Loading...' : 'Use my current location'}
          </button>
        </div>

        <div className={styles.mapContainer}>
          <iframe
            title="Location"
            src={mapUrl}
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    )}

    {currentTab === 'spaces' && (
      <div className={styles.tabContent}>
        <h3>{formData.type ? `${formData.type} ${getSpaceTypeName()}s` : "Property Spaces"}</h3>

        {apartmentSpaces.map((space, index) => (
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
    )}

    {currentTab === 'amenities' && (
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
    )}

    {currentTab === 'policies' && (
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
    )}

    {currentTab === 'payment' && (
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
    )}

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
      <SEOBoostPopup 
      isOpen={showSEOBoostPopup}
      onClose={handleClosePopup}
      onBoost={handleSEOBoost}
      onSkip={handleSkipSEO}
      formData={formData}
      onTitleGenerated={handleTitleGenerated}
      onDescriptionGenerated={handleDescriptionGenerated}
    />

    </div>
  </form>
</div>
);}