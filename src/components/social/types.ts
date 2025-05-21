import { Database } from "@/integrations/supabase";

export type PostStatus = Database["public"]["Enums"]["post_status"];
export type PostLocation = Database["public"]["Enums"]["post_location"];

export interface SocialPost {
  id: string;
  authorId: string;
  author: string;
  authorAvatar: string;
  date: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  status: PostStatus;
  location: PostLocation;
  groupId?: string | null;
  isOwnPost: boolean;
}

export interface PostVote {
  id: string;
  postId: string;
  voteType: boolean; // true for upvote, false for downvote
}

export interface SocialGroup {
  id: string;
  name: string;
  cover: string;
  members: number;
  location?: string;
  description: string;
  activityLevel: "active" | "new" | "quiet";
  isAdmin: boolean;
}

export interface RecommendedGroup {
  id: string;
  name: string;
  members: number;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  distance: number; // in kilometers
  listedDays: number;
}

export interface HustleIdea {
  id: string;
  title: string;
  description: string;
  image: string;
  avgEarnings: number; // monthly average
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
}
