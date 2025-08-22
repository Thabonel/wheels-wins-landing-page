import React from 'react';
import StateTemplate from './StateTemplate';

const California = () => {
  return (
    <StateTemplate
      stateName="California"
      stateCode="CA"
      heroImage="/images/states/california-rv.jpg"
      popularCities={[
        "San Diego",
        "Los Angeles", 
        "San Francisco",
        "Sacramento",
        "Monterey",
        "Santa Barbara"
      ]}
      topCampgrounds={[
        {
          name: "Morro Bay State Park",
          city: "Morro Bay",
          rating: 4.8,
          priceRange: "$35-50/night"
        },
        {
          name: "Crystal Cove State Park",
          city: "Laguna Beach",
          rating: 4.7,
          priceRange: "$65-75/night"
        },
        {
          name: "Sonoma Coast State Park",
          city: "Jenner",
          rating: 4.6,
          priceRange: "$35-45/night"
        },
        {
          name: "Lake Tahoe RV Resort",
          city: "South Lake Tahoe",
          rating: 4.5,
          priceRange: "$55-85/night"
        }
      ]}
      bestTimeToVisit="Apr-Oct"
      avgDailyCost="$125-175"
      topAttractions={[
        "Pacific Coast Highway (Highway 1)",
        "Yosemite National Park",
        "Redwood National and State Parks",
        "Joshua Tree National Park",
        "Big Sur Coastline",
        "Lake Tahoe",
        "Death Valley National Park",
        "Sequoia & Kings Canyon National Parks"
      ]}
      rvTips={[
        "Book coastal campgrounds 3-6 months in advance during summer",
        "Many mountain passes require chains in winter - check CalTrans",
        "Highway 1 has sections with length restrictions - plan accordingly",
        "State park campgrounds offer best value but fill up quickly",
        "Consider boondocking in BLM lands for free camping",
        "Get a FasTrak pass for toll roads to save time and money"
      ]}
    />
  );
};

export default California;