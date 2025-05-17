
import { Database } from "@/integrations/supabase";

export const POST_STATUS: Record<
  Database["public"]["Enums"]["post_status"], 
  Database["public"]["Enums"]["post_status"]
> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  hidden: "hidden"
};

export const POST_LOCATION: Record<
  Database["public"]["Enums"]["post_location"], 
  Database["public"]["Enums"]["post_location"]
> = {
  feed: "feed",
  group: "group"
};
