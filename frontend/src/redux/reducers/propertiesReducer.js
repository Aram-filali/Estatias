/*// redux/reducers/propertyReducer.js

const initialState = {
    properties: [],
    owner: {},
    loading: true,
    error: null,
  };
  
  const propertyReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'GET_OWNER_PROPERTIES':
        return {
          ...state,
          properties: action.payload,
          loading: false,
        };
      case 'GET_OWNER_PROPERTIES_ERROR':
        return {
          ...state,
          error: action.payload,
          loading: false,
        };
      default:
        return state;
    }
  };
  
  export default propertyReducer;*/
  // Reducer Redux pour les propriétés
// Fichier: redux/reducers/propertiesReducer.js
const initialState = {
  properties: [],
  loading: false,
  error: null
};

export default function propertiesReducer(state = initialState, action) {
  switch (action.type) {
    case 'FETCH_PROPERTIES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_PROPERTIES_SUCCESS':
      return {
        ...state,
        loading: false,
        properties: action.payload
      };
    case 'FETCH_PROPERTIES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
}
  