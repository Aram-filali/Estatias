// "use client";

// Define a User type to give better type safety for user data

  interface User {
    token: string;
    userData: {
      email: string;
      fullname?: string;
    };
  }
  
  interface UserProfile {
    fullname?: string;
    email: string;
  }
  
  
  export const saveUserProfile = (user: User | null) => {
    if (!user) return;
  
    localStorage.setItem("token", user.token);
    localStorage.setItem("user", JSON.stringify(user));
  
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new Event("userLoggedIn"));
  };
  
  export const getUserProfile = (): UserProfile | null => {
    const user = localStorage.getItem("user");
    if (!user) return null;
  
    const parsedUser = JSON.parse(user) as User;
    return {
      email: parsedUser.userData.email,
      fullname: parsedUser.userData.fullname,
    };
  };
  
  
  export const clearUserProfile = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new Event("userLoggedOut"));
  };
  