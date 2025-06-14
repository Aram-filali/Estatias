import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './ListingForm.module.css';
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
import { FaStar } from 'react-icons/fa';
import { useFirebaseAuth } from './useFirebaseAuth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from './firebaseConfig';
import AvailabilityManager from './AvailabilityManager';
import SEOBoostPopup from './AI/SEOBoost';

export default function ListingForm({ initialData, onSubmit, onCancel }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();
  const storage = getStorage(app);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseUserId, setFirebaseUserId] = useState("");
  const [mapUrl, setMapUrl] = useState("https://maps.google.com/maps?q=0,0&z=15&output=embed");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSEOBoostPopup, setShowSEOBoostPopup] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSyncPopup, setShowSyncPopup] = useState(false);
  const [syncData, setSyncData] = useState(null);
  const [isSyncedAvailabilities, setIsSyncedAvailabilities] = useState(false);

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
  const [deletedMainPhotos, setDeletedMainPhotos] = useState([]);
  const [deletedSpacePhotos, setDeletedSpacePhotos] = useState([]);

  useEffect(() => {
    if (user && user.uid) {
      setFirebaseUserId(user.uid);
    } else {
      const savedId = localStorage.getItem('firebaseUserId');
      if (savedId) {
        setFirebaseUserId(savedId);
      }
    }
  }, [user, loading]);

useEffect(() => {
  if (initialData) {
    const initialPaymentMethods = {
      "credit card": false,
      "debit card": false,
      "paypal": false,
      "cash": false,
      "check": false,
      "bank transfer": false,
      ...initialData.paymentMethods
    };

    setFormData({
      ...initialData,
      paymentMethods: initialPaymentMethods,
      means_of_payment: initialData.means_of_payment || Object.entries(initialPaymentMethods)
        .filter(([_, isChecked]) => isChecked)
        .map(([method]) => method)
    });
    
    if (initialData.mainPhotos && initialData.mainPhotos.length > 0) {
      setMainPhotos(initialData.mainPhotos);
    }
    
    if (initialData.apartmentSpaces && initialData.apartmentSpaces.length > 0) {
      setApartmentSpaces(initialData.apartmentSpaces);
    }
    
    if (initialData.availabilities && initialData.availabilities.length > 0) {
      setAvailabilities(initialData.availabilities);
    }
  }
}, [initialData]);

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
  };

const handlePaymentChange = (e) => {
  const { name, checked } = e.target;
  
  setFormData(prev => {
    const updatedPaymentMethods = checked
      ? [...prev.means_of_payment, name]
      : prev.means_of_payment.filter(method => method !== name);
    
    return {
      ...prev,
      means_of_payment: updatedPaymentMethods
    };
  });
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
          toast.error("Impossible d'obtenir votre position actuelle. Veuillez vérifier vos paramètres de localisation.");
          setIsLoadingLocation(false);
        }
      );
    } else {
      toast.error("La géolocalisation n'est pas prise en charge par votre navigateur.");
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
    
    const files = Array.from(event.target.files);
    setMainPhotos([...mainPhotos, ...files]);
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
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos = [...updatedSpaces[spaceIndex].photos, ...files];
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
    if (!currentAvailability.start_time || !currentAvailability.end_time || !currentAvailability.price) {
      toast.error("Please fill all availability fields");
      return;
    }
    
    setAvailabilities((prevAvailabilities) => [
      ...prevAvailabilities,
      currentAvailability,
    ]);
    setCurrentAvailability({ start_time: "", end_time: "", price: "" });
  };

  const handleDateSelect = (range) => {
    if (!range.startDate || !range.endDate) return;
    
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

  const removeMainPhoto = (index) => {
    const photoToRemove = mainPhotos[index];
    const updatedPhotos = [...mainPhotos];
    updatedPhotos.splice(index, 1);
    setMainPhotos(updatedPhotos);
    
    if (typeof photoToRemove === 'string' && photoToRemove.includes('firebasestorage.googleapis.com')) {
      setDeletedMainPhotos([...deletedMainPhotos, photoToRemove]);
    }
  };

  const removeSpacePhoto = (spaceIndex, photoIndex) => {
    const space = apartmentSpaces[spaceIndex];
    const photoToRemove = space.photos[photoIndex];
    
    const updatedSpaces = [...apartmentSpaces];
    updatedSpaces[spaceIndex].photos.splice(photoIndex, 1);
    setApartmentSpaces(updatedSpaces);
    
    if (typeof photoToRemove === 'string' && photoToRemove.includes('firebasestorage.googleapis.com')) {
      setDeletedSpacePhotos([...deletedSpacePhotos, {
        spaceId: space.space_id,
        photoUrl: photoToRemove
      }]);
    }
  };

  const removeAllMainPhotos = () => {
    const existingUrls = mainPhotos.filter(photo => 
      typeof photo === 'string' && photo.includes('firebasestorage.googleapis.com')
    );
    
    if (existingUrls.length > 0) {
      setDeletedMainPhotos([...deletedMainPhotos, ...existingUrls]);
    }
    
    setMainPhotos([]);
  };

  const uploadFileToFirebase = async (file, path) => {
    if (!file) return null;
    
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

  const deleteFirebaseFile = async (fileUrl) => {
    try {
      if (!fileUrl) return;
      
      const matches = fileUrl.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
      if (!matches || matches.length < 2) {
        console.error('Invalid Firebase Storage URL');
        return;
      }
      
      const path = decodeURIComponent(matches[1]);
      const fileRef = ref(storage, path);
      
      await deleteObject(fileRef);
      console.log('File deleted successfully');
    } catch (error) {
      if (error.code !== 'storage/object-not-found') {
        console.error('Error deleting file:', error);
        throw error;
      }
    }
  };

  const validatePaymentTab = () => {
    const hasPaymentMethod = formData.means_of_payment.length > 0;
    
    if (!hasPaymentMethod) {
      setErrors(prevErrors => ({
        ...prevErrors,
        paymentMethods: 'Please select at least one payment method'
      }));
      setCurrentTab('payment');
      return false;
    }
    
    setErrors(prevErrors => ({
      ...prevErrors,
      paymentMethods: undefined
    }));
    
    return true;
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

  const handleActualSubmit = async (overrideData = {}) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const finalFormData = {
        ...formData,
        ...overrideData
      };

      const mainPhotoUrls = [];
      for (let i = 0; i < mainPhotos.length; i++) {
        const photo = mainPhotos[i];
        if (photo instanceof File) {
          const downloadURL = await uploadFileToFirebase(photo, `properties/${firebaseUserId}/main`);
          mainPhotoUrls.push(downloadURL);
        } else if (typeof photo === 'string') {
          mainPhotoUrls.push(photo);
        }
        setUploadProgress(Math.round((i + 1) / mainPhotos.length * 50));
      }

      const apartmentSpacesWithUrls = await Promise.all(
        apartmentSpaces.map(async (space, index) => {
          const spacePhotoUrls = [];

          if (space.photos && Array.isArray(space.photos)) {
            for (let j = 0; j < space.photos.length; j++) {
              const photo = space.photos[j];
              if (photo instanceof File) {
                const downloadURL = await uploadFileToFirebase(
                  photo,
                  `properties/${firebaseUserId}/spaces/${space.space_id || `space-${i}`}`
                );
                spacePhotoUrls.push(downloadURL);
              } else if (typeof photo === 'string') {
                spacePhotoUrls.push(photo);
              }
            }
          }

          return {
            space_id: space.space_id || `space-${i}-${Date.now()}`,
            type: space.type || '',
            area: !isNaN(parseFloat(space.area)) ? parseFloat(space.area) : 0,
            photos: spacePhotoUrls
          };
        })
      );

      const propertyData = {
        firebaseUid: firebaseUserId, 
        title: finalFormData.title.trim(),
        description: finalFormData.description.trim(),
        availabilities: availabilities.map(avail => ({
          start_time: avail.start_time || '',
          end_time: avail.end_time || '',
          price: !isNaN(parseFloat(avail.price)) && avail.price > 0 ? parseFloat(avail.price) : 0,
          touristTax: !isNaN(parseFloat(avail.touristTax)) && avail.touristTax > 0 ? parseFloat(avail.touristTax) : 0,
        })),
        mainPhotos: mainPhotoUrls,
        type: finalFormData.type.trim(),
        apartmentSpaces: apartmentSpacesWithUrls,
        address: finalFormData.address.trim(),
        country: finalFormData.country.trim(),
        city: finalFormData.city.trim(),
        size: isNaN(parseFloat(finalFormData.size)) ? 0 : parseFloat(finalFormData.size),
        lotSize: isNaN(parseFloat(finalFormData.lotSize)) ? 0 : parseFloat(finalFormData.lotSize),
        floorNumber: isNaN(parseInt(finalFormData.floorNumber, 10)) ? 0 : parseInt(finalFormData.floorNumber, 10),
        numberOfBalconies: isNaN(parseInt(finalFormData.numberOfBalconies, 10)) ? 0 : parseInt(finalFormData.numberOfBalconies, 10),
        rooms: isNaN(parseInt(finalFormData.rooms, 10)) ? 0 : parseInt(finalFormData.rooms, 10),
        bedrooms: isNaN(parseInt(finalFormData.bedrooms, 10)) ? 0 : parseInt(finalFormData.bedrooms, 10),
        bathrooms: isNaN(parseInt(finalFormData.bathrooms, 10)) ? 0 : parseInt(finalFormData.bathrooms, 10),
        beds_Number: isNaN(parseInt(finalFormData.beds_Number, 10)) ? 0 : parseInt(finalFormData.beds_Number, 10),
        maxGuest: isNaN(parseInt(finalFormData.maxGuest, 10)) ? 0 : parseInt(finalFormData.maxGuest, 10),
        minNight: isNaN(parseInt(finalFormData.minNight, 10)) ? 0 : parseInt(finalFormData.minNight, 10),
        maxNight: isNaN(parseInt(finalFormData.maxNight, 10)) ? 0 : parseInt(finalFormData.maxNight, 10),
        amenities: finalFormData.amenities,
        policies: finalFormData.policies,
        means_of_payment: finalFormData.means_of_payment,
        phone: finalFormData.phone ?? '',
        email: finalFormData.email ?? '',
        website: finalFormData.website ?? '',
        deletedMainPhotos: deletedMainPhotos,
        deletedSpacePhotos: deletedSpacePhotos.map(item => ({
          spaceId: item.spaceId,
          photoUrls: [item.photoUrl]
        }))
      };

      const isUpdate = !!initialData?._id;
      const endpoint = isUpdate ? `http://localhost:3000/properties/${initialData._id || initialData.id}` : 'http://localhost:3000/properties';
      const method = isUpdate ? 'patch' : 'post';

      const response = await axios[method](
        endpoint,
        propertyData,
        { 
          headers: { 'Content-Type': 'application/json' },
          method: isUpdate ? 'PATCH' : 'POST'
        }
      );

      toast.success(`Property ${isUpdate ? 'updated' : 'created'} successfully!`);
      
      setTimeout(() => {
        router.push(`http://localhost:3002/MyWebsite/property/view/${response.data.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(`Error ${initialData ? 'updating' : 'creating'} property. Please try again.`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSEOBoost = async (generatedContent = {}) => {
    setShowSEOBoostPopup(false);
    
    try {
      const overrideData = {
        title: generatedContent.title || formData.title || '',
        description: generatedContent.description || formData.description || ''
      };
      
      await handleActualSubmit(overrideData);
    } catch (error) {
      console.error('Error during SEO boost:', error);
      toast.error('Error during submission. Please try again.');
    }
  };

  const handleTitleGenerated = (title) => {
    setFormData(prev => ({ ...prev, title }));
  };

  const handleDescriptionGenerated = (description) => {
    setFormData(prev => ({ ...prev, description }));
  };

  const handleSkipSEO = async () => {
    setShowSEOBoostPopup(false);
    await handleActualSubmit();
  };

  const handleClosePopup = () => {
    setShowSEOBoostPopup(false);
    setPendingSubmissionData(null);
  };

  const shouldShowLotSize = () => {
    return formData.type !== "Appartement";
  };
  
  const shouldShowFloor = () => {
    return formData.type === "Appartement";
  };

  const getSpaceTypeName = () => {
    switch (formData.type) {
      case "Hotel": return "Room";
      case "Appartement": return "Unit";
      case "Villa": return "Suite";
      default: return "Space";
    }
  };

  const MainPhotoPreview = ({ photos, onRemove }) => {
    return (
      <div className="main-photos-grid">
        {photos.map((photo, index) => (
          <div key={index} className="photo-preview-container">
            <div className="photo-preview">
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

  const SpacePhotoPreview = ({ photos, spaceIndex, onRemove }) => {
    return (
      <div className="space-photos-grid">
        {photos && photos.map((photo, photoIndex) => (
          <div key={photoIndex} className="photo-preview-container">
            <div className="photo-preview">
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

  const renderMainPhotos = () => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {mainPhotos.map((photo, index) => (
          <div key={index} className="relative">
            <img 
              src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)} 
              alt={`Main photo ${index + 1}`} 
              className="w-24 h-24 object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={() => removeMainPhoto(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderAvailability = () => {
    return (
      <section className={styles.section}>
        <div className={styles.availabilityContainer}>
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
      <section className={styles.section}> 
        <h2>Location</h2>
        
        <input
          className={styles.fullWidth}
          type="text"
          placeholder="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
        {errors.address && <span className={styles.error}>{errors.address}</span>}

        <input
          type="text"
          placeholder="Country"
          name="country"
          value={formData.country}
          onChange={handleChange}
          required
        />
        {errors.country && <span className={styles.error}>{errors.country}</span>}

        <input
          type="text"
          placeholder="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
        />
        {errors.city && <span className={styles.error}>{errors.city}</span>}
        
        <div className={styles.locationControls}>
          <button 
            type="button" 
            className={styles.locationButton}
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
      </section>
    );
  };

  const renderBasicInfoTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.formGroup}>
        <label>Title*</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
        {errors.title && <span className={styles.error}>{errors.title}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Description*</label>
        <textarea
          name="description"
          value={formData.description}
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
          value={formData.type}
          onChange={handleChange}
          required
        >
          <option value="">Select type</option>
          <option value="Hotel">Hotel</option>
          <option value="Appartement">Appartement</option>
          <option value="Villa">Villa</option>
        </select>
        {errors.type && <span className={styles.error}>{errors.type}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Phone*</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
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
          value={formData.email}
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
          value={formData.website}
          onChange={handleChange}
        />
      </div>
    </div>
  );

  const renderDetailsTab = () => {
    return (
      <div className={styles.tabContent}>
        <div className={styles.formGroup}>
          <label htmlFor="mainPhotoInput">Main Photos (Minimum 3)*</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleMainPhotoUpload}
            style={{ display: 'none' }}
            id="mainPhotoInput"
            multiple
          />
          <button
            type="button"
            onClick={() => document.getElementById('mainPhotoInput').click()}
            className={styles.uploadButton}
          >
            Choose Files
          </button>
          <button
            type="button"
            onClick={removeAllMainPhotos}
            className={styles.removeAllButton}
            disabled={mainPhotos.length === 0}
          >
            Remove All Photos
          </button>

          <MainPhotoPreview photos={mainPhotos} onRemove={removeMainPhoto} />
          {mainPhotos.length < 3 && (
            <span className={styles.error}>Minimum 3 photos required</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Size (sqm)*</label>
          <input
            type="number"
            name="size"
            value={formData.size}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.size && <span className={styles.error}>{errors.size}</span>}
        </div>

        {shouldShowLotSize() && (
          <div className={styles.formGroup}>
            <label>Lot Size (sqm)</label>
            <input
              type="number"
              name="lotSize"
              value={formData.lotSize}
              onChange={handleChange}
              min="1"
            />
          </div>
        )}

        {shouldShowFloor() && (
          <div className={styles.formGroup}>
            <label>Floor Number*</label>
            <input
              type="number"
              name="floorNumber"
              value={formData.floorNumber}
              onChange={handleChange}
              required
            />
            {errors.floorNumber && <span className={styles.error}>{errors.floorNumber}</span>}
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Number of Balconies</label>
          <input
            type="number"
            name="numberOfBalconies"
            value={formData.numberOfBalconies}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Rooms*</label>
          <input
            type="number"
            name="rooms"
            value={formData.rooms}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.rooms && <span className={styles.error}>{errors.rooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Bedrooms*</label>
          <input
            type="number"
            name="bedrooms"
            value={formData.bedrooms}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.bedrooms && <span className={styles.error}>{errors.bedrooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Bathrooms*</label>
          <input
            type="number"
            name="bathrooms"
            value={formData.bathrooms}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.bathrooms && <span className={styles.error}>{errors.bathrooms}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Beds Number*</label>
          <input
            type="number"
            name="beds_Number"
            value={formData.beds_Number}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.beds_Number && <span className={styles.error}>{errors.beds_Number}</span>}
        </div>


        <div className={styles.formGroup}>
          <label>Max Guests*</label>
          <input
            type="number"
            name="maxGuest"
            value={formData.maxGuest}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.maxGuest && <span className={styles.error}>{errors.maxGuest}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Min Nights*</label>
          <input
            type="number"
            name="minNight"
            value={formData.minNight}
            onChange={handleChange}
            min="1"
            required
          />
          {errors.minNight && <span className={styles.error}>{errors.minNight}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Max Nights</label>
          <input
            type="number"
            name="maxNight"
            value={formData.maxNight}
            onChange={handleChange}
            min="1"
          />
        </div>

        {renderAvailability()}
      </div>
    );
  };
  
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
                checked={formData.amenities[key]}
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
                checked={formData.amenities[key]}
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
                checked={formData.amenities[key]}
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

      <div className={styles.formGroup}>
        <label>
          <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
          Check-in Start
        </label>
        <input
          type="time"
          name="check_in_start"
          value={formData.policies.check_in_start}
          onChange={handlePoliciesChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label>
          <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
          Check-in End
        </label>
        <input
          type="time"
          name="check_in_end"
          value={formData.policies.check_in_end}
          onChange={handlePoliciesChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label>
          <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
          Check-out Start
        </label>
        <input
          type="time"
          name="check_out_start"
          value={formData.policies.check_out_start}
          onChange={handlePoliciesChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label>
          <IoCalendarOutline size={20} style={{ marginRight: '8px' }} />
          Check-out End
        </label>
        <input
          type="time"
          name="check_out_end"
          value={formData.policies.check_out_end}
          onChange={handlePoliciesChange}
        />
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

      <div className={styles.formGroup}>
        <label>Cleaning Maintenance</label>
        <input
          type="text"
          name="cleaning_maintenance"
          value={formData.policies.cleaning_maintenance}
          onChange={handlePoliciesChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Cancellation Policy
        </label>
        <select
          name="policies.cancellation_policy"
          value={formData.policies.cancellation_policy}
          onChange={handlePoliciesChange} 
          className={styles.formSelect}
        >
          <option value="">Select a policy</option>
          <option value="Flexible - Full refund 1 day prior to arrival">Flexible - Full refund 1 day prior to arrival</option>
          <option value="Moderate - Full refund 5 days prior to arrival">Moderate - Full refund 5 days prior to arrival</option>
          <option value="Strict - 50% refund until 1 week prior to arrival">Strict - 50% refund until 1 week prior to arrival</option>
          <option value="Non-refundable">Non-refundable</option>
        </select>
      </div>
    </div>
  );

const renderPaymentTab = () => {
  return (
    <div className={styles.tabContent}>
      <h3>Payment Methods<span className={styles.required}>*</span></h3>
      <p className={styles.helpText}>Please select at least one payment method</p>
      
      <div className={styles.checkboxGroup}>
        <label>
          <input
            type="checkbox"
            name="credit card"
            checked={formData.means_of_payment.includes("credit card")}
            onChange={handlePaymentChange}
          />
          <FaCreditCard size={20} style={{ marginRight: '8px' }} />
          Credit Card
        </label>
  
        <label>
          <input
            type="checkbox"
            name="debit card"
            checked={formData.means_of_payment.includes("debit card")}
            onChange={handlePaymentChange}
          />
          <FaCreditCard size={20} style={{ marginRight: '8px' }} />
          Debit Card
        </label>
  
        <label>
          <input
            type="checkbox"
            name="paypal"
            checked={formData.means_of_payment.includes("paypal")}
            onChange={handlePaymentChange}
          />
          <FaPaypal size={20} style={{ marginRight: '8px' }} />
          PayPal
        </label>
  
        <label>
          <input
            type="checkbox"
            name="cash"
            checked={formData.means_of_payment.includes("cash")}
            onChange={handlePaymentChange}
          />
          <FaMoneyBillAlt size={20} style={{ marginRight: '8px' }} />
          Cash
        </label>
  
        <label>
          <input
            type="checkbox"
            name="check"
            checked={formData.means_of_payment.includes("check")}
            onChange={handlePaymentChange}
          />
          <CiMoneyCheck1 size={25} style={{ marginRight: '8px' }} />
          Check
        </label>
  
        <label>
          <input
            type="checkbox"
            name="bank transfer"
            checked={formData.means_of_payment.includes("bank transfer")}
            onChange={handlePaymentChange}
          />
          <FaUniversity size={20} style={{ marginRight: '8px' }} />
          Bank Transfer
        </label>
      </div>
      {errors.paymentMethods && (
        <span className={styles.error}>{errors.paymentMethods}</span>
      )}
    </div>
  );
};


  const renderSpacePhotos = (spaceIndex) => {
    const space = apartmentSpaces[spaceIndex];
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {(space.photos || []).map((photo, photoIndex) => (
          <div key={photoIndex} className="relative">
            <img 
              src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)} 
              alt={`Space photo ${photoIndex + 1}`} 
              className="w-24 h-24 object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={() => removeSpacePhoto(spaceIndex, photoIndex)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderSpacesTab = () => (
    <div className={styles.tabContent}>
      <h3>{formData.type ? `${formData.type} ${getSpaceTypeName()}s` : "Property Spaces"}</h3>

      {apartmentSpaces.map((space, index) => (
        <div key={index} className={styles.spaceContainer}>
          <div className={styles.formGroup}>
            <label>Space ID*</label>
            <input
              type="text"
              name="space_id"
              placeholder="Space ID"
              value={space.space_id}
              onChange={(e) => handleApartmentSpaceChange(index, e)}
              required
            />
            {errors[`space_${index}_id`] && <span className={styles.error}>{errors[`space_${index}_id`]}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Type*</label>
            <input
              type="text"
              name="type"
              placeholder="Type"
              value={space.type}
              onChange={(e) => handleApartmentSpaceChange(index, e)}
              required
            />
            {errors[`space_${index}_type`] && <span className={styles.error}>{errors[`space_${index}_type`]}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Area (sqm)*</label>
            <input
              type="text"
              name="area"
              placeholder="Area (sqm)"
              value={space.area}
              onChange={(e) => handleApartmentSpaceChange(index, e)}
              required
            />
            {errors[`space_${index}_area`] && <span className={styles.error}>{errors[`space_${index}_area`]}</span>}
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

            <SpacePhotoPreview 
              photos={space.photos} 
              spaceIndex={index} 
              onRemove={removeSpacePhoto} 
            />
            {errors[`space_${index}_photos`] && <span className={styles.error}>{errors[`space_${index}_photos`]}</span>}
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

  const renderTabContent = () => {
    switch(currentTab) {
      case 'basic info':
        return renderBasicInfoTab();
      case 'details':
        return renderDetailsTab();
      case 'spaces':
        return renderSpacesTab();
      case 'location':
        return renderLocationSection();
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const isValid = validatePaymentTab();
    if (isValid) {
      setShowSEOBoostPopup(true);
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
          
          {currentTab !== tabs[tabs.length - 1] ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.primaryButton}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className={styles.primaryButton}
            >
              Submit listing
            </button>
          )}
        </div>
      </form>
    </div>
  );
}