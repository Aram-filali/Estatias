// utils/auth.js
export const checkUserRole = (user, requiredRoles) => {
  if (!user || !user.role) return false;
  return requiredRoles.includes(user.role);
};

export const isHost = (user) => {
  return user && user.role === 'host';
};

export const isUser = (user) => {
  return user && user.role === 'user';
};

export const getUserFromStorage = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    return null;
  }
};

export const getUserRole = () => {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('userRole') || localStorage.getItem('userType');
};