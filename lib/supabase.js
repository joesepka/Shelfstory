import { createClient } from "@supabase/supabase-js";
import { profile } from "./profile";
// data source is chosen by the active profile (see lib/profile.js)
export const supabase = createClient(profile.url, profile.anonKey);
