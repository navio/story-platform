import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import {
  validateChapterLength,
  truncateToSpec,
  ChapterLengthCategory
} from "./utils/chapter_length.js";
import { loadPrompt } from "./utils/prompt-loader.js";

/**
* Interfaces and Types
*/

interface Preferences {
  structural_prompt?: string;
  chapter_length?: "A sentence" | "A few sentences" | "A small paragraph" | "A full paragraph" | "A few paragraphs";
  story_length?: number;
  [key: string]: any; // Allow additional fields for flexibility
}

interface Story {
  id: string;
  user_id: string;
  title: string;
  preferences?: Preferences;
  reading_level?: number;
  story_length?: number;
  chapter_length?: Preferences["chapter_length"];
  structural_prompt?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  content: string;
  prompt?: string;
  created_at?: string;
}

/**
 * API response for starting a story.
 * Returns only the first chapter object for the user to read.
 */
interface StartStoryResponse {
  chapter: Chapter;
}

interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  title: string;
  initial_prompt: string;
  preferences?: Preferences;
  reading_level?: number;
  story_length?: number;
  chapter_length?: Preferences["chapter_length"];
  structural_prompt?: string;
}

/**
 * Helper validation functions (moved to top-level for global access)
 */
function isPositiveInt(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}
function isReadingLevel(val: unknown): val is number {
  return typeof val === "number" && val >= 0 && val <= 12;
}
function isChapterLength(val: unknown): val is Preferences["chapter_length"] {
  return (
    typeof val === "string" &&
    [
      "A sentence",
      "A few sentences",
      "A small paragraph",
      "A full paragraph",
      "A few paragraphs"
    ].includes(val)
  );
}

// Environment variables for service role key and project URL
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper: get user from JWT
async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

// Placeholder for agent call (replace with real agent integration)
const openaiApiKey = process.env.OPENAI_API_KEY!;
/**
 * Generate a full story arc/outline (e.g., hero's journey) as a structured array of steps.
 * Returns an array of arc steps, each with a title and description.
 */
async function generateStoryArc(
  title: string,
  initial_prompt: string,
  preferences: Preferences
): Promise<{ steps: { title: string; description: string }[] }> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  
  const systemPrompt = loadPrompt('story-arc-system', {
    reading_level: readinglevel,
    story_length: preferences?.story_length,
    chapter_length: preferences?.chapter_length || "A full paragraph",
    structural_prompt: preferences?.structural_prompt
  });

  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Title: ${title}
Initial Prompt: ${initial_prompt}
Preferences: ${JSON.stringify(preferences)}
Story Length: ${preferences?.story_length || 7}
Reading Level: ${readinglevel}
If a structural_prompt is present, incorporate it into the arc.
Respond ONLY with valid JSON.`
      }
    ],
    max_tokens: 512,
    temperature: 0.7
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
    console.error("OpenAI API error (arc):", errorText);
    throw new Error("OpenAI API error: " + errorText);
  }
  const data = await res.json();
  // Try to parse the JSON from the LLM response
  try {
    const arc = JSON.parse(data.choices[0].message.content.trim());
    if (arc && Array.isArray(arc.steps)) {
      return arc;
    }
    throw new Error("Malformed arc structure");
  } catch (e) {
    console.error("Failed to parse story arc JSON:", e, data.choices[0].message.content);
    throw new Error("Failed to parse story arc JSON");
  }
}

async function generateChapter(prompt: string, preferences: Preferences): Promise<string> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  
  let systemPrompt: string;
  if (preferences?.structural_prompt?.startsWith('$')) {
    systemPrompt = preferences.structural_prompt;
  } else {
    systemPrompt = loadPrompt('start-story-system', {
      story_length: preferences?.story_length,
      chapter_length: preferences?.chapter_length || "a paragraph",
      reading_level: readinglevel,
      structural_prompt: preferences?.structural_prompt
    });
  }

  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 512,
    temperature: 0.8,
    frequency_penalty: 1,
    seed: 1
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

function withCORSHeaders(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "https://story-platform.netlify.app",
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

  // --- LOG: request received ---
  console.log('[START_STORY] Incoming request', { method: event.httpMethod, time: new Date().toISOString() });

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(401, { error: 'Missing or invalid authorization header' });
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const user = await getUserFromJWT(jwt);
    // --- LOG: user authenticated ---
    console.log('[START_STORY] Authenticated user', user.id);

    const body: RequestBody = JSON.parse(event.body || '{}');
    const {
      title,
      initial_prompt,
      preferences = {},
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    } = body;

    // --- LOG: body parsed ---
    console.log('[START_STORY] Parsed body', { title, reading_level, story_length, chapter_length });

    if (!title || !initial_prompt) {
      return withCORSHeaders(400, { error: 'Missing title or initial_prompt' });
    }

    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isChapterLength(chapter_length)) ||
      (structural_prompt !== undefined && typeof structural_prompt !== "string")
    ) {
      return withCORSHeaders(400, { error: 'Invalid story parameters' });
    }

    // Create Supabase client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- Generate story arc/outline ---
    console.log('[START_STORY] Generating story arc');
    const arc = await generateStoryArc(title, initial_prompt, {
      ...preferences,
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    });
    console.log('[START_STORY] Story arc generated', arc);

    // Insert new story with arc
    console.log('[START_STORY] Inserting story');
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert([{
        user_id: user.id,
        title,
        preferences,
        reading_level,
        story_length,
        chapter_length,
        structural_prompt,
        story_arc: arc
      }])
      .select()
      .single();
    if (storyError || !story || !story.id) {
      throw new Error(storyError?.message || "Failed to create story or missing story id");
    }
    // --- LOG: story inserted ---
    console.log('[START_STORY] Story inserted', story.id);

    // --- Generate first chapter as a continuation, guided by arc ---
    const arcStep = arc.steps && arc.steps.length > 0 ? arc.steps[0] : null;
    let chapterPrompt = `Write the first chapter of the story "${title}".`;
    if (arcStep) {
      chapterPrompt += `\n\nThis chapter should follow the arc step: "${arcStep.title}" - ${arcStep.description}`;
    }
    if (structural_prompt) {
      chapterPrompt += `\n\nIncorporate the following structural guidance: ${structural_prompt}`;
    }
    chapterPrompt += `\n\nInitial user prompt/context: ${initial_prompt}`;

    console.log('[START_STORY] Calling OpenAI to generate first chapter with arc guidance');
    let content = await generateChapter(chapterPrompt, {
      ...preferences,
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    });
    console.log('[START_STORY] OpenAI response length', content.length);

    // Enforce chapter length constraints if specified
    // if (chapter_length && validateChapterLength && truncateToSpec) {
    //   const category = chapter_length as ChapterLengthCategory;
    //   if (!validateChapterLength(content, category)) {
    //     console.log('[START_STORY] Chapter content does not fit length spec, truncating...');
    //     content = truncateToSpec(content, category);
    //     console.log('[START_STORY] Truncated content length', content.length);
    //   }
    // }

    // Insert first chapter with structural_metadata
    console.log('[START_STORY] Inserting first chapter');
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{
        story_id: story.id,
        chapter_number: 1,
        content,
        prompt: initial_prompt,
        structural_metadata: arcStep ? arcStep : null
      }])
      .select()
      .single();
    if (chapterError) throw new Error(chapterError.message);
    // --- LOG: chapter inserted ---
    console.log('[START_STORY] Chapter inserted', chapter.id);

    // --- LOG: preparing success response ---
    const response = {
      story: {
        id: story.id,
        title: story.title,
        status: story.status,
        created_at: story.created_at,
        updated_at: story.updated_at,
        preferences: story.preferences,
        story_length: story.story_length,
        reading_level: story.reading_level,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt,
        story_arc: story.story_arc
      },
      chapter: {
        id: chapter.id,
        story_id: chapter.story_id ?? story.id,
        chapter_number: chapter.chapter_number,
        content: chapter.content,
        created_at: chapter.created_at,
        structural_metadata: chapter.structural_metadata
      }
    };

    console.log('[START_STORY] Success, returning 201');
    return withCORSHeaders(201, response);
  } catch (err: any) {
    console.error('[START_STORY] Error', err);
    return withCORSHeaders(500, { error: err.message || 'Internal server error' });
  }
};