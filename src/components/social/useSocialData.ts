
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialPost, SocialGroup, MarketplaceListing, HustleIdea } from "./types";

export function useSocialData() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [hustles, setHustles] = useState<HustleIdea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch social posts
        const { data: postsData = [], error: postsError } = await supabase
          .from("social_posts")
          .select("*")
          .eq("location", "feed")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        
        if (postsError) {
          console.error("Error fetching posts:", postsError);
        } else {
          const formattedPosts = postsData.map(post => ({
            id: post.id,
            author: `User ${post.user_id?.substring(0, 5) || "Unknown"}`,
            authorId: post.user_id || "",
            authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
            date: new Date(post.created_at).toLocaleDateString(),
            content: post.content,
            image: post.image_url,
            likes: post.upvotes || 0,
            comments: post.comment_count || 0,
            status: post.status,
            location: post.location,
            isOwnPost: false // Will be updated when we have auth context
          }));
          setPosts(formattedPosts);
        }

        // Fetch social groups
        const { data: groupsData = [], error: groupsError } = await supabase
          .from("social_groups")
          .select("*")
          .eq("is_active", true)
          .order("member_count", { ascending: false });
        
        if (groupsError) {
          console.error("Error fetching groups:", groupsError);
        } else {
          const formattedGroups = groupsData.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description || "",
            cover: group.cover || group.avatar_url || "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
            members: group.member_count || 0,
            location: group.location || "Unknown",
            activityLevel: (group.activity_level as 'active' | 'new' | 'quiet') || 'active',
            isAdmin: false // Will be updated when we have auth context
          }));
          setGroups(formattedGroups);
        }

        // Fetch marketplace listings
        const { data: listingsData = [], error: listingsError } = await supabase
          .from("marketplace_listings")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        
        if (listingsError) {
          console.error("Error fetching listings:", listingsError);
        } else {
          const formattedListings = listingsData.map(listing => ({
            id: listing.id,
            title: listing.title,
            price: listing.price || 0,
            image: listing.image || "",
            seller: listing.seller || "Unknown",
            location: listing.location || "Unknown",
            category: listing.category || "Other",
            condition: listing.condition || "good",
            description: listing.description || "",
            posted: listing.posted || "recently",
            isFavorite: listing.is_favorite || false
          }));
          setMarketplaceListings(formattedListings);
        }

        // Fetch hustle ideas
        const { data: hustlesData = [], error: hustlesError } = await supabase
          .from("hustle_ideas")
          .select("*")
          .eq("status", "approved")
          .order("likes", { ascending: false });
        
        if (hustlesError) {
          console.error("Error fetching hustles:", hustlesError);
        } else {
          const formattedHustles = hustlesData.map(hustle => ({
            id: hustle.id,
            title: hustle.title,
            description: hustle.description || "",
            image: hustle.image || "",
            avgEarnings: hustle.avg_earnings || 0,
            rating: hustle.rating || 0,
            likes: hustle.likes || 0,
            trending: hustle.trending || false,
            tags: hustle.tags || []
          }));
          setHustles(formattedHustles);
        }

      } catch (error) {
        console.error("Error loading social data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { posts, groups, marketplaceListings, hustles, loading };
}

export async function createSocialPost(post: {
  user_id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  group_id?: string;
}) {
  const { data, error } = await supabase.from("social_posts").insert(post);
  if (error) throw error;
  return data;
}

export async function createGroup(group: {
  name: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
}) {
  const { data, error } = await supabase.from("social_groups").insert(group);
  if (error) throw error;
  return data;
}
