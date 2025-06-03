"use client";
import React from "react";
import styles from "./Footer.module.css"; // Import the CSS module
import Link from "next/link";
import { motion } from "framer-motion";

import {
  FaTwitter,
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
  FaDribbble,
  FaPinterestP,
  FaApple,
  FaGoogle,
} from "react-icons/fa";
/*ss*/
const fadeInVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const Footer: React.FC = () => {
  const currentYear: number = new Date().getFullYear();

  return (
    
    <div>
      
      {/* CTA Section */}
      <motion.div className={styles.ctaSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      variants={fadeInVariants}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Lets you Explore the Best. Contact Us Now</h2>
          <p className={styles.ctaSubtitle}>
            Tired of losing a significant portion of your revenue to third-party booking platforms?
          </p>
          <p className={styles.ctaButtonWrapper}>
            <Link href="/contact" className={styles.ctaButton}>
              Get in touch
            </Link>
          </p>
        </div>
      
     
        <hr className="w-full border-t border-white opacity-50 my-4" />


      {/* Footer Content */}
      


      <div className={styles.footerContent} >
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* About Section */}
            <div>
              <h3 className={styles.sectionTitle}>About Tour</h3>
              <p className={styles.sectionText}>
                Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.
              </p>
            </div>

            {/* Social Media Links */}
            <div>
              <h3 className={styles.sectionTitle}>Follow Us</h3>
              <ul className={styles.socialLinks}>
                <li><Link href="#" className={styles.socialLink}><FaTwitter /></Link></li>
                <li><Link href="#" className={styles.socialLink}><FaInstagram /></Link></li>
                <li><Link href="#" className={styles.socialLink}><FaFacebookF /></Link></li>
                <li><Link href="#" className={styles.socialLink}><FaLinkedinIn /></Link></li>
                <li><Link href="#" className={styles.socialLink}><FaApple /></Link></li>
                <li><Link href="#" className={styles.socialLink}><FaGoogle /></Link></li>
              </ul>
            </div>

            {/* Pages Links */}
            <div>
              <h3 className={styles.sectionTitle}>Pages</h3>
              <ul className={styles.pagesLinks}>
                <li><a href="#" className={styles.pageLink}>Blog</a></li>
                <li><a href="#" className={styles.pageLink}>About</a></li>
                <li><Link href="/contact" className={styles.pageLink}>Contact</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className={styles.sectionTitle}>Contact</h3>
              <ul className={styles.contactInfo}>
                <li><a href="mailto:estatias.services@gmail.com" className={styles.contactLink}>estatias.services@gmail.com</a></li>
                <li><a href="tel:+12222123819" className={styles.contactLink}>+1 222 212 3819</a></li>
                
              </ul>
            </div>
          </div>
        </div>
        </div>
      
      
        <hr className="w-full border-t border-white opacity-50 my-4" />


      {/* Footer Bottom */}
      
      <div className={styles.footerBottom} >
        <p className={styles.footerText}>
          Copyright &copy; {currentYear}. All Rights Reserved. &mdash; 
          Powered By <a href="https://www.onrtech.fr/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>ONRTECH</a>
        </p>
      </div>
      </motion.div>
    </div>
   
  );
};

export default Footer;
