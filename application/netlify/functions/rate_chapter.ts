import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  chapter_id: string;
  rating: number;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

function withCORSHeaders(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return withCORSHeaders(200, null);
  }

  if (event.httpMethod !== "POST") {
    return withCORSHeaders(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withCORSHeaders(401, { error: "Missing or invalid authorization header" });
    }
    const jwt = authHeader.replace("Bearer ", "").trim();
    const user = await getUserFromJWT(jwt);

    const body: RequestBody = JSON.parse(event.body || '{}');
    const { chapter_id, rating } = body;

    if (!chapter_id || typeof rating !== "number" || rating < 1 || rating > 5) {
      return withCORSHeaders(400, { error: "Missing or invalid chapter_id or rating (must be 1-5)" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get chapter and parent story to check ownership
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, story_id")
      .eq("id", chapter_id)
      .single();
    if (chapterError || !chapter) {
      return withCORSHeaders(404, { error: "Chapter not found" });
    }

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, user_id")
      .eq("id", chapter.story_id)
      .single();
    if (storyError || !story) {
      return withCORSHeaders(404, { error: "Parent story not found" });
    }

    // Only allow the story owner to rate chapters (can adjust this logic if needed)
    if (story.user_id !== user.id) {
      return withCORSHeaders(403, { error: "Forbidden" });
    }

    // Update the rating
    const { error: updateError } = await supabase
      .from("chapters")
      .update({ rating })
      .eq("id", chapter_id);
    if (updateError) {
      return withCORSHeaders(500, { error: updateError.message });
    }

    return withCORSHeaders(200, { success: true, chapter_id, rating });
  } catch (err: any) {
    return withCORSHeaders(500, { error: err.message || "Internal server error" });
  }
};