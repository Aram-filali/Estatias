const initialState = {
  suggestions: [],
  loading: false,
  error: null,
};

export const suggestionReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_SUGGESTIONS_REQUEST":
      return { ...state, loading: true };
      
    case "FETCH_SUGGESTIONS_SUCCESS":
      return { ...state, loading: false, suggestions: action.payload };

    case "FETCH_SUGGESTIONS_FAILURE":
      return { ...state, loading: false, error: action.error };

    default:
      return state;
  }
};
