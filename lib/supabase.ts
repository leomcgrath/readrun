import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uuwwodmfdynzfjzeqghx.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d3dvZG1mZHluemZqemVxZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTUwNTksImV4cCI6MjA5MTA3MTA1OX0.zy1FEfb4oy4ofPpcOHxtfq4o-sWs9-Eb2nlvEXNfXHs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
