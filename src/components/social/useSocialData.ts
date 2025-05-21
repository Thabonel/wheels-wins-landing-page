import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { SocialPost, SocialGroup, MarketplaceListing, HustleIdea } from "./types";

export function useSocialData() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [hustles, setHustles] = useState<HustleIdea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: postsData = [], error: postsError } = await supabase
          .from("social_posts")
          .select("*");
        if (postsError) throw postsError;
        setPosts(postsData);

        const { data: groupsData = [], error: groupsError } = await supabase
          .from("social_groups")
          .select("*");
        if (groupsError) throw groupsError;
        setGroups(groupsData);

        const { data: listingsData = [], error: listingsError } = await supabase
          .from("marketplace_listings")
          .select("*");
        if (listingsError) throw listingsError;
        setListings(listingsData);

        const { data: hustlesData = [], error: hustlesError } = await supabase
          .from("hustle_ideas")
          .select("*");
        if (hustlesError) throw hustlesError;
        setHustles(hustlesData);
      } catch (error) {
        console.error("Error loading social data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { posts, groups, listings, hustles, loading };
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
