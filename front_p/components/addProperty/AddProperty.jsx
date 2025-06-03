"use client";
import React, { useState, useEffect, useRef } from "react";
import "styles/form.css";
import "./mainphoto.css";
import { FaCreditCard, FaPaypal, FaMoneyBillAlt, FaUniversity, FaMapMarkerAlt } from 'react-icons/fa';
import { CiMoneyCheck1 } from "react-icons/ci";
import { MdOutlineSmokingRooms, MdOutlinePets, MdMyLocation } from "react-icons/md";
import { GiPartyPopper } from "react-icons/gi";
import { IoCalendarOutline } from "react-icons/io5";
import { BsPersonRaisedHand } from "react-icons/bs";
import { CalendarPicker } from "./CalendarPicker";
import { useRouter } from "next/navigation";
import axios from 'axios';
//import { useHost } from "./HostProvider";
import { FaStar } from 'react-icons/fa';
import { useFirebaseAuth } from './useFirebaseAuth';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SearchPage2 = ({ nextStep, prevStep }) => {
  const { user, loading } = useFirebaseAuth();
  const [firebaseUserId, setFirebaseUserId] = useState("");

  
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
    place: "",
    type: "",
    address: "",
    country: "",
    state: "",
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
      "paypal": false,
      "cash": false,
      "check": false,
      "bank transfer": false,
    },
  });

  // Mise à jour de la carte basée sur les changements d'adresse, ville ou état
  useEffect(() => {
    const updateMap = () => {
      let locationQuery = '';
      
      // Construire une chaîne de requête en fonction des données disponibles
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
      
      // Si nous avons une requête de localisation, mettre à jour la carte
      if (locationQuery) {
        const encodedQuery = encodeURIComponent(locationQuery);
        setMapUrl(`https://maps.google.com/maps?q=${encodedQuery}&z=15&output=embed`);
      }
    };
    
    // Mettre à jour la carte après un délai pour éviter trop d'appels lors de la frappe
    const timeoutId = setTimeout(updateMap, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.address, formData.city, formData.state]);

  // Fonction pour obtenir la localisation actuelle de l'utilisateur
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setMapUrl(`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`);
          
          // Optionnel: faire une requête de géocodage inverse pour obtenir l'adresse
          reverseGeocode(latitude, longitude);
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

  // Fonction pour faire du géocodage inverse (convertir lat/lng en adresse)
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_API_KEY`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const addressComponents = data.results[0].address_components;
          
          // Extraire les informations pertinentes
          const street = addressComponents.find(component => 
            component.types.includes('route'))?.long_name || '';
          
          const streetNumber = addressComponents.find(component => 
            component.types.includes('street_number'))?.long_name || '';
            
          const city = addressComponents.find(component => 
            component.types.includes('locality'))?.long_name || '';
            
          const state = addressComponents.find(component => 
            component.types.includes('administrative_area_level_1'))?.long_name || '';
            
          const country = addressComponents.find(component => 
            component.types.includes('country'))?.long_name || '';
            
          // Mettre à jour le formulaire avec les informations obtenues
          setFormData(prev => ({
            ...prev,
            address: streetNumber ? `${streetNumber} ${street}` : street,
            city,
            state,
            country
          }));
        }
      }
    } catch (error) {
      console.error("Error with geocoding:", error);
    }
  };

  
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

  // État pour stocker les photos principales
  const [mainPhotos, setMainPhotos] = useState([]);

  const [apartmentSpaces, setApartmentSpaces] = useState([
    { space_id: '', type: '', area: '', photos: [] }
  ]);
  

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
   
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, checked } = e.target;

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

    const isAnyPaymentSelected = e.target.closest('form').querySelectorAll('input[type="checkbox"]:checked').length > 0;

    setErrors((prevErrors) => ({
      ...prevErrors,
      paymentMethods: isAnyPaymentSelected ? '' : 'At least one payment option must be selected',
    }));
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
  };

  const handleMainPhotoUpload = async (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    // On ajoute le fichier à l'état local pour l'affichage immédiat
    setMainPhotos([...mainPhotos, file]);
  };

  // Fonction pour supprimer une photo principale
  const removeMainPhoto = (index) => {
    const updatedPhotos = [...mainPhotos];
    updatedPhotos.splice(index, 1);
    setMainPhotos(updatedPhotos);
  };

  const addApartmentSpace = () => {
    setApartmentSpaces([
      ...apartmentSpaces,
      { space_id: '', type: '', area: '', photos: [] },
    ]);
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

  /*const handlePoliciesChange = (e) => {
    const { name, type, checked, value } = e.target;

    setFormData((prevState) => ({
      ...prevState,
      policies: {
        ...prevState.policies,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };*/

  const handlePoliciesChange = (e) => {
    const { name, type, checked, value } = e.target;
  
    // Vérifie si le nom contient un point (champ imbriqué)
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
      // Gestion normale pour les champs non imbriqués
      setFormData((prevState) => ({
        ...prevState,
        policies: {
          ...prevState.policies,
          [name]: type === "checkbox" ? checked : value,
        },
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
    setCurrentAvailability({ start_time: "", end_time: "", price: "",touristTax: ""});
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
    }));
  };

  const [errors, setErrors] = useState({});
  const router = useRouter();

  // Removed validateForm function and its references
 // Modified handleNavigate and handleSubmit to not depend on validateForm
 
 const handleNavigate = async (e) => {
   e.preventDefault();
   console.log("Navigating to the next step..."); 
   nextStep();  // Simply proceed to the next step without validation
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
 
 const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (loading) {
    console.error('Authentication loading in progress...');
    return;
  }
  
  if (!firebaseUserId) {
    console.error('Firebase ID not available, you must be logged in');
    alert('You must be logged in to create a property');
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
      } else {
        // Si c'est déjà une URL (cas de mise à jour), on la conserve
        mainPhotoUrls.push(photo);
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

    // Préparer les données à envoyer à l'API
    const propertyData = {
      firebaseUid: firebaseUserId, 
      title: formData.title.trim(),
      place: formData.place.trim(),
      description: formData.description.trim(),
      availabilities: availabilities.map(avail => ({
        start_time: avail.start_time || '',
        end_time: avail.end_time || '',
        price: !isNaN(parseFloat(avail.price)) && avail.price > 0 ? parseFloat(avail.price) : 0,
        touristTax: !isNaN(parseFloat(avail.touristTax)) && avail.touristTax > 0 ? parseFloat(avail.touristTax) : 0,
      })),
      mainPhotos: mainPhotoUrls, // URLs des photos principales sur Firebase
      type: formData.type.trim(),
      apartmentSpaces: propertySpaces, // Espaces avec URLs des photos
      address: formData.address.trim(),
      country: formData.country.trim(),
      state: formData.state.trim(),
      city: formData.city.trim(),
      latitude: userLocation ? userLocation.latitude : 0,
      longitude: userLocation ? userLocation.longitude : 0,
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
      amenities: formData.amenities,
      policies: formData.policies,
      means_of_payment: formData.means_of_payment,
      phone: formData.phone || '',
      email: formData.email || '',
      website: formData.website || '',
    };

    // Envoyer les données à l'API backend
    const response = await axios.post('http://localhost:3000/properties', propertyData, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('Server response:', response.data);
  
  } catch (error) {
    if (error.response) {
      console.error('Server error:', error.response.data);
    } else {
      console.error('General error:', error.message);
    }
    alert("Une erreur s'est produite lors de l'enregistrement de la propriété.");
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};
 
 const handleFormSubmit = (e) => {
   e.preventDefault();
   handleNavigate(e);  
   handleSubmit(e);   
 };
 
   // Fonction pour déterminer si le champ Total land area doit être affiché
   const shouldShowLotSize = () => {
     return formData.type !== "Appartement";
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
 
     const renderLocationSection = () => {
       return (
         <section className="section"> 
           <h2>4. Location</h2>
           
           <input
             className="fullWidth"
             type="text"
             placeholder="Address"
             name="address"
             value={formData.address}
             onChange={handleChange}
           />
           {errors.address && <span className="error">{errors.address}</span>}
   
           <input
             type="text"
             placeholder="Country"
             name="country"
             value={formData.country}
             onChange={handleChange}
           />
           {errors.country && <span className="error">{errors.country}</span>}
   
           <input
             type="text"
             placeholder="State"
             name="state"
             value={formData.state}
             onChange={handleChange}
           />
           {errors.state && <span className="error">{errors.state}</span>}
   
           <input
             type="text"
             placeholder="City"
             name="city"
             value={formData.city}
             onChange={handleChange}
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
               {isLoadingLocation ? 'Chargement...' : 'Use my current location'}
             </button>
           </div>
           
           <div className="mapContainer">
             <iframe
               title="Location"
               src={mapUrl}
               allowFullScreen
               loading="lazy"
             />
           </div>
         </section>
       );
     };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
  
    // Validation des champs obligatoires
    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
      isValid = false;
    }
  
    if (!formData.place.trim()) {
      newErrors.place = "Le lieu est requis";
      isValid = false;
    }
  
    if (!formData.description.trim()) {
      newErrors.description = "La description est requise";
      isValid = false;
    }
  
    if (!formData.type.trim()) {
      newErrors.type = "Le type de propriété est requis";
      isValid = false;
    }
  
    // Validation des disponibilités
    if (availabilities.length === 0) {
      newErrors.dateRange = "Au moins une disponibilité est requise";
      isValid = false;
    }
  
    // Validation des photos principales
    if (mainPhotos.length < 3) {
      newErrors.mainPhotos = "Au moins 3 photos principales sont requises";
      isValid = false;
    }
  
    // Validation des espaces
    apartmentSpaces.forEach((space, index) => {
      if (!space.space_id.trim()) {
        newErrors[`space_id_${index}`] = "L'ID de l'espace est requis";
        isValid = false;
      }
      
      if (!space.type.trim()) {
        newErrors[`type_${index}`] = "Le type d'espace est requis";
        isValid = false;
      }
      
      if (!space.area || space.area <= 0) {
        newErrors[`area_${index}`] = "La superficie doit être supérieure à 0";
        isValid = false;
      }
      
      if (space.photos.length === 0) {
        newErrors[`photos_${index}`] = "Au moins une photo est requise pour cet espace";
        isValid = false;
      }
    });
  
    // Validation des informations de localisation
    if (!formData.address.trim()) {
      newErrors.address = "L'adresse est requise";
      isValid = false;
    }
    
    if (!formData.country.trim()) {
      newErrors.country = "Le pays est requis";
      isValid = false;
    }
    
    if (!formData.state.trim()) {
      newErrors.state = "L'état/province est requis";
      isValid = false;
    }
    
    if (!formData.city.trim()) {
      newErrors.city = "La ville est requise";
      isValid = false;
    }
  
    // Validation des détails de la propriété
    if (!formData.size || formData.size <= 0) {
      newErrors.size = "La superficie habitable doit être supérieure à 0";
      isValid = false;
    }
  
    // Valider lotSize seulement si ce n'est pas un appartement
    if (formData.type !== "Appartement" && (!formData.lotSize || formData.lotSize <= 0)) {
      newErrors.lotSize = "La superficie du terrain doit être supérieure à 0";
      isValid = false;
    }
  
    // Valider floorNumber seulement si c'est un appartement
    if (formData.type === "Appartement" && formData.floorNumber < 0) {
      newErrors.floorNumber = "L'étage ne peut pas être négatif";
      isValid = false;
    }
  
    // Validation du nombre de balcons (optionnel mais doit être positif ou zéro)
    if (formData.numberOfBalconies < 0) {
      newErrors.numberOfBalconies = "Le nombre de balcons ne peut pas être négatif";
      isValid = false;
    }
  
    // Autres validations de propriété
    if (!formData.rooms || formData.rooms <= 0) {
      newErrors.rooms = "Le nombre de pièces doit être supérieur à 0";
      isValid = false;
    }
  
    if (!formData.bedrooms || formData.bedrooms <= 0) {
      newErrors.bedrooms = "Le nombre de chambres doit être supérieur à 0";
      isValid = false;
    }
  
    if (!formData.bathrooms || formData.bathrooms <= 0) {
      newErrors.bathrooms = "Le nombre de salles de bain doit être supérieur à tid0";
      isValid = false;
    }
  
    if (!formData.beds_Number || formData.beds_Number <= 0) {
      newErrors.beds_Number = "Le nombre de lits doit être supérieur à 0";
      isValid = false;
    }
  
    if (!formData.maxGuest || formData.maxGuest <= 0) {
      newErrors.maxGuest = "Le nombre maximum d'invités doit être supérieur à 0";
      isValid = false;
    }
  
    if (!formData.minNight || formData.minNight <= 0) {
      newErrors.minNight = "Le nombre minimum de nuits doit être supérieur à 0";
      isValid = false;
    }
  
    if (!formData.maxNight || formData.maxNight <= 0) {
      newErrors.maxNight = "Le nombre maximum de nuits doit être supérieur à 0";
      isValid = false;
    }
  
    if (formData.minNight > formData.maxNight) {
      newErrors.minNight = "Le nombre minimum de nuits ne peut pas être supérieur au nombre maximum";
      isValid = false;
    }
  
    // Vérification des moyens de paiement
    if (!formData.means_of_payment || formData.means_of_payment.length === 0) {
      newErrors.paymentMethods = "Au moins un moyen de paiement est requis";
      isValid = false;
    }
  
    // Vérification de l'email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide";
      isValid = false;
    }
  
    // Vérification du numéro de téléphone si fourni
    if (formData.phone && !/^\+?[0-9\s-()]{8,}$/.test(formData.phone)) {
      newErrors.phone = "Format de téléphone invalide";
      isValid = false;
    }
  
    // Vérification de l'URL du site web si fournie
    if (formData.website && !/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+([\/\w-]*)*$/.test(formData.website)) {
      newErrors.website = "Format d'URL invalide";
      isValid = false;
    }
  
    // Mettre à jour l'état des erreurs
    setErrors(newErrors);
    return isValid;
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
    <div className="main">
      <form className="propertyForm" onSubmit={handleFormSubmit}>
        <section className="section">
          <h2>1. Description</h2>
          <div className="inputContainer">
            <i className="fas fa-user"></i>
            <input
              className="fullWidth"
              type="text"
              placeholder="Property Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>

          <div className="inputContainer">
            <i className="fas fa-user"></i>
            <input
              className="fullWidth"
              type="text"
              placeholder="Property Place"
              name="place"
              value={formData.place}
              onChange={handleChange}
            />
            {errors.place && <span className="error">{errors.place}</span>}
          </div>

          <div className="inputContainer">
            <i className="fas fa-pen"></i>
            <textarea
              className="fullWidth"
              placeholder="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
            {errors.description && <span className="error">{errors.description}</span>}
          </div>
        </section>

        <section className="section">
          <h2>Price and Taxes</h2>
          <div>
            <input
              type="number"
              placeholder="Price per night ($)"
              name="price"
              value={currentAvailability.price}
              onChange={handleAvailabilityChange}
            />
            <input
              type="number"
              placeholder="Tourist tax (%)"
              name="touristTax"
              value={currentAvailability.touristTax}
              onChange={handleAvailabilityChange}
            />
            {errors.price && <span className="error">{errors.price}</span>}
          </div>

          {/* Calendar for selecting date range */}
          <CalendarPicker onDateSelect={handleDateSelect} />

          {errors.dateRange && (
            <span className="error">{errors.dateRange}</span>
          )}
          <button type="button" onClick={handleAddAvailability}>Add Availability</button>

          <div>
            <h3>Added Availabilities:</h3>
            <ul>
              {availabilities.map((availability, index) => (
                <li key={index}>
                  {`Start: ${availability.start_time}, End: ${availability.end_time}, Price: $${availability.price}, Tourist Tax: ${availability.touristTax}`}
                </li>
              ))}
            </ul>
          </div>
        </section>
        
        <section className="section">
          <h2>Property Type</h2>
          <div className="inputContainer">
            <i className="fas fa-chevron-down"></i>
            <select
              className="fullWidth"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="">Select property type</option>
              <option value="Hotel">Hotel</option>
              <option value="Appartement">Appartement</option>
              <option value="Villa">Villa</option>
            </select>
            {errors.type && <span className="error">{errors.type}</span>}
          </div>
        </section>


        <section className="section">
      <h2>3. Property Details</h2>

      <section className="section">
          <div className="sectionHeader">
            <h2> Main Photos</h2>
            <input
              id="mainPhotoInput"
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUpload}
              style={{ display: 'none' }}
            />
            <p className="text-muted">
            Please upload at least 3 photos showing the outside view of your property.
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

          {errors.mainPhotos && <span className="error">{errors.mainPhotos}</span>}
        </section>
        <h2>   Details</h2>
      <input
        type="number"
        placeholder="Living area (m²)"
        name="size"
        value={formData.size}
        onChange={handleChange}
      />
      {errors.size && <span className="error">{errors.size}</span>}

      {/* Surface du terrain : affiché seulement si ce n'est pas un appartement */}
      {shouldShowLotSize() && (
        <>
          <input
            type="number"
            placeholder="Total land area (m²)"
            name="lotSize"
            value={formData.lotSize}
            onChange={handleChange}
          />
          {errors.lotSize && <span className="error">{errors.lotSize}</span>}
        </>
      )}
      
      {/* Floor Number : affiché seulement si c'est un appartement */}
      {shouldShowFloor() && (
        <>
          <input
            type="number"
            placeholder="Floor Number"
            name="floorNumber"
            value={formData.floorNumber || ''}
            onChange={handleChange}
          />
          {errors.floorNumber && <span className="error">{errors.floorNumber}</span>}
        </>
      )}
      
      {/* Number of Balconies */}
      <input
        type="number"
        placeholder="Number of Balconies"
        name="numberOfBalconies"
        value={formData.numberOfBalconies || ''}
        onChange={handleChange}
      />
      {errors.numberOfBalconies && <span className="error">{errors.numberOfBalconies}</span>}

      {/* Autres champs inchangés */}
      <input
        type="number"
        placeholder="Number of rooms"
        name="rooms"
        value={formData.rooms}
        onChange={handleChange}
      />
      {errors.rooms && <span className="error">{errors.rooms}</span>}

      <input
        type="number"
        placeholder="Bedrooms"
        name="bedrooms"
        value={formData.bedrooms}
        onChange={handleChange}
      />
      {errors.bedrooms && <span className="error">{errors.bedrooms}</span>}

      <input
        type="number"
        placeholder="Bathrooms"
        name="bathrooms"
        value={formData.bathrooms}
        onChange={handleChange}
      />
      {errors.bathrooms && <span className="error">{errors.bathrooms}</span>}

      <input
        type="number"
        placeholder="Number of beds"
        name="beds_Number"
        value={formData.beds_Number}
        onChange={handleChange}
      />
      {errors.beds_Number && <span className="error">{errors.beds_Number}</span>}

      <input
        type="number"
        placeholder="Maximum capacity (guests)"
        name="maxGuest"
        value={formData.maxGuest}
        onChange={handleChange}
      />
      {errors.maxGuest && <span className="error">{errors.maxGuest}</span>}

      <input
        type="number"
        placeholder="Minimum nights"
        name="minNight"
        value={formData.minNight}
        onChange={handleChange}
      />
      {errors.minNight && <span className="error">{errors.minNight}</span>}

      <input
        type="number"
        placeholder="Maximum nights"
        name="maxNight"
        value={formData.maxNight}
        onChange={handleChange}
      />
      {errors.maxNight && <span className="error">{errors.maxNight}</span>}
    </section>



        <section className="section">
          <h2>{formData.type ? `${formData.type} ${getSpaceTypeName()}s` : "Property Spaces"}</h2>

          {apartmentSpaces.map((space, index) => (
            <div key={index} className="spaceContainer">
              <input
                type="text"
                name="space_id"
                placeholder="Space ID"
                value={space.space_id}
                onChange={(e) => handleApartmentSpaceChange(index, e)}
              />
              {errors[`space_id_${index}`] && <span className="error">{errors[`space_id_${index}`]}</span>}

              <input
                type="text"
                name="type"
                placeholder="Type"
                value={space.type}
                onChange={(e) => handleApartmentSpaceChange(index, e)}
              />
              {errors[`type_${index}`] && <span className="error">{errors[`type_${index}`]}</span>}

              <input
                type="text"
                name="area"
                placeholder="Area (sqm)"
                value={space.area}
                onChange={(e) => handleApartmentSpaceChange(index, e)}
              />
              {errors[`area_${index}`] && <span className="error">{errors[`area_${index}`]}</span>}

              <div className="spacePhotosSection">
                <div className="sectionHeader">
                  <h4 className="photop">Photos</h4>
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

                {errors[`photos_${index}`] && <span className="error">{errors[`photos_${index}`]}</span>}
              </div>

              {/* ✅ Remove Space si ce n’est pas le premier bloc */}
              {index > 0 && (
                <button
                  type="button"
                  className="removeButton"
                  onClick={() => removeApartmentSpace(index)}
                >
                  Remove Space
                </button>
              )}

              {/* ✅ Ligne séparatrice sauf après le dernier bloc */}
              {index < apartmentSpaces.length - 1 && <hr className="spaceDivider" />}
            </div>
          ))}

          {/* ✅ Bouton d'ajout en dehors de .map */}
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
      <input type="checkbox" name="smoking"
        checked={formData.policies.smoking}
        onChange={handlePoliciesChange} />
      <MdOutlineSmokingRooms size={20} style={{ marginRight: '8px' }} />
      Smoking
    </label>

    <label>
      <input type="checkbox" name="pets"
        checked={formData.policies.pets}
        onChange={handlePoliciesChange} />
      <MdOutlinePets size={20} style={{ marginRight: '8px' }} />
      Pets
    </label>

    <label>
      <input type="checkbox" name="parties_or_events"
        checked={formData.policies.parties_or_events}
        onChange={handlePoliciesChange} />
      <GiPartyPopper size={20} style={{ marginRight: '8px' }} />
      Parties or Events
    </label>

    <label>
      <input type="checkbox" name="guests_allowed"
        checked={formData.policies.guests_allowed}
        onChange={handlePoliciesChange} />
      <BsPersonRaisedHand size={20} style={{ marginRight: '8px' }} />
      Guests Allowed
    </label>


<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Check-in Start
  </div>
  <input
    type="time"
    name="check_in_start"
    value={formData.policies.check_in_start}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.check_in_start && <span className="error">{errors.check_in_start}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Check-in End
  </div>
  <input
    type="time"
    name="check_in_end"
    value={formData.policies.check_in_end}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.check_in_end && <span className="error">{errors.check_in_end}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Check-out Start
  </div>
  <input
    type="time"
    name="check_out_start"
    value={formData.policies.check_out_start}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.check_out_start && <span className="error">{errors.check_out_start}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Check-out End
  </div>
  <input
    type="time"
    name="check_out_end"
    value={formData.policies.check_out_end}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.check_out_end && <span className="error">{errors.check_out_end}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Quiet Hours Start
  </div>
  <input
    type="time"
    name="quiet_hours_start"
    value={formData.policies.quiet_hours_start}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.quiet_hours_start && <span className="error">{errors.quiet_hours_start}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
    Quiet Hours End
  </div>
  <input
    type="time"
    name="quiet_hours_end"
    value={formData.policies.quiet_hours_end}
    onChange={handlePoliciesChange}
    style={{ width: '20%', height: '25%', marginLeft: '10px' }}
  />
  {errors.quiet_hours_end && <span className="error">{errors.quiet_hours_end}</span>}
</label>

<label>
  <input
    type="text"
    placeholder="Cleaning Maintenance"
    name="cleaning_maintenance"
    value={formData.policies.cleaning_maintenance}
    onChange={handlePoliciesChange}
  />
  {errors.cleaning_maintenance && <span className="error">{errors.cleaning_maintenance}</span>}
</label>

<label>
  <div style={{ marginBottom: '20px' }}>
    Cancellation Policy
  </div>
  <select
    name="policies.cancellation_policy"
    value={formData.policies.cancellation_policy}
    onChange={handlePoliciesChange}
    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
  >
    <option value="">Select a policy</option>
    <option value="Flexible - Full refund 1 day prior to arrival">Flexible - Full refund 1 day prior to arrival</option>
    <option value="Moderate - Full refund 5 days prior to arrival">Moderate - Full refund 5 days prior to arrival</option>
    <option value="Strict - 50% refund until 1 week prior to arrival">Strict - 50% refund until 1 week prior to arrival</option>
    <option value="Non-refundable">Non-refundable</option>
  </select>
  {errors.cancellation_policy && <span className="error">{errors.cancellation_policy}</span>}
</label>


  </div>
        </section>
        <section className="section">
  <h2>7. Means of payment</h2>
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
          name="paypal"
          onChange={handlePaymentChange}
        />
        <FaPaypal size={20} style={{ marginRight: '8px' }} />
        Paypal
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

      <label>
        <input
          type="checkbox"
          name="bank transfer"
          onChange={handlePaymentChange}
        />
        <FaUniversity size={20} style={{ marginRight: '8px' }} />
        Bank Transfer
      </label>
    </div>
    {errors.paymentMethods && (
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
  />
  {errors.phone && <span className="error">{errors.phone}</span>}

  <input
    type="email"
    placeholder="Email"
    name="email"
    value={formData.email}
    onChange={handleChange}
  />
  {errors.email && <span className="error">{errors.email}</span>}

  <input
    type="text"
    placeholder="Website"
    name="website"
    value={formData.website}
    onChange={handleChange}
  />
  {errors.website && <span className="error">{errors.website}</span>}
</section>

  
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
    );
  };
  
  export default SearchPage2;
  