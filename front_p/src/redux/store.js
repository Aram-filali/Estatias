// redux/store.js

import { configureStore } from '@reduxjs/toolkit';
import suggestionsReducer from './reducers/suggestionsReducer';
import propertyReducer from './reducers/propertiesReducer';

const store = configureStore({
  reducer: {
    //suggestionsData: suggestionsReducer, // Nom de la clé utilisée dans useSelector
    propertyData: propertyReducer,        // Nom de la clé utilisée dans useSelector
    // autres reducers...
  },
});

export default store;
// store.js
/*import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import propertiesReducer from './reducers/propertiesReducer';

const rootReducer = combineReducers({
  propertiesData: propertiesReducer,
});

const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

export default store;*/