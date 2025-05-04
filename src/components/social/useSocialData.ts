
import { useState, useEffect } from 'react';
import { SocialPost, SocialGroup, MarketplaceListing, HustleIdea } from './types';

export function useSocialData() {
  // Mock data for the social components

  // Feed data
  const posts: SocialPost[] = [
    {
      id: 1,
      author: "Sarah Johnson",
      authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
      date: "2 hours ago",
      content: "Just installed solar panels on our rig and WOW what a difference! We're now completely off-grid capable and loving the freedom. Happy to answer questions if anyone is considering making the switch.",
      image: "https://images.unsplash.com/photo-1529313780224-1a12b68bed16?q=80&w=2787&auto=format&fit=crop",
      likes: 24,
      comments: 8
    },
    {
      id: 2,
      author: "Robert Williams",
      authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
      date: "Yesterday",
      content: "Has anyone stayed at Pinewood RV Resort in Colorado? Planning to head there next month and would love some insights about the facilities and nearby attractions.",
      likes: 12,
      comments: 15
    },
    {
      id: 3,
      author: "Mary Peterson",
      authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
      date: "3 days ago",
      content: "Just found the most amazing boondocking spot near Sedona! Incredible views and great cell reception. Message me if you want the coordinates - don't want to post publicly to keep it from getting too crowded.",
      image: "https://images.unsplash.com/photo-1533873984035-25970ab07461?q=80&w=2874&auto=format&fit=crop",
      likes: 56,
      comments: 23
    }
  ];

  const trendingTopics = [
    "SolarPower", "WinterDestinations", "BoondockingTips", "RVMaintenance", "FuelSavings"
  ];

  // Groups data
  const groups: SocialGroup[] = [
    {
      id: 1,
      name: "Southwest Desert Travelers",
      cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2821&auto=format&fit=crop",
      members: 1245,
      location: "Arizona & New Mexico",
      description: "For RVers exploring the beautiful southwestern deserts. Share boondocking spots, weather updates, and meetup opportunities.",
      activityLevel: "active"
    },
    {
      id: 2,
      name: "Full-Time Families",
      cover: "https://images.unsplash.com/photo-1517490232338-06b912a786b5?q=80&w=2787&auto=format&fit=crop",
      members: 856,
      description: "Support group for families living full-time on the road. School resources, kid-friendly destinations, and community support.",
      activityLevel: "active"
    },
    {
      id: 3,
      name: "RV Tech Support",
      cover: "https://images.unsplash.com/photo-1617650728825-93c69e608d4d?q=80&w=2870&auto=format&fit=crop",
      members: 2341,
      description: "Technical discussions about RV systems, repairs, and upgrades. Ask questions and share your knowledge.",
      activityLevel: "active"
    },
    {
      id: 4,
      name: "Pacific Northwest Campers",
      cover: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2870&auto=format&fit=crop",
      members: 782,
      location: "Washington, Oregon & BC",
      description: "For travelers in the beautiful PNW. Trail reports, campground reviews, and stunning photography.",
      activityLevel: "active"
    },
    {
      id: 5,
      name: "Budget RV Living",
      cover: "https://images.unsplash.com/photo-1534187886935-1e1faa0212cc?q=80&w=2940&auto=format&fit=crop",
      members: 1567,
      description: "Tips and strategies for living on the road without breaking the bank. Frugal resources and money-saving ideas.",
      activityLevel: "active"
    },
    {
      id: 6,
      name: "East Coast Expeditions",
      cover: "https://images.unsplash.com/photo-1586869426275-3bfa2f3b284e?q=80&w=2864&auto=format&fit=crop",
      members: 632,
      location: "Eastern Seaboard",
      description: "For RVers traveling the East Coast. Beach camping, historic sites, and city parking tips.",
      activityLevel: "quiet"
    }
  ];

  const recommendedGroups = [
    {
      id: 7,
      name: "Winter Snowbirds",
      members: 943
    },
    {
      id: 8,
      name: "Solar Power Enthusiasts",
      members: 1247
    }
  ];

  // Marketplace data
  const listings: MarketplaceListing[] = [
    {
      id: 1,
      title: "Solar Panel Kit - 200W",
      price: 350,
      description: "Complete 200W solar kit with controller, cables, and mounting hardware. Used for 6 months, in excellent condition. Selling because we upgraded to a larger system.",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2944&auto=format&fit=crop",
      distance: 75,
      listedDays: 3
    },
    {
      id: 2,
      title: "Portable Outdoor Grill",
      price: 85,
      description: "Weber portable propane grill, perfect for RV life. Lightly used and well maintained. Includes propane adapter hose and carry case.",
      image: "https://images.unsplash.com/photo-1523292874888-d58da7a4d538?q=80&w=2787&auto=format&fit=crop",
      distance: 120,
      listedDays: 8
    },
    {
      id: 3,
      title: "RV Leveling Blocks - Set of 10",
      price: 40,
      description: "Heavy-duty leveling blocks, can support up to 35,000 lbs. Used for one season, like new condition.",
      image: "https://images.unsplash.com/photo-1574269926468-5a54eb299679?q=80&w=2787&auto=format&fit=crop",
      distance: 45,
      listedDays: 5
    },
    {
      id: 4,
      title: "Folding Outdoor Table & Chairs",
      price: 120,
      description: "Lightweight aluminum table with 4 folding chairs. Perfect for camping. Folds up small for easy storage in your RV.",
      image: "https://images.unsplash.com/photo-1559066653-edfd1e4d9118?q=80&w=2787&auto=format&fit=crop",
      distance: 95,
      listedDays: 12
    },
    {
      id: 5,
      title: "Generator - Honda EU2200i",
      price: 750,
      description: "Honda inverter generator, very quiet and fuel efficient. 2200W startup, 1800W running. Only 50 hours of use, selling because we've gone all solar.",
      image: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=2880&auto=format&fit=crop",
      distance: 150,
      listedDays: 2
    },
    {
      id: 6,
      title: "RV Sewer Hose Kit",
      price: 35,
      description: "Complete sewer kit with 15' hose, fittings, and storage container. Used for one trip, like new.",
      image: "https://images.unsplash.com/photo-1517490232338-06b912a786b5?q=80&w=2787&auto=format&fit=crop",
      distance: 60,
      listedDays: 9
    }
  ];

  // Hustle board data
  const hustles: HustleIdea[] = [
    {
      id: 1,
      title: "Campground Hosting",
      description: "Work part-time managing a campground in exchange for a free site plus hourly pay. Great way to stay in one location for a season while earning.",
      image: "https://images.unsplash.com/photo-1517823382935-51bfcb0ec6bc?q=80&w=2880&auto=format&fit=crop",
      avgEarnings: 1500,
      rating: 4.8,
      likes: 245,
      trending: true,
      tags: ["Part-time", "Seasonal", "Free camping"]
    },
    {
      id: 2,
      title: "Remote Software Development",
      description: "Leverage tech skills for remote work while traveling. Companies increasingly hire remote developers, especially seniors with experience.",
      image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2940&auto=format&fit=crop",
      avgEarnings: 6000,
      rating: 4.7,
      likes: 189,
      trending: false,
      tags: ["Full-time", "Tech", "High income"]
    },
    {
      id: 3,
      title: "RV Inspection Service",
      description: "Get certified as an RV inspector and offer pre-purchase inspections for buyers. Growing field with high demand as RV sales increase.",
      image: "https://images.unsplash.com/photo-1566847438217-76e82d383f84?q=80&w=2940&auto=format&fit=crop",
      avgEarnings: 2200,
      rating: 4.2,
      likes: 127,
      trending: false,
      tags: ["Certification required", "Flexible schedule", "Technical"]
    },
    {
      id: 4,
      title: "Mobile RV Repair",
      description: "Offer on-site RV repair services to fellow travelers. Electrical, plumbing, appliance repair, and basic maintenance are in high demand at campgrounds.",
      image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2940&auto=format&fit=crop",
      avgEarnings: 3500,
      rating: 4.6,
      likes: 210,
      trending: true,
      tags: ["Skills required", "Tools needed", "High demand"]
    },
    {
      id: 5,
      title: "Travel Photography/Videography",
      description: "Sell travel photos and videos to stock sites, create content for campgrounds/attractions, or start a YouTube channel documenting your journey.",
      image: "https://images.unsplash.com/photo-1554143091-c41d76e3da15?q=80&w=2940&auto=format&fit=crop",
      avgEarnings: 1200,
      rating: 4.0,
      likes: 156,
      trending: false,
      tags: ["Creative", "Equipment needed", "Passive income potential"]
    },
    {
      id: 6,
      title: "Mobile Notary Service",
      description: "Become a notary public and offer mobile services. Particularly lucrative in states with high loan signing rates. Flexible scheduling.",
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2940&auto=format&fit=crop",
      avgEarnings: 2000,
      rating: 4.3,
      likes: 132,
      trending: false,
      tags: ["Certification required", "Flexible hours", "Low startup costs"]
    }
  ];

  return {
    posts,
    trendingTopics,
    groups,
    recommendedGroups,
    listings,
    hustles
  };
}
