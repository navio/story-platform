import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables for service role key and project URL
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper: get user from JWT
async function getUserFromJWT(jwt: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}

// Placeholder for agent call (replace with real agent integration)
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

async function generateChapter(prompt: string, preferences: any) {
  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a creative story-telling assistant. Write a captivating first chapter for a story based on the user's prompt." },
      { role: "user", content: prompt }
    ],
    max_tokens: 512,
    temperature: 0.8
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenAI API error:", errorText);
    throw new Error("OpenAI API error: " + errorText);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function withCORSHeaders(resp: Response) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, content-type");
  return new Response(resp.body, { ...resp, headers });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return withCORSHeaders(new Response(null, { status: 204 }));
  }

  if (req.method !== 'POST') {
    return withCORSHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), { status: 401 }));
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const user = await getUserFromJWT(jwt);

    const body = await req.json();
    const { title, initial_prompt, preferences } = body;
    if (!title || !initial_prompt) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing title or initial_prompt' }), { status: 400 }));
    }

    // Create Supabase client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Insert new story
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert([{ user_id: user.id, title, preferences }])
      .select()
      .single();
    if (storyError) throw new Error(storyError.message);

    // Generate first chapter
    const content = await generateChapter(initial_prompt, preferences);

    // Insert first chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{
        story_id: story.id,
        chapter_number: 1,
        content,
        prompt: initial_prompt
      }])
      .select()
      .single();
    if (chapterError) throw new Error(chapterError.message);

    return withCORSHeaders(new Response(JSON.stringify({
      story_id: story.id,
      chapter: {
        id: chapter.id,
        chapter_number: chapter.chapter_number,
        content: chapter.content,
        created_at: chapter.created_at
      }
    }), { status: 201 }));
  } catch (err: any) {
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500 }));
  }
});