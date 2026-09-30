/*
  Supabase configuration.
  1. Create a Supabase project.
  2. Open Project Settings > API.
  3. Copy the Project URL and anon/publishable key below.
*/
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

if (SUPABASE_URL.startsWith("YOUR_") || SUPABASE_ANON_KEY.startsWith("YOUR_")) {
  console.warn("Supabase is not configured. Edit js/supabase.js with your project credentials.");
}

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
