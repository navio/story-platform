import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

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
  const lines = text.split('\n').map((l: string) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return lines.slice(0, 3).map((desc: string) => ({ description: desc }));
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

  if (event.httpMethod !== 'POST') {
    return withCORSHeaders(405, { error: 'Method not allowed' });
  }

  try {
    // Require and validate Bearer token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(401, { error: 'Missing or invalid authorization header' });
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    let user: User;
    try {
      user = await getUserFromJWT(jwt);
    } catch (authErr) {
      console.error("Unauthorized access attempt:", authErr);
      return withCORSHeaders(401, { error: 'Unauthorized' });
    }

    // Log incoming request for debugging
    let body: RequestBody;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (jsonErr) {
      console.error("Failed to parse JSON body:", jsonErr);
      return withCORSHeaders(400, { error: 'Invalid JSON body', details: String(jsonErr) });
    }
    const { content, preferences = {} } = body;

    if (!content) {
      console.error("Missing content in request body");
      return withCORSHeaders(400, { error: 'Missing content' });
    }

    let continuations: ContinuationOption[] = [];
    try {
      continuations = await generateContinuations(content, preferences);
    } catch (genErr) {
      console.error("Error generating continuations:", genErr);
      return withCORSHeaders(500, { error: 'Failed to generate continuations', details: String(genErr) });
    }

    // Defensive: ensure at least one valid continuation
    if (!continuations || continuations.length === 0) {
      console.error("No valid continuations returned from LLM");
      return withCORSHeaders(502, { error: 'No valid continuations returned from LLM', continuations: [] });
    }

    // Log outgoing response for debugging
    console.log("Returning continuations:", continuations);

    return withCORSHeaders(200, { continuations });
  } catch (err: any) {
    console.error("Unexpected error in get_continuations:", err);
    return withCORSHeaders(500, { error: err.message || 'Internal server error', details: String(err) });
  }
};