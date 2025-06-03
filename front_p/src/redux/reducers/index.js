import { combineReducers } from 'redux';
import suggestionsReducer from './suggestionsReducer';
import propertyReducer from './propertiesReducer';

const rootReducer = combineReducers({
    suggestionsData: suggestionsReducer, // Nom utilisé dans useSelector dans Stays.js
    propertyData: propertyReducer,
    // ... autres reducers
});

export default rootReducer;
