import type { Metadata } from "next";
import "styles/globals.css";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer/Footer";
import { Navbar } from "@/components/Navbar/Navbar";
import { HostProvider } from "@/components/addProperty/HostProvider";
import { ConditionalNavbarAndFooter } from "@/components/addProperty/ConditionalNavbarAndFooter";

// Enable metadata
export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3001'),
  title: {
    default: "Real Estate Website Generator - Create Professional Property Websites",
    template: "%s | Real Estate Website Generator"
  },
  description: "Create stunning, professional real estate websites in minutes. Perfect for agents, brokers, and property owners. No coding required - just upload your properties and go live!",
  keywords: "real estate website builder, property website generator, real estate agent websites, property listings, real estate marketing",
  authors: [{ name: "Estatias" }],
  creator: "Estatias",
  publisher: "Estatias",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'http://localhost:3001',
    siteName: 'Real Estate Website Generator',
    title: 'Real Estate Website Generator - Create Professional Property Websites',
    description: 'Create stunning, professional real estate websites in minutes. Perfect for agents, brokers, and property owners.',
    images: [
      {
        url: '/og-image.jpg', // 1200x630px
        width: 1200,
        height: 630,
        alt: 'Real Estate Website Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real Estate Website Generator',
    description: 'Create stunning, professional real estate websites in minutes.',
    images: ['/twitter-image.jpg'], // 1200x600px
  },
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  alternates: {
    canonical: 'http://localhost:3001',
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Additional meta tags */}
        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Real Estate Website Generator",
              "description": "Create stunning, professional real estate websites in minutes",
              "url": "https://yourdomain.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Your Company Name"
              }
            })
          }}
        />
      </head>
      <body>
        <HostProvider>
          <ConditionalNavbarAndFooter>
            {children}
          </ConditionalNavbarAndFooter>
        </HostProvider>
      </body>
    </html>
  );
}