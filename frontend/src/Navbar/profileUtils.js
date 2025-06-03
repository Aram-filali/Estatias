"use client";

export const saveUserProfile = (user) => {
  if (!user) return;

  localStorage.setItem("token", user.token);
  localStorage.setItem("user", JSON.stringify(user));

  // Ajout d'un événement personnalisé pour informer d'autres composants
  window.dispatchEvent(new Event("userLoggedIn"));
};

export const getUserProfile = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const clearUserProfile = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Ajout d'un événement personnalisé pour informer d'autres composants
  window.dispatchEvent(new Event("userLoggedOut"));
};
