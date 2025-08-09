import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noindex?: boolean;
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = 'Wheels and Wins - #1 RV Trip Planning & Budget Management App',
  description = 'Plan RV trips, track expenses & connect with 50,000+ RVers. Free AI assistant PAM helps optimize routes, find campgrounds & manage budgets.',
  keywords = 'RV trip planner, RV budget tracker, RV community, full time RV living',
  canonicalUrl,
  ogImage = 'https://wheelsandwins.com/opengraph-image.png',
  noindex = false,
  structuredData
}) => {
  const baseUrl = 'https://wheelsandwins.com';
  const fullCanonicalUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Robots Meta */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      
      {/* Twitter Card */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'Wheels and Wins - #1 RV Trip Planning & Budget App | USA & Canada',
    description: 'Plan RV trips, track expenses & connect with 50,000+ RVers. Free AI assistant PAM helps optimize routes, find campgrounds & manage budgets. Trusted by full-time RVers.',
    keywords: 'RV trip planner, RV budget tracker, RV community, full time RV living, RV route planning, campground finder',
    canonicalUrl: '/'
  },
  wheels: {
    title: 'RV Trip Planner - Route Planning & Campground Finder | Wheels and Wins',
    description: 'Plan perfect RV routes with real-time weather, road conditions & campground availability. Interactive maps with RV-specific routing and PAM AI recommendations.',
    keywords: 'RV trip planner, RV route planning, campground finder, RV GPS, motorhome routes',
    canonicalUrl: '/wheels'
  },
  wins: {
    title: 'RV Budget Tracker & Expense Management | Wheels and Wins', 
    description: 'Track RV expenses, manage budgets & maximize savings. Receipt scanning, category tracking & financial insights designed for full-time RVers.',
    keywords: 'RV budget tracker, RV expense tracking, RV financial planning, RV costs',
    canonicalUrl: '/wins'
  },
  social: {
    title: 'RV Community - Connect with 50,000+ RVers | Wheels and Wins',
    description: 'Join the largest RV community. Share routes, find travel buddies, get advice & connect with fellow RVers across North America.',
    keywords: 'RV community, RV forums, RV social network, RV groups, full time RV community',
    canonicalUrl: '/social'
  },
  shop: {
    title: 'RV Gear & Accessories - Curated by Full-Time RVers | Wheels and Wins',
    description: 'Shop RV essentials recommended by experienced RVers. Best gear for boondocking, campground stays & full-time RV living.',
    keywords: 'RV accessories, RV gear, RV equipment, RV supplies, RV products',
    canonicalUrl: '/shop'
  }
};