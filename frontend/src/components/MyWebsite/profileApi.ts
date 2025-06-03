import axios from 'axios';
import { HostData } from '@/types/hostTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth token to each request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const profileApi = {
  // Get profile data
  getProfile: async (): Promise<HostData> => {
    try {
      // Get the user ID - assuming you store it in localStorage after login
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await apiClient.get(`/hosts/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update profile data
  updateProfile: async (data: Partial<HostData>): Promise<HostData> => {
    try {
      // Get the user ID - assuming you store it in localStorage after login
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await apiClient.patch(`/hosts/${userId}/profile`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Delete account
  deleteAccount: async (): Promise<{ message: string }> => {
    try {
      // Get the user ID - assuming you store it in localStorage after login
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await apiClient.delete(`/hosts/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
};