"use client";
import { useState } from "react";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
];

const LanguageDropdown = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full h-full"
      >
        <Globe className="w-5 h-5" />
      </button>
      {isOpen && (
        <ul className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-lg overflow-hidden z-50">
          {languages.map((lang) => (
            <li
              key={lang.code}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800"
            >
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageDropdown;