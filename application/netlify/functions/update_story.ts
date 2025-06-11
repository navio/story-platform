import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

/**
 * Types
 */
interface Preferences {
  structural_prompt?: string;
  chapter_length?: "A sentence" | "A few sentences" | "A small paragraph" | "A full paragraph" | "A few paragraphs";
  story_length?: number;
  [key: string]: any;
}

interface UpdateStoryRequest {
  story_id: string;
  preferences?: Preferences;
  reading_level?: number;
  story_length?: number;
  chapter_length?: Preferences["chapter_length"];
  structural_prompt?: string;
  title?: string;
}

interface User {
  id: string;
  [key: string]: any;
}

/**
 * Helper: CORS
 */
function withCORSHeaders(statusCode: number, body: any, origin?: string) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

/**
 * Helper: get user from JWT
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || undefined;
  console.log("[UPDATE_STORY] Incoming request from origin:", origin);

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return withCORSHeaders(200, null, origin);
  }

  if (event.httpMethod !== "POST") {
    return withCORSHeaders(405, { error: "Method not allowed" }, origin);
  }

  try {
    // Auth
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withCORSHeaders(401, { error: "Missing or invalid authorization header" }, origin);
    }
    const jwt = authHeader.replace("Bearer ", "").trim();
    const user = await getUserFromJWT(jwt);

    // Parse body
    const body: UpdateStoryRequest = JSON.parse(event.body || '{}');
    const { story_id, preferences, reading_level, story_length, chapter_length, structural_prompt, title } = body;

    if (!story_id) {
      return withCORSHeaders(400, { error: "Missing story_id" }, origin);
    }

    // Update story
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: story, error: updateError } = await supabase
      .from("stories")
      .update({
        ...(preferences !== undefined ? { preferences } : {}),
        ...(reading_level !== undefined ? { reading_level } : {}),
        ...(story_length !== undefined ? { story_length } : {}),
        ...(chapter_length !== undefined ? { chapter_length } : {}),
        ...(structural_prompt !== undefined ? { structural_prompt } : {}),
        ...(title !== undefined ? { title } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", story_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return withCORSHeaders(500, { error: updateError.message }, origin);
    }
    if (!story) {
      return withCORSHeaders(404, { error: "Story not found or not owned by user" }, origin);
    }

    return withCORSHeaders(200, { story }, origin);
  } catch (err: any) {
    console.error("[UPDATE_STORY] Error", err);
    return withCORSHeaders(500, { error: err.message || "Internal server error" }, origin);
  }
};