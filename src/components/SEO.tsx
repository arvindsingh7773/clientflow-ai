import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  ogType?: string;
  ogImage?: string;
}

export function SEO({ 
  title, 
  description = "Connect with top-vetted global clients, elite freelancers, and top-tier agencies on ClientFlow AI. Powered by intelligent Gemini AI matchmaking, automated project scoping, and secure escrow payments.", 
  ogType = 'website', 
  ogImage = 'https://img.icons8.com/fluency/512/000000/artificial-intelligence.png' 
}: SEOProps) {
  useEffect(() => {
    // Update Document Title
    document.title = `${title} | ClientFlow AI`;

    // Helper to set/update meta tag
    const setMetaTag = (attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Description
    setMetaTag('name', 'description', description);

    // Open Graph Tags
    setMetaTag('property', 'og:title', `${title} | ClientFlow AI`);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', ogImage);

    // Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', `${title} | ClientFlow AI`);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // Dynamic Schema.org JSON-LD structured data
    let schemaElement = document.getElementById('jsonld-schema');
    if (!schemaElement) {
      schemaElement = document.createElement('script');
      schemaElement.setAttribute('id', 'jsonld-schema');
      schemaElement.setAttribute('type', 'application/ld+json');
      document.head.appendChild(schemaElement);
    }
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "ClientFlow AI",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "description": description,
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1048"
      }
    };
    schemaElement.textContent = JSON.stringify(structuredData);
  }, [title, description, ogType, ogImage]);

  return null;
}
