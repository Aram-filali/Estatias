"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Navbar.module.css"

export const ExploreDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    { id: "hero", label: "Home" },
    { id: "how-it-works", label: "How It Works" },
    { id: "vacation-rental", label: "Vacation Rental" },
    { id: "pricing", label: "Pricing" }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.exploreDropdown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.exploreButton}
      >
        Explore <ChevronDown className={styles.chevronIcon} />
      </button>
      {isOpen && (
        <ul className={styles.dropdownMenu}>
          {sections.map((section) => (
            <li
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={styles.dropdownItem}
            >
              {section.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};