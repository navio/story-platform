import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  chapter_id: string;
  rating: number;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

function withCORSHeaders(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, content-type");
  return new Response(resp.body, { ...resp, headers });
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return withCORSHeaders(new Response(null, { status: 200 }));
  }

  if (req.method !== "POST") {
    return withCORSHeaders(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }));
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), { status: 401 }));
    }
    const jwt = authHeader.replace("Bearer ", "").trim();
    const user = await getUserFromJWT(jwt);

    const body: RequestBody = await req.json();
    const { chapter_id, rating } = body;

    if (!chapter_id || typeof rating !== "number" || rating < 1 || rating > 5) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Missing or invalid chapter_id or rating (must be 1-5)" }), { status: 400 }));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get chapter and parent story to check ownership
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, story_id")
      .eq("id", chapter_id)
      .single();
    if (chapterError || !chapter) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Chapter not found" }), { status: 404 }));
    }

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, user_id")
      .eq("id", chapter.story_id)
      .single();
    if (storyError || !story) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Parent story not found" }), { status: 404 }));
    }

    // Only allow the story owner to rate chapters (can adjust this logic if needed)
    if (story.user_id !== user.id) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }));
    }

    // Update the rating
    const { error: updateError } = await supabase
      .from("chapters")
      .update({ rating })
      .eq("id", chapter_id);
    if (updateError) {
      return withCORSHeaders(new Response(JSON.stringify({ error: updateError.message }), { status: 500 }));
    }

    return withCORSHeaders(new Response(JSON.stringify({ success: true, chapter_id, rating }), { status: 200 }));
  } catch (err: any) {
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || "Internal server error" }), { status: 500 }));
  }
});