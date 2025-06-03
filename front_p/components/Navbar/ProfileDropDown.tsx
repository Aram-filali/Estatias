"use client";
import React, { useState, useEffect } from "react";
import { Avatar, Button, Dropdown, Menu, message, MenuProps  } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {jwtDecode} from "jwt-decode";
import axios from "axios";

// Define types for the user and host data
interface User {
  username: string;
  email: string;
}

interface HostData {
  _id: string;
  email: string;
  username: string;
}

interface PropertyData {
  _id: string;
  location: {
    city: string;
  };
}

// Define props interface
interface ProfileDropdownProps {
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hostData, setHostData] = useState<HostData | {}>({});
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("jwt") || localStorage.getItem("token");

      if (token) {
        try {
          const decoded = jwtDecode<User>(token);
          setUser(decoded);

          const headers = { Authorization: `Bearer ${token}` };
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
          setPropertyData(propertyResponse.data);
        } catch (error) {
          console.error("Erreur de récupération des données :", error);
          setUser(null);
        }
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("token");
    //message.success("Logout successful !");
    router.push("/"); // Redirect to the home page
    window.location.reload(); // Reload the page
    onLogout(); 
  };

  const profileData = propertyData
    ? `/search/${propertyData.location?.city}/${propertyData._id}`
    : `/`;

    const items: MenuProps["items"] = [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: <a href={profileData}>My Profile</a>,
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
      <Dropdown menu={{ items }} trigger={["click"]}>
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
