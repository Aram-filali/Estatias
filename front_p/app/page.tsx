import OurHome from "@/components/home/home";
import { motion } from "framer-motion";
import Head from "next/head";

// SEO Metadata Component
const SEOMetadata = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Estatias - Vacation Rental Website Builder",
    "description": "Create professional vacation rental websites with direct booking capabilities. Bypass Airbnb fees and increase revenue by up to 25% with our SEO-optimized platform.",
    "url": "https://estatias.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": [
      {
        "@type": "Offer",
        "name": "Standard Plan",
        "price": "29",
        "priceCurrency": "USD",
        "priceValidUntil": "2025-12-31",
        "description": "Professional vacation rental website with 5% transaction fees"
      },
      {
        "@type": "Offer", 
        "name": "Premium Plan",
        "price": "49",
        "priceCurrency": "USD",
        "priceValidUntil": "2025-12-31",
        "description": "Premium vacation rental website with zero transaction fees"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1247"
    },
    "author": {
      "@type": "Organization",
      "name": "Estatias"
    }
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much can I save compared to Airbnb and Booking.com?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "With our Standard plan (5% fees) or Premium plan (0% fees), you can save 10-20% compared to traditional platforms that charge 15-20% in total fees. This can increase your annual revenue by thousands of dollars."
        }
      },
      {
        "@type": "Question", 
        "name": "Do I need technical skills to create my vacation rental website?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No technical skills required! Our platform is designed for property owners, not developers. Simply add your property details, photos, and pricing – your professional website is generated automatically."
        }
      },
      {
        "@type": "Question",
        "name": "Can I sync my calendar with Airbnb and other platforms?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our platform seamlessly syncs with Airbnb, Booking.com, and other major booking platforms to prevent double bookings and manage all your reservations in one place."
        }
      }
    ]
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>Vacation Rental Website Builder | Create Direct Booking Sites | Bypass Airbnb Fees - Estatias</title>
      <meta name="title" content="Vacation Rental Website Builder | Create Direct Booking Sites | Bypass Airbnb Fees - Estatias" />
      <meta name="description" content="Build professional vacation rental websites with direct booking capabilities. Increase revenue by 25% with 0-5% fees vs 15-20% on Airbnb. 14-day free trial, SEO-optimized, mobile-responsive. Start now!" />
      <meta name="keywords" content="vacation rental website builder, direct booking platform, Airbnb alternative, property management software, vacation rental SEO, holiday rental website, short term rental platform, booking site creator, rental property marketing, vacation home website, bypass airbnb fees, direct booking system" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="Estatias" />


      <link rel="icon" type="image/png" href="/public/favicon-96x96.png" sizes="96x96" />
      <link rel="icon" type="image/svg+xml" href="/public/favicon.svg" />
      <link rel="shortcut icon" href="/public/./favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon.png" />
      <meta name="apple-mobile-web-app-title" content="Estatias" />
      <link rel="manifest" href="/public/site.webmanifest" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://estatias.com/" />
      <meta property="og:title" content="Create Professional Vacation Rental Websites | Bypass Platform Fees - Estatias" />
      <meta property="og:description" content="Launch your vacation rental website in minutes. Direct bookings, calendar sync, SEO optimization, and up to 25% more revenue. 14-day free trial!" />
      <meta property="og:image" content="https://estatias.com/og-image.jpg" />
      <meta property="og:site_name" content="Estatias" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://estatias.com/" />
      <meta property="twitter:title" content="Vacation Rental Website Builder | Direct Bookings | Bypass Airbnb Fees" />
      <meta property="twitter:description" content="Create professional vacation rental websites. Increase revenue by 25% with direct bookings. SEO-optimized, mobile-responsive. Start 14-day free trial!" />
      <meta property="twitter:image" content="https://estatias.com/twitter-image.jpg" />
      
      {/* Additional SEO Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#3B82F6" />
      <link rel="canonical" href="https://estatias.com/" />
      
      {/* Geo Tags for Local SEO */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
      
      {/* Business/Service Tags */}
      <meta name="rating" content="4.8" />
      <meta name="price" content="29-49 USD" />
      <meta name="priceCurrency" content="USD" />
      
      {/* Structured Data - Main Application */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Structured Data - FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      {/* Organization Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Estatias",
            "url": "https://estatias.com",
            "logo": "https://estatias.com/logo.png",
            "description": "Leading vacation rental website builder helping property owners create direct booking websites and bypass expensive platform fees.",
            "foundingDate": "2023",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": "English"
            },
            "sameAs": [
              "https://twitter.com/estatias",
              "https://facebook.com/estatias",
              "https://linkedin.com/company/estatias"
            ]
          })
        }}
      />
    </Head>
  );
};

export default function Home() {
  return (
    <>
      <SEOMetadata />
      <OurHome />
    </>
  );
}