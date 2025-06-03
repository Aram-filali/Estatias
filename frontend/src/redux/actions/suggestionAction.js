export const getSuggestions = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: "FETCH_SUGGESTIONS_REQUEST" }); // Début du chargement

      const response = await fetch("/api/suggestions"); // Modifie l'URL si nécessaire
      const data = await response.json();

      dispatch({ type: "FETCH_SUGGESTIONS_SUCCESS", payload: data }); // Succès
    } catch (error) {
      dispatch({ type: "FETCH_SUGGESTIONS_FAILURE", error: error.message }); // Échec
    }
  };
};
