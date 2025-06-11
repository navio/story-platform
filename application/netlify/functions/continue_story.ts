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
  story_arc?: { steps: { title: string; description: string }[] };
}

interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  content: string;
  prompt?: string;
  created_at?: string;
  structural_metadata?: { title: string; description: string };
  rating?: number;
}

interface ContinuationOption {
  description: string;
}

interface ContinueStoryResponse {
  story: Story;
  chapter: Chapter;
}

interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  story_id: string;
  prompt?: string;
  reading_level?: number;
  story_length?: number;
  chapter_length?: Preferences["chapter_length"];
  structural_prompt?: string;
}

/**
 * Helper validation functions
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

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

const openaiApiKey = process.env.OPENAI_API_KEY!;

async function generateChapter(
  context: string,
  prompt: string | undefined,
  preferences: Preferences
): Promise<string> {
  const userPrompt = prompt ? `Continue the story with this user input: "${prompt}"` : "Continue the story in an interesting way.";
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  const chapterLength = preferences?.chapter_length || "A full paragraph";
  
  let systemPrompt: string;
  if (preferences?.structural_prompt?.startsWith('$')) {
    systemPrompt = preferences.structural_prompt;
  } else {
    systemPrompt = loadPrompt('continue-story-system', {
      story_length: preferences?.story_length,
      chapter_length: chapterLength,
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
      { role: "user", content: `Story so far:\n${context}\n\n${userPrompt}` }
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateContinuations(context: string, preferences: Preferences): Promise<ContinuationOption[]> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  
  const systemPrompt = loadPrompt('continuations-system', {
    reading_level: readinglevel,
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
        content: `Current story context:\n${context}\n\nList three possible next directions for the story, each as a brief description. Format as:\n1. ...\n2. ...\n3. ...`
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
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(401, { error: 'Missing or invalid authorization header' });
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const user = await getUserFromJWT(jwt);

    const body: RequestBody = JSON.parse(event.body || '{}');
    const {
      story_id,
      prompt,
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    } = body;
    if (!story_id) {
      return withCORSHeaders(400, { error: 'Missing story_id' });
    }

    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isChapterLength(chapter_length)) ||
      (structural_prompt !== undefined && typeof structural_prompt !== "string")
    ) {
      return withCORSHeaders(400, { error: 'Invalid story parameters' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // If any new fields are present, update the story
    const updateFields: Record<string, any> = {};
    if (reading_level !== undefined) updateFields.reading_level = reading_level;
    if (story_length !== undefined) updateFields.story_length = story_length;
    if (chapter_length !== undefined) updateFields.chapter_length = chapter_length;
    if (structural_prompt !== undefined) updateFields.structural_prompt = structural_prompt;
    if (Object.keys(updateFields).length > 0) {
      updateFields.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('stories')
        .update(updateFields)
        .eq('id', story_id);
      if (updateError) throw new Error(updateError.message);
    }

    // Load story and chapters (after possible update)
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', story_id)
      .single();
    if (storyError || !story) throw new Error('Story not found');
    if (story.user_id !== user.id) return withCORSHeaders(403, { error: 'Forbidden' });

    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', story_id)
      .order('chapter_number', { ascending: true });
    if (chaptersError) throw new Error(chaptersError.message);

    // ENFORCE STORY LENGTH LIMIT
    if (
      typeof story.story_length === "number" &&
      chapters.length >= Number(story.story_length)
    ) {
      return withCORSHeaders(400, { error: "Story has reached its maximum number of chapters." });
    }

    // Build context from previous chapters
    const context = chapters.map((ch: any) => ch.content).join('\n\n');

    // --- Retrieve story arc and determine current arc step ---
    const arc = story.story_arc && Array.isArray(story.story_arc.steps) ? story.story_arc as { steps: { title: string; description: string }[] } : null;
    const chapter_number = chapters.length + 1;
    let arcStep: { title: string; description: string } | null = null;
    if (arc && arc.steps && arc.steps.length >= chapter_number) {
      arcStep = arc.steps[chapter_number - 1];
    }

    // --- Prepare prompt for LLM with arc context ---
    let chapterPrompt = `Continue the story "${story.title}".`;
    if (arcStep) {
      chapterPrompt += `\n\nThis chapter should follow the arc step: "${arcStep.title}" - ${arcStep.description}`;
    }
    if (story.structural_prompt) {
      chapterPrompt += `\n\nIncorporate the following structural guidance: ${story.structural_prompt}`;
    }
    if (prompt) {
      chapterPrompt += `\n\nUser input/context: ${prompt}`;
    }
    chapterPrompt += `\n\nStory so far:\n${context}`;

    // Generate next chapter using latest story parameters and arc step
    let content: string;
    const isFinalChapter = story.story_length && chapter_number >= Number(story.story_length);
    if (isFinalChapter) {
      // Prompt agent to conclude the story and add "The End"
      content = await generateChapter(context, chapterPrompt, {
        preferences: story.preferences,
        reading_level: story.reading_level,
        story_length: story.story_length,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt,
        conclude: true
      });
      if (!/the end/i.test(content.trim())) {
        content = content.trim() + "\n\nThe End.";
      }
    } else {
      content = await generateChapter(context, chapterPrompt, {
        preferences: story.preferences,
        reading_level: story.reading_level,
        story_length: story.story_length,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt
      });
    }

    // Enforce chapter length constraints if specified
    if (story.chapter_length && validateChapterLength && truncateToSpec) {
      const category = story.chapter_length as ChapterLengthCategory;
      if (!validateChapterLength(content, category)) {
        console.log('[CONTINUE_STORY] Chapter content does not fit length spec, truncating...');
        content = truncateToSpec(content, category);
        console.log('[CONTINUE_STORY] Truncated content length', content.length);
      }
    }

    // Insert new chapter with structural_metadata
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{
        story_id,
        chapter_number,
        content,
        prompt,
        structural_metadata: arcStep ? arcStep : null
      }])
      .select()
      .single();
    if (chapterError) throw new Error(chapterError.message);

    // Update story updated_at
    await supabase
      .from('stories')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', story_id);

    // Note: continuations are not returned in this endpoint, but could be generated if needed
    // const continuations = await generateContinuations(chapter.content, story.preferences || {});

    const response: ContinueStoryResponse = {
      story: {
        id: story.id,
        user_id: story.user_id,
        title: story.title,
        preferences: story.preferences,
        reading_level: story.reading_level,
        story_length: story.story_length,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt,
        story_arc: story.story_arc,
        status: story.status,
        created_at: story.created_at,
        updated_at: story.updated_at
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

    return withCORSHeaders(201, response);
  } catch (err: any) {
    return withCORSHeaders(500, { error: err.message || 'Internal server error' });
  }
};