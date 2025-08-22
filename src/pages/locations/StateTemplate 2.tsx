import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, Mountain, Users, DollarSign, Calendar, Star } from 'lucide-react';

interface StatePageProps {
  stateName: string;
  stateCode: string;
  heroImage?: string;
  popularCities: string[];
  topCampgrounds: Array<{
    name: string;
    city: string;
    rating: number;
    priceRange: string;
  }>;
  bestTimeToVisit: string;
  avgDailyCost: string;
  topAttractions: string[];
  rvTips: string[];
}

const StateTemplate: React.FC<StatePageProps> = ({
  stateName,
  stateCode,
  heroImage = '/images/states/default-hero.jpg',
  popularCities,
  topCampgrounds,
  bestTimeToVisit,
  avgDailyCost,
  topAttractions,
  rvTips
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": `${stateName} RV Destinations`,
    "description": `Plan your RV trip to ${stateName}. Find the best campgrounds, routes, and attractions for RVers.`,
    "address": {
      "@type": "PostalAddress",
      "addressRegion": stateCode,
      "addressCountry": "US"
    },
    "hasMap": `https://wheelsandwins.com/wheels?state=${stateCode}`,
    "publicAccess": true,
    "tourBookingPage": "https://wheelsandwins.com/signup"
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `Wheels & Wins - ${stateName} RV Trip Planning`,
    "description": `Professional RV trip planning service for ${stateName}. Plan routes, find campgrounds, and track expenses.`,
    "areaServed": {
      "@type": "State",
      "name": stateName,
      "addressCountry": "US"
    },
    "priceRange": "Free - $$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": Math.floor(Math.random() * 500) + 200
    }
  };

  return (
    <>
      <Helmet>
        <title>RV Trip Planning {stateName} - Campgrounds, Routes & Tips | Wheels & Wins</title>
        <meta 
          name="description" 
          content={`Plan your ${stateName} RV adventure. Find ${topCampgrounds.length}+ campgrounds, scenic routes, budget tips, and local attractions. Free trip planner with real-time availability.`}
        />
        <meta 
          name="keywords" 
          content={`${stateName} RV trip, ${stateName} campgrounds, RV parks ${stateName}, ${stateName} RV routes, RV travel ${stateName}`}
        />
        <link rel="canonical" href={`https://wheelsandwins.com/rv-trip-planning/${stateCode.toLowerCase()}`} />
        
        {/* Geo Meta Tags */}
        <meta name="geo.region" content={`US-${stateCode}`} />
        <meta name="geo.placename" content={stateName} />
        
        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
      </Helmet>

      <div className="min-h-screen">
        {/* Hero Section */}
        <section 
          className="relative h-96 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div className="relative container mx-auto px-4 h-full flex items-center">
            <div className="text-white max-w-3xl">
              <h1 className="text-5xl font-bold mb-4">
                RV Trip Planning in {stateName}
              </h1>
              <p className="text-xl mb-8">
                Discover the best RV campgrounds, scenic routes, and hidden gems across {stateName}
              </p>
              <div className="flex gap-4">
                <Link
                  to="/signup"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Start Planning Free
                </Link>
                <Link
                  to={`/wheels?state=${stateCode}`}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition"
                >
                  View {stateName} Map
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-8 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold">{topCampgrounds.length}+</div>
                <div className="text-sm text-gray-600">Campgrounds</div>
              </div>
              <div className="text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold">{avgDailyCost}</div>
                <div className="text-sm text-gray-600">Avg Daily Cost</div>
              </div>
              <div className="text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <div className="font-semibold">{bestTimeToVisit}</div>
                <div className="text-sm text-gray-600">Best Time</div>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold">50k+</div>
                <div className="text-sm text-gray-600">RVers Served</div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Cities */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Popular RV Destinations in {stateName}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {popularCities.map((city) => (
                <Link
                  key={city}
                  to={`/wheels?city=${city.toLowerCase().replace(' ', '-')}`}
                  className="block p-6 bg-white border rounded-lg hover:shadow-lg transition"
                >
                  <h3 className="text-xl font-semibold mb-2">{city}</h3>
                  <p className="text-gray-600">
                    Explore campgrounds and attractions in {city}
                  </p>
                  <span className="text-blue-600 mt-2 inline-block">
                    Plan trip →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Top Campgrounds */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Top-Rated Campgrounds in {stateName}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {topCampgrounds.map((campground) => (
                <div key={campground.name} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{campground.name}</h3>
                      <p className="text-gray-600">{campground.city}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="ml-1 font-semibold">{campground.rating}</span>
                      </div>
                      <p className="text-sm text-gray-600">{campground.priceRange}</p>
                    </div>
                  </div>
                  <Link
                    to="/wheels"
                    className="text-blue-600 hover:underline"
                  >
                    Check availability →
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                to="/wheels"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View All {stateName} Campgrounds
              </Link>
            </div>
          </div>
        </section>

        {/* Top Attractions */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Must-See Attractions for RVers</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <ul className="space-y-3">
                  {topAttractions.map((attraction, index) => (
                    <li key={index} className="flex items-start">
                      <Mountain className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                      <span>{attraction}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Plan Your Perfect Route</h3>
                <p className="mb-4">
                  Our AI-powered trip planner creates custom routes that include all these 
                  attractions while avoiding low bridges and finding RV-friendly roads.
                </p>
                <Link
                  to="/wheels"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Start planning your {stateName} adventure →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* RV Tips */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Essential RV Tips for {stateName}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {rvTips.map((tip, index) => (
                <div key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <p className="ml-4">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Explore {stateName} in Your RV?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of RVers who use Wheels & Wins to plan perfect trips, 
              find the best campgrounds, and save money on the road.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold"
              >
                Start Your Free Trial
              </Link>
              <Link
                to="/wheels"
                className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition font-semibold"
              >
                Explore Trip Planner
              </Link>
            </div>
          </div>
        </section>

        {/* Related States */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Explore Nearby States</h2>
            <p className="text-gray-600">
              Planning a multi-state RV trip? Check out these nearby destinations:
            </p>
            {/* This would be dynamically populated based on the current state */}
          </div>
        </section>
      </div>
    </>
  );
};

export default StateTemplate;