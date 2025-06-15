import OurHome from "@/components/home/home";
import { Metadata } from "next";

// Structured Data Scripts Component
function StructuredDataScripts() {
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

  const organizationData = {
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
    </>
  );
}

// Metadata pour l'App Router
export const metadata: Metadata = {
  title: "Vacation Rental Website Builder | Create Direct Booking Sites | Bypass Airbnb Fees - Estatias",
  description: "Build professional vacation rental websites with direct booking capabilities. Increase revenue by 25% with 0-5% fees vs 15-20% on Airbnb. 14-day free trial, SEO-optimized, mobile-responsive. Start now!",
  keywords: "vacation rental website builder, direct booking platform, Airbnb alternative, property management software, vacation rental SEO, holiday rental website, short term rental platform, booking site creator, rental property marketing, vacation home website, bypass airbnb fees, direct booking system",
  authors: [{ name: "Estatias" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    url: "https://estatias.com/",
    title: "Create Professional Vacation Rental Websites | Bypass Platform Fees - Estatias",
    description: "Launch your vacation rental website in minutes. Direct bookings, calendar sync, SEO optimization, and up to 25% more revenue. 14-day free trial!",
    images: [
      {
        url: "https://estatias.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Estatias - Vacation Rental Website Builder"
      }
    ],
    siteName: "Estatias",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    site: "@estatias",
    title: "Vacation Rental Website Builder | Direct Bookings | Bypass Airbnb Fees",
    description: "Create professional vacation rental websites. Increase revenue by 25% with direct bookings. SEO-optimized, mobile-responsive. Start 14-day free trial!",
    images: ["https://estatias.com/twitter-image.jpg"]
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/site.webmanifest",
  viewport: "width=device-width, initial-scale=1.0",
  themeColor: "#3B82F6",
  alternates: {
    canonical: "https://estatias.com/"
  },
  other: {
    "geo.region": "US",
    "geo.placename": "United States",
    "rating": "4.8",
    "price": "29-49 USD",
    "priceCurrency": "USD"
  }
};

export default function Home() {
  return (
    <>
      <StructuredDataScripts />
      <OurHome />
    </>
  );
}