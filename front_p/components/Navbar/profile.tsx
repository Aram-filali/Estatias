import { useEffect, useState } from "react";
import { getUserProfile, clearUserProfile } from "./profileUtils";
import { useRouter } from "next/router";
import styles from "./Profile.module.css";
import ProfileDropdown from "./ProfileDropDown";

interface UserProfile {
  fullname?: string;
  email: string;
}

export const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLogoutVisible, setIsLogoutVisible] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const profile = getUserProfile();  // Ensure it's returning UserProfile or null
    setUser(profile);
  }, []);

  const handleLogout = () => {
    clearUserProfile();
    router.push("/");
  };

  return (
    <div>
      <div className={styles.profile} onClick={() => setIsLogoutVisible(!isLogoutVisible)}>
        <h4 style={{ marginTop: "20px", marginRight: "20px" }}>
          {user ? user.fullname || user.email : "User"}
        </h4>
        {isLogoutVisible && <ProfileDropdown onLogout={handleLogout} />}
      </div>
    </div>
  );
};
