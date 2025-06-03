import ContactForm from '@/components/contact/contactForm'; // your form with 'use client'

export const metadata = {
  title: "Contact Estatias Services - Real Estate Website Platform",
  description: "Get in touch with Estatias Services to launch your real estate website and manage properties effectively.",
};

export default function ContactPage() {
  return (
    <>
      {/* You can put structured data here */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ 
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "mainEntity": {
              "@type": "Organization",
              "name": "Estatias Services",
              "description": "Professional website generation platform for real estate owners and property hosts",
              "email": "estatias.services@gmail.com",
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "email": "estatias.services@gmail.com",
                "availableLanguage": "English"
              },
              "areaServed": "Worldwide",
              "serviceType": "Real Estate Website Development & Property Management Platform"
            }
          })
        }}
      />

      
      {/* Your interactive form (client component) */}
      <ContactForm />
    </>
  );
}

