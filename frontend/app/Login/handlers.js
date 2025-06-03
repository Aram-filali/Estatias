/*import axios from "axios";
import { saveUserProfile } from "../../src/Navbar/profileUtils";
import { completeSignOut, signInWithGoogle } from "../../src/firebase";

export const handleSubmitHandler = async ({
  e,
  fullname,
  email,
  password,
  displayPopup,
  router,
}) => {
  e.preventDefault();

  if (!fullname || !email || !password) {
    displayPopup("All fields are required!", "error");
    return;
  }

  try {
    const response = await axios.post("http://localhost:3000/users/signup", {
      fullname,
      email,
      password,
    });

    if (response.status === 201 && response.data.access_token) {
      saveUserProfile({ fullname, email, token: response.data.access_token });
      displayPopup("Sign-up successful! Redirecting...", "success", 500);
      setTimeout(() => {
        router.push("/");
      }, 500);
    }
  } catch (error) {
    const msg = error.response?.data?.message || "Sign-up error";
    displayPopup(msg, "error");
  }
};

export const handleLoginHandler = async ({
  e,
  email,
  password,
  displayPopup,
  router,
}) => {
  e.preventDefault();

  if (!email || !password) {
    displayPopup("All fields are required!", "error");
    return;
  }

  try {
    await completeSignOut();

    const response = await axios.post("http://localhost:3000/users/login", {
      email,
      password,
    });

    if (response.data?.idToken) {
      localStorage.setItem("token", response.data.idToken);
      localStorage.setItem("user", JSON.stringify(response.data.user || { email }));
      window.dispatchEvent(new Event("userLoggedIn"));
      displayPopup("Login successful! Redirecting...", "success", 500);
      setTimeout(() => {
        router.push("/");
      }, 500);
    } else {
      displayPopup("Login failed. No idToken received.", "error");
    }
  } catch (error) {
    const msg = error.response?.data?.message || "Login error";
    displayPopup(msg, "error");
  }
};

export const handleGoogleSignInHandler = async ({ displayPopup, router }) => {
    try {
      await completeSignOut();
  
      const user = await signInWithGoogle();
      if (user) {
        const token = await user.getIdToken();
  
        const response = await axios.post("http://localhost:3000/users/login-google", {
          idToken: token,
        });
  
        if (response.status === 200 && response.data.user) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
  
          window.dispatchEvent(new Event("userLoggedIn"));
  
          displayPopup("Google login successful! Redirecting...", "success", 500);
  
          setTimeout(() => {
            router.push("/");
          }, 500);
        } else {
          displayPopup("Authentication failed. Please try again.", "error");
        }
      }
    } catch (error) {
      displayPopup("Error during Google login. Please try again.", "error");
    }}

    export const handleGoogleSignUpHandler = async ({ displayPopup, router }) => {
        try {
          await completeSignOut();
      
          const user = await signInWithGoogle();
          if (user) {
            const token = await user.getIdToken();
      
            const response = await axios.post("http://localhost:3000/users/signup-google", {
              idToken: token,
            });
      
            if (response.status === 200 && response.data.user) {
              localStorage.setItem("token", token);
              localStorage.setItem("user", JSON.stringify(response.data.user));
      
              window.dispatchEvent(new Event("userLoggedIn"));
      
              displayPopup("Google login successful! Redirecting...", "success", 500);
      
              setTimeout(() => {
                router.push("/");
              }, 500);
            } else {
              displayPopup("Authentication failed. Please try again.", "error");
            }
          }
        } catch (error) {
          displayPopup("Error during Google login. Please try again.", "error");
        }
    
  };*/
  