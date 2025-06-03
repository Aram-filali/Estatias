
export const initializeFormToggle2 = () => {
  const container = document.getElementById('sign-up-container');
  const registerBtn = document.getElementById('register');
  const loginBtn = document.getElementById('login');

  if (container && registerBtn && loginBtn) {
    registerBtn.addEventListener('click', () => {
      container.classList.add("active");
      document.querySelector('.sign-in-form').classList.add('hidden');
      document.querySelector('.sign-up-form').classList.remove('hidden');
    });

    loginBtn.addEventListener('click', () => {
      container.classList.remove("active");
      document.querySelector('.sign-in-form').classList.remove('hidden');
      document.querySelector('.sign-up-form').classList.add('hidden');
    });
  } else {
    console.error("Les éléments ne sont pas trouvés dans le DOM.");
  }
};
