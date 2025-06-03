// toggleForms.js
/*export const initializeFormToggle = () => {
    const container = document.getElementById('containerSignUp');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');
    
    registerBtn.addEventListener('click', () => {
      container.classList.add("active");
    });
    
    loginBtn.addEventListener('click', () => {
      container.classList.remove("active");
    });
  };*/ 
  export const initializeFormToggle = () => {
    document.addEventListener("DOMContentLoaded", () => { // Attendre que le DOM soit chargé
        const container = document.getElementById('containerSignUp');
        const registerBtn = document.getElementById('register');
        const loginBtn = document.getElementById('login');

        if (container && registerBtn && loginBtn) { // Vérifier si les éléments existent
            registerBtn.addEventListener('click', () => {
                container.classList.add("active");
            });

            loginBtn.addEventListener('click', () => {
                container.classList.remove("active");
            });
        } else {
            console.error("Les boutons register ou login n'existent pas dans le DOM.");
        }
    });
};

  