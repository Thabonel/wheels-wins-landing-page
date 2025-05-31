
export interface SocialGroup {
  id: number;
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
  id: number;
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
