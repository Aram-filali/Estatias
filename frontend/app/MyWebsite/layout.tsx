'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from 'src/components/MyWebsite/sidebar';
import LoadingSpinner from 'src/components/MyWebsite/loadingSpinner';
import styles from 'src/components/MyWebsite/MyWebsite.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { HostData } from '@/types/hostTypes';
import { DashboardContext } from 'src/context/DashboardContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const mockHostData: HostData = {
  id: "67fa99c8b74e89b29aa372b4",
  firstName: "aram",
  lastName: "filali",
  isAgency: false,
  email: "aramfilali25256@gmail.com",
  country: "TN",
  phoneNumber: "24 022 910",
  address: "route tatawin,Medenine",
  kbisOrId: "data:image/jpeg;base64,...",
  hasRepresentative: false,
  properties: [],
  propertiesCount: '0',
  proxy: null,
  repId: null
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hostData, setHostData] = useState<HostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHostData = async () => {
    if (typeof window === 'undefined') return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        try {
          // Vérification du token
          await apiClient.post('/hosts/verify-token', { token });

          const response = await apiClient.get(`/hosts/${userId}`);
          setHostData(response.data);
          toast.success('Connected to your account');
        } catch (apiError) {
          console.warn("API error, using mock data instead:", apiError);
          setHostData(mockHostData);
          toast.info('Using demo data mode');
        }
      } else {
        setHostData(mockHostData);
        toast.info('Using demo data mode');
      }
    } catch (error) {
      console.error('Error in fetchHostData:', error);
      setHostData(mockHostData);
      toast.info('Using demo data mode');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
  }, [router]);

  const handleUpdateHostData = (updatedData: Partial<HostData>) => {
    if (hostData) {
      setHostData({ ...hostData, ...updatedData });
    }
  };

  const handleSaveProfile = async (updatedData: Partial<HostData>) => {
    if (!hostData) return false;

    handleUpdateHostData(updatedData);

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        await apiClient.patch(`/hosts/${hostData.id}`, updatedData);
        toast.success('Profile updated successfully');
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Profile updated successfully (demo mode)');
      }
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      setHostData(hostData); // Revert to original data
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!hostData) return false;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        await apiClient.delete(`/hosts/${hostData.id}`);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

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
    if (!hostData?.properties) return false;

    const updatedProperties = hostData.properties.filter(p => p.id !== propertyId);
    setHostData({ ...hostData, properties: updatedProperties });

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        await apiClient.delete(`/properties/${propertyId}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
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

  if (isLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (!hostData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Unable to load dashboard</h2>
        <p>We couldn't load your host data. Please try again later.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{
      hostData,
      handleSaveProfile,
      handleDeleteAccount,
      handleDeleteProperty,
    }}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <FontAwesomeIcon icon={faUserCircle} />
            </div>
            <div className={styles.userName}>
              Welcome back {/*{hostData.isAgency ? hostData.businessName : hostData.firstName} !!*/}
            </div>
          </div>
        </div>

        <div className={styles.dashboardContent}>
          <Sidebar />
          <div className={styles.contentArea}>
            {children}
          </div>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
