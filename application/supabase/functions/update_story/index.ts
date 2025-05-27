import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function withCORSHeaders(resp: Response, origin?: string): Response {
  const headers = new Headers(resp.headers);
  // Dynamically set CORS origin for debugging
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, content-type");
  headers.set("Access-Control-Allow-Credentials", "true");
  return new Response(resp.body, { ...resp, headers });
}

/**
 * Helper: get user from JWT
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") || undefined;
  console.log("[UPDATE_STORY] Incoming request from origin:", origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return withCORSHeaders(new Response(null, { status: 200 }), origin);
  }

  if (req.method !== "POST") {
    return withCORSHeaders(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }), origin);
  }

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), { status: 401 }), origin);
    }
    const jwt = authHeader.replace("Bearer ", "").trim();
    const user = await getUserFromJWT(jwt);

    // Parse body
    const body: UpdateStoryRequest = await req.json();
    const { story_id, preferences, reading_level, story_length, chapter_length, structural_prompt, title } = body;

    if (!story_id) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Missing story_id" }), { status: 400 }), origin);
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
      return withCORSHeaders(new Response(JSON.stringify({ error: updateError.message }), { status: 500 }), origin);
    }
    if (!story) {
      return withCORSHeaders(new Response(JSON.stringify({ error: "Story not found or not owned by user" }), { status: 404 }), origin);
    }

    return withCORSHeaders(new Response(JSON.stringify({ story }), { status: 200 }), origin);
  } catch (err: any) {
    console.error("[UPDATE_STORY] Error", err);
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || "Internal server error" }), { status: 500 }), origin);
  }
});