import React from "react";
import styles from "./Popup.module.css";

interface PopupProps {
  message: string;
  type: "success" | "error";
}

const Popup: React.FC<PopupProps> = ({ message, type }) => {
  return (
    <div className={styles.popupOverlay}>
      <div className={`${styles.popup} ${type === "success" ? styles.success : styles.error}`}>
        <div className={styles.popupMessage}>{message}</div>
      </div>
    </div>
  );
};

export default Popup;
