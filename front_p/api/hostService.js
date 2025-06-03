/*import axios from 'axios';

const API_URL = 'http://localhost:3000/hosts';  // Remplace l'URL par celle de ton backend NestJS

// Fonction pour créer un hôte
export const createHost = async (hostData) => {
  try {
    const response = await axios.post(API_URL, hostData);
    return response.data;
  } catch (error) {
    console.error('Error creating host:', error);
    throw error;
  }
};

// Fonction pour obtenir tous les hôtes
export const getHosts = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching hosts:', error);
    throw error;
  }
};

// Fonction pour obtenir un hôte par son ID
export const getHostById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching host with ID ${id}:`, error);
    throw error;
  }
};

// Fonction pour mettre à jour un hôte
export const updateHost = async (id, hostData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, hostData);
    return response.data;
  } catch (error) {
    console.error(`Error updating host with ID ${id}:`, error);
    throw error;
  }
};

// Fonction pour supprimer un hôte
export const deleteHost = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting host with ID ${id}:`, error);
    throw error;
  }
};*/
