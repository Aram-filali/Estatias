'use client';
import React, { useState, useEffect } from 'react';
import styles from "./Footer.module.css";
import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState({
    facebook: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    youtube: null,
    tiktok: null
  });
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchSocialLinks = async () => {
      const hostUid = process.env.NEXT_PUBLIC_HOST_ID;

      if (!hostUid) return;

      try {
        const response = await fetch(`${baseUrl}/hosts/socials/${hostUid}`);
        if (response.ok) {
          const data = await response.json();
          setSocialLinks(data.socials);
        } else {
          console.error('Failed to fetch social links');
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };

    fetchSocialLinks();
  }, [baseUrl]); // Fixed dependency - hostUid is constant from env

  // Helper function to render social link or return null if URL is not available
  const renderSocialLink = (url, icon, platform) => {
    if (!url) return null;
    
    return (
      <li key={platform}>
        <Link href={url} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
          {icon}
        </Link>
      </li>
    );
  };

  return (
    <div>
      {/* Footer Content */}
      <div className={styles.footerContent}>
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* About Section */}
            <div>
              <h3 className={styles.sectionTitle}>About Us</h3>
              <p className={styles.sectionText}>
                Discover your perfect stay with ease. Our platform connects travelers with unique short-term rentals offering comfort, convenience, and a home away from home.
              </p>
            </div>

            {/* Social Media Links */}
            <div>
              <h3 className={styles.sectionTitle}>Follow Us</h3>
              <ul className={styles.socialLinks}>
                {renderSocialLink(socialLinks.facebook, <FaFacebookF />, 'facebook')}
                {renderSocialLink(socialLinks.instagram, <FaInstagram />, 'instagram')}
                {renderSocialLink(socialLinks.twitter, <FaTwitter />, 'twitter')}
                {renderSocialLink(socialLinks.linkedin, <FaLinkedinIn />, 'linkedin')}
                {renderSocialLink(socialLinks.youtube, <FaYoutube />, 'youtube')}
                {renderSocialLink(socialLinks.tiktok, <FaTiktok />, 'tiktok')}
              </ul>
              {/* Show message if no social links are available */}
              {Object.values(socialLinks).every(link => !link) && (
                <p className={styles.sectionText} style={{ fontSize: '14px', opacity: 0.7 }}>
                  Social links coming soon
                </p>
              )}
            </div>

            {/* Pages Links */}
            <div>
              <h3 className={styles.sectionTitle}>Pages</h3>
              <ul className={styles.pagesLinks}>
                <li><a href="#" className={styles.pageLink}>Blog</a></li>
                <li><a href="#" className={styles.pageLink}>About</a></li>
                <li><a href="#" className={styles.pageLink}>Contact</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className={styles.sectionTitle}>Contact</h3>
              <ul className={styles.contactInfo}>
                <li><a href="mailto:mail@example.com" className={styles.contactLink}>mail@example.com</a></li>
                <li><a href="tel:+12222123819" className={styles.contactLink}>+1 222 212 3819</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className={styles.footerBottom}>
        <p className={styles.footerText}>
                Copyright &copy; {currentYear}. All Rights Reserved. &mdash; 
                Powered By <a href="https://www.onrtech.fr/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>ONRTECH</a>
        </p>
      </div>

  
    </div>
  );
}