import React, { ReactNode } from "react";
import Head from "next/head";
import Script from "next/script";
import AppProviders from "../src/providers/AppProviders";
import { Navbar } from "../src/Navbar/Navbar";
import Footer from "../src/Footer/Footer";
import "/styles/stayss.css";
import "/styles/styleSignupLogin.css";
import '/styles/PropertyReview.css';
import "/styles/propertyDetails.css";
import "/styles/reviewSection.css";
import "/styles/gallery.css";
import "/styles/bookingComponent.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: object;
  noIndex?: boolean;
}

export default function RootLayout({ 
  children,
  title = "Estatias - Direct Property Rentals | Book Affordable Short-Stay Accommodations",
  description = "Discover and book unique properties directly from owners. Save money on short-stay rentals with no booking fees. Direct communication with hosts for personalized experiences.",
  keywords = "property rental, short stay, vacation rental, direct booking, affordable accommodation, property owners, rental platform, holiday homes",
  canonicalUrl,
  ogImage = "/public/og-image.jpg",
  jsonLd,
  noIndex = false
}: LayoutProps) {
  
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Estatias",
    "description": description,
    "url": typeof window !== 'undefined' ? window.location.origin : '',
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Estatias",
      "logo": {
        "@type": "ImageObject",
        "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/public/logo.png`
      }
    }
  };

  return (
    <html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Estatias" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Robots Meta */}
        {noIndex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        )}
        
        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Favicon and Icons */}
        <link rel="icon" type="image/png" href="/public/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/public/favicon.svg" />
        <link rel="shortcut icon" href="/public/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Estatias" />
        <link rel="manifest" href="/public/site.webmanifest" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Estatias" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content="Estatias - Direct Property Rentals Platform" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content="Estatias - Direct Property Rentals Platform" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="theme-color" content="#1a202c" />
        <meta name="msapplication-TileColor" content="#1a202c" />
        <meta name="application-name" content="Estatias" />
        
        {/* Language and Region */}
        <meta httpEquiv="content-language" content="en-US" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        
        {/* Performance and Preconnects */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd || defaultJsonLd)
          }}
        />
      </Head>
          
      <body>
        {/* Google Analytics (replace GA_MEASUREMENT_ID with your actual ID) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
        
        {/* Schema.org Organization Markup for Brand Recognition */}
        <Script id="organization-schema" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Estatias",
              "description": "Direct property rental platform connecting travelers with property owners",
              "url": "${typeof window !== 'undefined' ? window.location.origin : ''}",
              "logo": "${typeof window !== 'undefined' ? window.location.origin : ''}/public/logo.png",
              "sameAs": [
                "https://facebook.com/estatias",
                "https://twitter.com/estatias",
                "https://instagram.com/estatias"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "English"
              }
            }
          `}
        </Script>
        
        <AppProviders>
          <Navbar />
          <main role="main">
            {children}
          </main>
          <Footer />
        </AppProviders>    
      </body>
    </html> 
  );
}