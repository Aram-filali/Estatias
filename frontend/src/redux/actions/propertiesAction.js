/*// redux/actions/propertyAction.js
import axios from "axios";

// Définir les types d'action
export const GET_OWNER_PROPERTIES_REQUEST = "GET_OWNER_PROPERTIES_REQUEST";
export const GET_OWNER_PROPERTIES_SUCCESS = "GET_OWNER_PROPERTIES_SUCCESS";
export const GET_OWNER_PROPERTIES_FAILURE = "GET_OWNER_PROPERTIES_FAILURE";

// Action pour récupérer les propriétés d'un propriétaire
export const getOwnerProperties = (ownerId) => async (dispatch) => {
  dispatch({ type: GET_OWNER_PROPERTIES_REQUEST });
  
  try {
    // Appel à ton API pour récupérer les propriétés du propriétaire
    const response = await axios.get(`/api/properties/owner/${ownerId}`);
    dispatch({
      type: GET_OWNER_PROPERTIES_SUCCESS,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: GET_OWNER_PROPERTIES_FAILURE,
      payload: error.message,
    });
  }
};*/
// Fichier: redux/actions/propertiesAction.js
export const getProperties = () => async (dispatch) => {
  try {
    dispatch({ type: 'FETCH_PROPERTIES_REQUEST' });
    
    // Remplacer par un vrai appel API
    // const response = await fetch('/api/properties');
    // const data = await response.json();
    
    // Données simulées pour le développement
    const data = [
      {
        id: 1,
        title: 'Appartement moderne avec vue',
        type: 'Appartement',
        location: 'Paris, 16ème',
        price: '150€',
        bedrooms: 2,
        bathrooms: 1,
        area: 75,
        rating: 4.8,
        reviewCount: 24,
        mainImage: '/property-card-1.jpg'
      },
      {
        id: 2,
        title: 'Villa avec piscine',
        type: 'Villa',
        location: 'Nice, Côte d\'Azur',
        price: '280€',
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        rating: 4.9,
        reviewCount: 18,
        mainImage: '/property-card-2.jpg'
      },
      {
        id: 3,
        title: 'Studio cosy en centre-ville',
        type: 'Studio',
        location: 'Lyon, 2ème',
        price: '85€',
        bedrooms: 1,
        bathrooms: 1,
        area: 40,
        rating: 4.5,
        reviewCount: 32,
        mainImage: '/property-card-3.jpg'
      },
      {
        id: 4,
        title: 'Maison avec jardin',
        type: 'Maison',
        location: 'Marseille, Vieux Port',
        price: '195€',
        bedrooms: 4,
        bathrooms: 2,
        area: 140,
        rating: 4.7,
        reviewCount: 15,
        mainImage: '/property-card-4.jpg'
      },
      {
        id: 5,
        title: 'Loft industriel rénové',
        type: 'Loft',
        location: 'Paris, 11ème',
        price: '175€',
        bedrooms: 2,
        bathrooms: 1,
        area: 90,
        rating: 4.6,
        reviewCount: 27,
        mainImage: '/property-card-5.jpg'
      },
      {
        id: 6,
        title: 'Duplex avec terrasse',
        type: 'Appartement',
        location: 'Nice, Centre',
        price: '210€',
        bedrooms: 3,
        bathrooms: 2,
        area: 110,
        rating: 4.8,
        reviewCount: 21,
        mainImage: '/property-card-6.jpg'
      }
    ];
    
    dispatch({ 
      type: 'FETCH_PROPERTIES_SUCCESS',
      payload: data
    });
  } catch (error) {
    dispatch({ 
      type: 'FETCH_PROPERTIES_FAILURE',
      payload: error.message
    });
  }
};