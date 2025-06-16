import React, { useState, useEffect } from "react";
import { Avatar, Button, Dropdown, Menu, Typography, message, Flex } from "antd";
import { UserOutlined, LogoutOutlined, MailOutlined, CalendarOutlined, DashboardOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import styles from "./Navbar.module.css";

const ProfileDropdown = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [hostData, setHostData] = useState({});
  const [propertyData, setPropertyData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("jwt") || localStorage.getItem("token");
      
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setUser(decoded);
          console.log("Decoded user:", decoded); // Debug log
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    };

    fetchData();
  }, []);

  // Use the onLogout prop instead of local handleLogout
  const handleLogout = async () => {
    try {
      // Clear JWT tokens first (for backward compatibility)
      localStorage.removeItem("jwt");
      localStorage.removeItem("token");
      
      // Call the parent logout function which handles Firebase logout
      if (onLogout) {
        await onLogout();
      } else {
        // Fallback if no onLogout prop is provided
        router.push("/");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback logout
      router.push("/");
      window.location.reload();
    }
  };

  // Create menu items based on user role
  const createMenuItems = () => {
    const items = [];

    // Check user role and add appropriate menu items
    if (user?.role === "host") {
      // For hosts: show Dashboard option
      items.push({
        key: "dashboard",
        icon: <DashboardOutlined />,
        label: <Link href="/MyWebsite">Dashboard</Link>,
      });
    } else if (user?.role === "user" || !user?.role) {
      // For regular users or users without role: show Profile and Booking options
      items.push(
        {
          key: "profile",
          icon: <UserOutlined />,
          label: <Link href="/editProfile">My Profile</Link>,
        },
        {
          key: "reservation",
          icon: <CalendarOutlined />,
          label: <Link href="/MyBooking">My Reservation</Link>,
        }
      );
    }

    // Add divider and logout for all users
    items.push(
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        onClick: handleLogout,
      }
    );

    return items;
  };

  const menuItems = createMenuItems();

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      overlayClassName={styles.highZIndexDropdown}
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