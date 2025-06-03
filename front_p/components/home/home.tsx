"use client";
import Link from "next/link";
import styles from "./home.module.css";
import { motion } from "framer-motion";
import { FaSignInAlt, FaHome, FaGlobe, FaCalendarAlt, FaPaintBrush, FaMobileAlt, FaLock, FaRocket, FaStar, FaSync } from "react-icons/fa";
import HeroSection from "../heroSection/heroSection";
import Prices from "../prices/prices";

const fadeInVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function OurHome() {
  return (
    <main className={styles.container}>
      {/* Unified Background with Pattern and Floating Shapes */}
      <div className={styles.unifiedBackground}>
        <div className={styles.backgroundPattern}></div>
        
        {/* Floating geometric shapes */}
        <div className={styles.floatingShapes}>
          <div className={`${styles.shape} ${styles.shape1}`}></div>
          <div className={`${styles.shape} ${styles.shape2}`}></div>
          <div className={`${styles.shape} ${styles.shape3}`}></div>
          <div className={`${styles.shape} ${styles.shape4}`}></div>
          <div className={`${styles.shape} ${styles.shape5}`}></div>
          <div className={`${styles.shape} ${styles.shape6}`}></div>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className={styles.contentWrapper}>
        <HeroSection id="hero" />

        {/* How It Works Section - SEO Enhanced */}
        <motion.section
          id="how-it-works"
          className={styles.howItWorks}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeInVariants}
        >
          <h2 className={styles.sectionTitle}>How to Create Your Vacation Rental Website in 3 Simple Steps</h2>
          <p className={styles.sectionSubtitle}>
            Launch your professional vacation rental website in minutes with our proven 3-step process. No technical skills required.
          </p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <FaSignInAlt className={styles.icon} />
              <h3>1. Sign Up & Get Verified</h3>
              <p>Create your secure account with our verification process. Start your 14-day free trial instantly and explore all features risk-free.</p>
            </div>
            <div className={styles.step}>
              <FaHome className={styles.icon} />
              <h3>2. Add Your Properties</h3>
              <p>Upload property photos, write compelling descriptions, set competitive prices, and add your contact information. Your unique domain is generated automatically.</p>
            </div>
            <div className={styles.step}>
              <FaGlobe className={styles.icon} />
              <h3>3. Launch Your SEO-Optimized Website</h3>
              <p>Your professional vacation rental website goes live instantly with built-in SEO optimization to attract more direct bookings.</p>
            </div>
          </div>
        </motion.section>

        {/* Vacation Rental Section - Enhanced with more SEO keywords */}
        <motion.section
          id="vacation-rental"
          className={styles.vacationRental}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeInVariants}
        >
          <h2 className={styles.sectionTitlee}>Build Your Professional Vacation Rental Website</h2>
          <p className={styles.rentalDescription}>
            Take control of your vacation rental business with our comprehensive website builder. Create a stunning, fully functional property website that generates direct bookings and reduces your dependency on expensive third-party platforms like Airbnb and Booking.com.
          </p>
          <p className={styles.rentalDescription}>
            Join thousands of property owners who have increased their profit margins by up to 25% through direct bookings with zero to minimal transaction fees.
          </p>
          
          <h3 className={styles.featuresTitle}>Complete Vacation Rental Management Platform:</h3>
          <div className={styles.features}>
            <div className={styles.feature}>
              <FaPaintBrush className={styles.featureIcon} />
              <h4>Custom Domain & Professional Branding</h4>
              <p>Get your unique domain name (yourname.resa.com) and build your brand with social media integration. Stand out from generic rental platforms.</p>
            </div>
            <div className={styles.feature}>
              <FaHome className={styles.featureIcon} />
              <h4>Unlimited Property Management</h4>
              <p>Add, edit, and showcase unlimited properties (Premium plan) or up to 4 listings (Standard plan). Upload high-quality images, detailed descriptions, and competitive pricing.</p>
            </div>
            <div className={styles.feature}>
              <FaCalendarAlt className={styles.featureIcon} />
              <h4>Advanced Booking & Calendar Sync</h4>
              <p>Accept or reject reservations directly through your website. Sync calendars with Airbnb, Booking.com, and other platforms to prevent double bookings.</p>
            </div>
            {/*<div className={styles.feature}>
              <FaLock className={styles.featureIcon} />
              <h4>Secure & Verified Platform</h4>
              <p>All hosts are verified for guest safety. Your website and customer data are protected with enterprise-level security measures and SSL encryption.</p>
            </div>*/}
            <div className={styles.feature}>
              <FaRocket className={styles.featureIcon} />
              <h4>SEO-Optimized for Higher Rankings</h4>
              <p>Built-in SEO optimization helps your vacation rental appear in Google search results, attracting more organic traffic and direct bookings.</p>
            </div>
            {/*<div className={styles.feature}>
              <FaMobileAlt className={styles.featureIcon} />
              <h4>Mobile-First Responsive Design</h4>
              <p>Your vacation rental website works perfectly on smartphones, tablets, and desktops. 70% of travelers book on mobile devices.</p>
            </div>*/}
            <div className={styles.feature}>
              <FaStar className={styles.featureIcon} />
              <h4>Guest Reviews & Rating System</h4>
              <p>Build trust with authentic guest reviews and ratings. Showcase your property's reputation and attract quality bookings.</p>
            </div>
            <div className={styles.feature}>
              <FaSync className={styles.featureIcon} />
              <h4>Real-Time Notifications</h4>
              <p>Get instant notifications for new bookings, guest messages, and reservation updates. Never miss an opportunity to earn more revenue.</p>
            </div>
          </div>
          
          <div className={styles.vacationCta}>
            <h3 className={styles.vacationCtaTitle}>Why Choose Our Vacation Rental Website Builder?</h3>
            <ul className={styles.benefitsList}>
              <li><strong>Lower Costs:</strong> Pay only 5% transaction fees (Standard) or 0% fees (Premium) vs 15-20% on other platforms</li>
              <li> <strong>Direct Bookings:</strong> Keep 100% control of your guest relationships and data</li>
              <li> <strong>Higher Profits:</strong> Increase revenue by up to 25% with direct bookings</li>
              <li> <strong>Full Control:</strong> Update prices, availability, and content anytime</li>
              <li> <strong>Professional Presence:</strong> Stand out with your own branded website</li>
              <li> <strong>Expert Support:</strong> Get guidance from our Estatias services team</li>
            </ul>
            <p className={styles.vacationCtaText}>Start your 14-day free trial today and revolutionize your vacation rental business!</p>
            <Link href="/getStarted">
              <button className={styles.ctaButton}>Start Free Trial - Create My Website Now</button>
            </Link>
          </div>
        </motion.section>

        {/* Pricing section */}
        <motion.section
          id="pricing"
          className={styles.pricingSectionn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeInVariants}
        >
          <div className={styles.bgWrapper}>
            {/*<h2 className={styles.pricingTitle}>Affordable Vacation Rental Website Hosting Plans</h2>
            <p className={styles.pricingSubtitle}>
              Choose between our transparent pricing plans. No hidden fees, no long-term contracts. Cancel anytime.
            </p>*/}
            <Prices showButton={false} />
            <div className={styles.pricingBenefits}>
              <h3>What's Included in Every Plan:</h3>
              <div className={styles.benefitsGrid}>
                <div className={styles.benefit}>✔ 14-day free trial</div>
                <div className={styles.benefit}>✔ Custom domain name</div>
                {/*<div className={styles.benefit}>✔ Mobile-responsive design</div>*/}
                <div className={styles.benefit}>✔ SEO optimization</div>
                <div className={styles.benefit}>✔ Calendar synchronization</div>
                <div className={styles.benefit}>✔ Guest review system</div>
                <div className={styles.benefit}>✔ Secure payment processing</div>
               {/* <div className={styles.benefit}>✅ 24/7 customer support</div>*/}
              </div>
            </div>
          </div>
        </motion.section>

        {/* FAQ Section for SEO */}
        <motion.section
          id="faq"
          className={styles.faqSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeInVariants}
        >
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqContainer}>
            <div className={styles.faqItem}>
              <h3>How much can I save compared to Airbnb and Booking.com?</h3>
              <p>With our Standard plan (5% fees) or Premium plan (0% fees), you can save 10-20% compared to traditional platforms that charge 15-20% in total fees. This can increase your annual revenue by thousands of dollars.</p>
            </div>
            <div className={styles.faqItem}>
              <h3>Do I need technical skills to create my vacation rental website?</h3>
              <p>No technical skills required! Our platform is designed for property owners, not developers. Simply add your property details, photos, and pricing – your professional website is generated automatically.</p>
            </div>
            <div className={styles.faqItem}>
              <h3>Can I sync my calendar with Airbnb and other platforms?</h3>
              <p>Yes! Our platform seamlessly syncs with Airbnb, Booking.com, and other major booking platforms to prevent double bookings and manage all your reservations in one place.</p>
            </div>
            <div className={styles.faqItem}>
              <h3>What happens during the 14-day free trial?</h3>
              <p>During your free trial, you can add, update, and delete properties, customize your website, and explore all features. Your properties won't accept live bookings until you choose a paid plan after the trial.</p>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}