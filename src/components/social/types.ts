
export interface SocialPost {
  id: number;
  author: string;
  authorAvatar: string;
  date: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
}

export interface SocialGroup {
  id: number;
  name: string;
  cover: string;
  members: number;
  location?: string;
  description: string;
  activityLevel: 'active' | 'new' | 'quiet';
}

export interface RecommendedGroup {
  id: number;
  name: string;
  members: number;
}

export interface MarketplaceListing {
  id: number;
  title: string;
  price: number;
  description: string;
  image: string;
  distance: number; // in kilometers
  listedDays: number;
}

export interface HustleIdea {
  id: number;
  title: string;
  description: string;
  image: string;
  avgEarnings: number; // monthly average
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
}
