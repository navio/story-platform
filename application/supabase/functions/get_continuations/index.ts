import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Represents a possible continuation for the story.
 */
interface ContinuationOption {
  description: string;
}

interface Preferences {
  structural_prompt?: string;
  chapter_length?: "A sentence" | "A few sentences" | "A small paragraph" | "A full paragraph" | "A few paragraphs";
  story_length?: number;
  reading_level?: number;
  [key: string]: any;
}

interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  content: string; // The current chapter content or story context
  preferences?: Preferences;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Helper: get user from JWT
async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

/**
 * Generates three possible continuations for the next part of the story.
 * Each continuation is a very brief summary (one line, a few words) of a possible direction.
 */
async function generateContinuations(content: string, preferences: Preferences = {}): Promise<ContinuationOption[]> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` : 'Kindergarden';
  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: `You are an expert narrative designer. Given the current story context, suggest three possible directions the story could take next. Each suggestion must be a single line (no more than 10 words), serving as a summary or direction, not a full sentence or paragraph. Make them creative, engaging, and distinct. Do not continue the story, only provide the options.

Story reading level: ${readinglevel}
Chapter length: ${preferences?.chapter_length || "A full paragraph"}
${preferences?.structural_prompt ? "\n" + preferences.structural_prompt : ""}
`
      },
      {
        role: "user",
        content: `Current story context:\n${content}\n\nList three possible next directions for the story, each as a single line (no more than 10 words). Format as:\n1. ...\n2. ...\n3. ...`
      }
    ],
    max_tokens: 128,
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
    console.error("OpenAI API error (continuations):", errorText);
    throw new Error("OpenAI API error: " + errorText);
  }
  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  // Parse the three options from the response
  const matches = text.match(/(?:1\.|•)\s*(.+?)(?:\n|$)(?:2\.|•)\s*(.+?)(?:\n|$)(?:3\.|•)\s*(.+)/s);
  if (matches && matches.length === 4) {
    return [
      { description: matches[1].trim() },
      { description: matches[2].trim() },
      { description: matches[3].trim() }
    ];
  }
  // Fallback: split by lines if not matched
  const lines = text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return lines.slice(0, 3).map(desc => ({ description: desc }));
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

  if (req.method !== 'POST') {
    return withCORSHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
  }

  try {
    // Require and validate Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), { status: 401 }));
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    let user: User;
    try {
      user = await getUserFromJWT(jwt);
    } catch (authErr) {
      console.error("Unauthorized access attempt:", authErr);
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    }

    // Log incoming request for debugging
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (jsonErr) {
      console.error("Failed to parse JSON body:", jsonErr);
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Invalid JSON body', details: String(jsonErr) }), { status: 400 }));
    }
    const { content, preferences = {} } = body;

    if (!content) {
      console.error("Missing content in request body");
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing content' }), { status: 400 }));
    }

    let continuations: ContinuationOption[] = [];
    try {
      continuations = await generateContinuations(content, preferences);
    } catch (genErr) {
      console.error("Error generating continuations:", genErr);
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Failed to generate continuations', details: String(genErr) }), { status: 500 }));
    }

    // Defensive: ensure at least one valid continuation
    if (!continuations || continuations.length === 0) {
      console.error("No valid continuations returned from LLM");
      return withCORSHeaders(new Response(JSON.stringify({ error: 'No valid continuations returned from LLM', continuations: [] }), { status: 502 }));
    }

    // Log outgoing response for debugging
    console.log("Returning continuations:", continuations);

    return withCORSHeaders(new Response(JSON.stringify({ continuations }), { status: 200 }));
  } catch (err: any) {
    console.error("Unexpected error in get_continuations:", err);
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || 'Internal server error', details: String(err) }), { status: 500 }));
  }
});