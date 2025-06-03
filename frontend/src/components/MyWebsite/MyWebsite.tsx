/*// Main component: HostDashboard.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './MyWebsite.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

// Component imports
import LoadingSpinner from './loadingSpinner';
import ProfileTab from './profileTab';
import PropertiesTab from './propertyTab';
import DocumentsTab from './documentsTab';
import DashboardPage from '../dashboard/dashboard';
import Sidebar from './sidebar';

// Types and data
import { HostData } from '@/types/hostTypes';
import { initialListings } from 'src/data/initialListings';


export default function HostDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hostData, setHostData] = useState<HostData | null>(null);

  // Fetch host data on component mount
  useEffect(() => {
    const fetchHostData = async () => {
      try {
        setIsLoading(true);
        // Replace with actual API endpoint
        const response = await axios.get('/api/host/profile');
        setHostData(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching host data:', error);
        // For demo purposes, load mock data
        setHostData({
          firstName: 'Soumaya',
          lastName: 'Ayadi',
          address: '123 Rue de Paris, 75001 Paris',
          id: '12345678901234',
          email: 'soumaya.ayadi@example.com',
          country: 'FR',
          phoneNumber: '6 12 34 56 78',
          propertiesCount: '3',
          isAgency: false,
          kbisOrId: 'id_document.pdf',
          hasRepresentative: false,
          proxy: null,
          repId: null,
          properties: initialListings
        });
        setIsLoading(false);
      }
    };

    fetchHostData();
  }, []);

  const handleUpdateHostData = (updatedData: Partial<HostData>) => {
    if (hostData) {
      setHostData({ ...hostData, ...updatedData });
    }
  };

  const handleSaveProfile = async (updatedData: Partial<HostData>) => {
    try {
      setIsLoading(true);
      // Replace with actual API endpoint
      await axios.put('/api/host/profile', { ...hostData, ...updatedData });
      handleUpdateHostData(updatedData);
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      // Replace with actual API endpoint
      await axios.delete('/api/host/account');
      toast.success('Account deleted successfully');
      router.push('/');
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      setIsLoading(true);
      // Replace with actual API endpoint
      await axios.delete(`/api/properties/${propertyId}`);
      
      // Update local state to reflect deletion
      if (hostData && hostData.properties) {
        const updatedProperties = hostData.properties.filter(property => property.id !== propertyId);
        setHostData({ ...hostData, properties: updatedProperties });
      }
      
      toast.success('Property deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !hostData) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className={styles.dashboardHeader}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <FontAwesomeIcon icon={faUserCircle} />
          </div>
          <div className={styles.userName}>
            Welcome back {hostData.isAgency ? hostData.businessName : `${hostData.firstName}`} !!
          </div>
        </div>
      </div> 
      
      <div className={styles.dashboardContent}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className={styles.contentArea}>
        {activeTab === 'dashboard' && (
            <DashboardPage
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              hostData={hostData} 
              onSave={handleSaveProfile}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
          
          {activeTab === 'properties' && (
            <PropertiesTab 
              properties={hostData.properties || []} 
              onDeleteProperty={handleDeleteProperty}
              onEditProperty={(id) => router.push(`/MyWebsite/property/edit/${id}`)}
              onAddProperty={() => router.push('/MyWebsite/property/add')}
            />
          )}
          
          {activeTab === 'documents' && (
            <DocumentsTab 
              hostData={hostData}
              onUpdateDocuments={handleSaveProfile}
            />
          )}
        </div>
      </div>
    </div>
  );
}*/