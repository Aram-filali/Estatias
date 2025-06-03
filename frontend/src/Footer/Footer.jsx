import React from 'react';
import styles from "./Footer.module.css"; // Import the CSS module
import Link from 'next/link';
import { FaTwitter, FaInstagram, FaFacebookF, FaLinkedinIn, FaDribbble, FaPinterestP, FaApple, FaGoogle } from "react-icons/fa";



export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div>

      {/* Footer Content */}
      <div className={styles.footerContent}>
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
                <li><a href="#" className={styles.pageLink}>Contact</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className={styles.sectionTitle}>Contact</h3>
              <ul className={styles.contactInfo}>
                <li><a href="mailto:mail@example.com" className={styles.contactLink}>mail@example.com</a></li>
                <li><a href="tel:+12222123819" className={styles.contactLink}>+1 222 212 3819</a></li>
                <li><a href="#" className={styles.contactLink}>43 Raymouth Rd. Baltemoer, London 3910</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className={styles.footerBottom}>
        <p className={styles.footerText}>
          Copyright &copy; {currentYear}. All Rights Reserved. &mdash; Designed with love by 
          <a href="https://untree.co" className={styles.footerLink}>Untree.co</a> 
          Distributed By <a href="https://themewagon.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>ThemeWagon</a>
        </p>
      </div>
    </div>
  );
}






/*import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div>
     
      <div className="py-16 bg-gray-800 text-center">
        <div className="container mx-auto">
          <h2 className="mb-4 text-3xl text-white">Lets you Explore the Best. Contact Us Now</h2>
          <p className="mb-4 text-white opacity-75">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Excepturi, fugit?
          </p>
          <p className="mb-0">
            <a href="booking.html" className="inline-block bg-white text-gray-800 hover:bg-gray-200 px-6 py-3 text-lg font-semibold rounded-md">
              Get in touch
            </a>
          </p>
        </div>
      </div>

  
      <div className="bg-gray-900 text-white py-16">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
       
            <div>
              <h3 className="text-xl font-semibold mb-4">About Tour</h3>
              <p className="text-gray-400">
                Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.
              </p>
            </div>

       
            <div>
              <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
              <ul className="flex space-x-4">
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-twitter"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-instagram"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-facebook"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-linkedin"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-dribbble"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-pinterest"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-apple"></span></a></li>
                <li><a href="#" className="text-gray-400 hover:text-white"><span className="icon-google"></span></a></li>
              </ul>
            </div>

          
            <div>
              <h3 className="text-xl font-semibold mb-4">Pages</h3>
              <ul>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>

        
            <div>
              <h3 className="text-xl font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><a href="mailto:mail@example.com" className="text-gray-400 hover:text-white">mail@example.com</a></li>
                <li><a href="tel:+12222123819" className="text-gray-400 hover:text-white">+1 222 212 3819</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">43 Raymouth Rd. Baltemoer, London 3910</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

   
      <div className="bg-gray-800 text-center py-6">
        <p className="text-gray-400">
          Copyright &copy; {currentYear}. All Rights Reserved. &mdash; Designed with love by 
          <a href="https://untree.co" className="text-white hover:text-gray-300">Untree.co</a> 
          Distributed By <a href="https://themewagon.com" target="_blank" className="text-white hover:text-gray-300">ThemeWagon</a>
        </p>
      </div>
    </div>
  );
}*/