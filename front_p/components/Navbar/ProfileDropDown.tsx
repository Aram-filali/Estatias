"use client";
import React, { useState, useEffect } from "react";
import { Avatar, Button, Dropdown, MenuProps } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/contexts/firebaseConfig";

// User type with role
interface User {
  username?: string;
  email: string;
  role?: "host" | "admin" | string;
  uid?: string;
}

interface ProfileDropdownProps {
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token to access custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const customClaims = idTokenResult.claims;
          
          console.log("Custom claims:", customClaims);
          
          setUser({
            email: firebaseUser.email || "",
            role: customClaims.role as "host" | "admin" | string,
            uid: firebaseUser.uid,
            username: firebaseUser.email?.split("@")[0] || "User",
          });
        } catch (error) {
          console.error("Error getting user token:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userType");
    router.push("/");
    window.location.reload();
    onLogout();
  };

  const handleDashboardClick = () => {
    console.log("Dashboard clicked, user:", user);
    
    if (!user) {
      console.log("No user found, redirecting to home");
      router.push("/");
      return;
    }

    console.log("User role:", user.role);
    
    if (user.role === "host") {
      console.log("Redirecting to /dashboard");
      router.push("/dashboard");
    } else if (user.role === "admin") {
      console.log("Redirecting to /adminn");
      router.push("/adminn");
    } else {
      console.log("Unknown role, redirecting to home");
      router.push("/");
    }
  };

  const items: MenuProps["items"] = [
    {
      key: "dashboard",
      icon: <UserOutlined />,
      label: "Dashboard",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  // Don't render if still loading
  if (loading) {
    return (
      <Button type="text" shape="circle">
        <Avatar icon={<UserOutlined />} size={50} />
      </Button>
    );
  }

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items,
        onClick: ({ key }) => {
          console.log("Menu item clicked:", key);
          if (key === "dashboard") handleDashboardClick();
          else if (key === "logout") handleLogout();
        },
      }}
    >
      <Button type="text" shape="circle">
        <Avatar
          src="assets/images/hero-slider-1.jpg"
          icon={<UserOutlined />}
          size={50}
        />
      </Button>
    </Dropdown>
  );
};

export default ProfileDropdown;