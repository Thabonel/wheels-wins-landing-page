
export interface SocialGroup {
  id: number | string;
  name: string;
  description: string;
  cover: string;
  members: number;
  location?: string;
  activityLevel: 'active' | 'new' | 'quiet';
  isAdmin?: boolean;
}

export interface SocialPost {
  id: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  date: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  status?: string;
  location: string;
  isOwnPost?: boolean;
}

export interface MarketplaceListing {
  id: number | string;
  title: string;
  price: number;
  image: string;
  seller: string;
  location: string;
  category: string;
  condition: string;
  description: string;
  posted: string;
  isFavorite?: boolean;
}

export interface HustleIdea {
  id: number | string;
  title: string;
  description: string;
  image: string;
  avgEarnings: number;
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
}

// Additional types for voting and post management
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type PostLocation = 'feed' | 'group';
