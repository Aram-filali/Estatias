import React from "react";
import styles from "./popup.module.css"; // Assure-toi d'ajouter des styles CSS pour la modale

interface PopupProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ message, type, onClose }) => {
  return (
    <div className={styles.popupOverlay}>
      <div className={`${styles.popup} ${type === "success" ? styles.success : styles.error}`}>
        <div className={styles.popupMessage}>{message}</div>
        <button className={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Popup;
