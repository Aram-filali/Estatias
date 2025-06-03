import React, { useState, useEffect } from "react";
import { Avatar, Button, Dropdown, Menu, Typography, message, Flex } from "antd";
import { UserOutlined, LogoutOutlined, MailOutlined, CalendarOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import styles from "./Navbar.module.css"; 
  
const ProfileDropdown = () => {
  const [user, setUser] = useState(null);
  const [hostData, setHostData] = useState({});
  const [propertyData, setPropertyData] = useState(null);
  const router = useRouter(); 

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("jwt") || localStorage.getItem("token");

      if (token) {
        /*try {*/
          const decoded = jwtDecode(token);
          setUser(decoded);

          /*const headers = { Authorization: `Bearer ${token}` };
          const hostResponse = await axios.get(
            `http://localhost:3000/hosts/api/getByEmail/${decoded.username}`,
            { headers }
          );
          const hostData = hostResponse.data;
          setHostData(hostData);

          const hostsID = hostData._id;
          const propertyResponse = await axios.get(
            `http://localhost:3000/properties/api/getByHostsID/${hostsID}`,
            { headers }
          );
          setPropertyData(propertyResponse.data);*/
        /*} catch (error) {
          console.error("Erreur de récupération des données :", error);
          setUser(null);
        }*/
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("token");
    router.push("/"); 
    window.location.reload();
  };



  const menuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link href="/editProfile">My Profile</Link>,
    },
    {
      key: "reservation",
      icon: <CalendarOutlined />,
      label: <Link href="/MyBooking">My Reservation</Link>,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

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