import { Link } from 'react-router-dom';

const SEOFooter = () => {
  const navigationGroups = [
    {
      title: 'Trip Planning',
      links: [
        { path: '/wheels', text: 'RV Trip Planner', description: 'Plan your perfect RV route' },
        { path: '/wheels#templates', text: 'Trip Templates', description: 'Pre-made RV itineraries' },
        { path: '/wheels#weather', text: 'Weather Planning', description: 'Real-time weather for RVers' },
        { path: '/wheels#campgrounds', text: 'Campground Finder', description: 'Find RV-friendly campgrounds' }
      ]
    },
    {
      title: 'Budget & Finance',
      links: [
        { path: '/wins', text: 'Expense Tracker', description: 'Track RV expenses' },
        { path: '/wins#budgets', text: 'Budget Planner', description: 'Plan your RV budget' },
        { path: '/wins#receipts', text: 'Receipt Scanner', description: 'Scan and organize receipts' },
        { path: '/wins#reports', text: 'Financial Reports', description: 'Analyze your spending' }
      ]
    },
    {
      title: 'Community',
      links: [
        { path: '/social', text: 'RV Community', description: 'Connect with RVers' },
        { path: '/social#groups', text: 'RV Groups', description: 'Join interest groups' },
        { path: '/social#events', text: 'RV Events', description: 'Find meetups and rallies' },
        { path: '/social#marketplace', text: 'RV Marketplace', description: 'Buy and sell RV gear' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { path: '/shop', text: 'RV Gear Shop', description: 'Essential RV products' },
        { path: '/safety', text: 'RV Safety Tips', description: 'Stay safe on the road' },
        { path: '/profile', text: 'Your Profile', description: 'Manage your account' },
        { path: '/you', text: 'Calendar & Tasks', description: 'Organize your RV life' }
      ]
    }
  ];

  const legalLinks = [
    { path: '/terms', text: 'Terms of Service' },
    { path: '/privacy', text: 'Privacy Policy' },
    { path: '/cookies', text: 'Cookie Policy' },
    { path: '/sitemap.xml', text: 'Sitemap', external: true }
  ];

  return (
    <footer className="bg-gray-100 border-t mt-auto" role="contentinfo">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-gray-900 mb-4">{group.title}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                      title={link.description}
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* SEO Content Block */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="sr-only">About Wheels and Wins</h2>
          <p className="text-sm text-gray-600 max-w-4xl">
            Wheels and Wins is the leading RV trip planning and budget management platform, 
            trusted by over 50,000 full-time RVers across North America. Our AI assistant PAM 
            helps you plan perfect routes, find the best campgrounds, track expenses, and connect 
            with the RV community. Whether you're weekend camping or living the full-time RV life, 
            we make your journey easier, safer, and more affordable.
          </p>
        </div>

        {/* Legal Links & Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center">
          <nav aria-label="Legal links">
            <ul className="flex flex-wrap gap-4 text-sm">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  {link.external ? (
                    <a
                      href={link.path}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {link.text}
                    </a>
                  ) : (
                    <Link
                      to={link.path}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          
          <p className="text-sm text-gray-600 mt-4 sm:mt-0">
            © {new Date().getFullYear()} Wheels and Wins. All rights reserved.
          </p>
        </div>
      </div>

      {/* Schema.org Breadcrumb for homepage */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://wheelsandwins.com/"
            },
            {
              "@type": "ListItem", 
              "position": 2,
              "name": "Trip Planning",
              "item": "https://wheelsandwins.com/wheels"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Budget Tracking",
              "item": "https://wheelsandwins.com/wins"
            }
          ]
        })}
      </script>
    </footer>
  );
};

export default SEOFooter;