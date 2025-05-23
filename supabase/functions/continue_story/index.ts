import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

// Placeholder for agent call (replace with real agent integration)
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

async function generateChapter(
  context: string,
  prompt: string | undefined,
  preferences: Preferences
): Promise<string> {
  const userPrompt = prompt ? `Continue the story with this user input: "${prompt}"` : "Continue the story in an interesting way.";
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `${preferences?.structural_prompt}

# ADAPTIVE STORY CONTINUATION SYSTEM

You are an expert narrative developer specializing in crafting compelling story continuations. Your task is to advance an existing story while maintaining narrative cohesion, character consistency, and progression toward a satisfying conclusion.

## CONTINUATION FRAMEWORK

Rading Level: ${readinglevel}

### NARRATIVE PROGRESSION
- Continue the story with precise awareness of where this chapter falls in the overall arc (beginning, middle, or end)
- If approaching the middle: Deepen conflicts, increase stakes, or introduce complications
- If approaching the end: Begin resolving plot threads while maintaining tension
- If this is the final chapter: Provide a satisfying resolution to the main conflicts while honoring character arcs
- Maintain exactly ${preferences?.story_length || "the specified number of"} total chapters in your planning

### CHAPTER CONSTRUCTION
- Create a chapter precisely ${preferences?.chapter_length || "A full paragraph"} in length
- Begin with a subtle connection to previous events without extensive recapping
- End with a compelling development that maintains momentum and reader engagement
- Every element must serve the dual purpose of advancing the plot and developing characters

### STORY COHESION
- Maintain consistent characterization, settings, and plot elements from previous chapters
- Reference earlier events, decisions, and character moments to create narrative unity
- Develop (don't abandon) established conflicts, relationships, and themes
- Ensure any new elements introduced serve the overall story and don't distract from the main arc

### CHARACTER CONTINUITY
- Demonstrate character growth resulting from previous events
- Show how characters are changed by their experiences, not just responding to new situations
- Deepen relationships established in earlier chapters
- Allow character decisions to naturally flow from established motivations and growth

### READING LEVEL MAINTENANCE
- Sustain the established reading level while continuing to challenge and engage the reader
- Maintain vocabulary consistency while strategically introducing new terms appropriate to level
- Keep sentence and paragraph complexity aligned with the reading skill target
- Ensure thematic elements remain developmentally appropriate while remaining meaningful

## PACING CONSIDERATIONS
- If early chapters (first third): Continue developing the foundation while introducing meaningful complications
- If middle chapters (middle third): Intensify conflicts, deepen relationships, raise stakes
- If later chapters (final third): Begin resolution while maintaining tension until the final chapter
- If final chapter: Provide closure to all major plot threads and character arcs

Remember: Each chapter must feel like a natural and necessary continuation of what came before while still advancing toward a conclusive ending. Avoid stalling tactics or filler content. Every word should serve the story's progression toward its planned conclusion.`
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), { status: 401 }));
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const user = await getUserFromJWT(jwt);

    const body: RequestBody = await req.json();
    const {
      story_id,
      prompt,
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    } = body;
    if (!story_id) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing story_id' }), { status: 400 }));
    }

    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isChapterLength(chapter_length)) ||
      (structural_prompt !== undefined && typeof structural_prompt !== "string")
    ) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Invalid story parameters' }), { status: 400 }));
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
    if (story.user_id !== user.id) return withCORSHeaders(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));

    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', story_id)
      .order('chapter_number', { ascending: true });
    if (chaptersError) throw new Error(chaptersError.message);

    // Build context from previous chapters
    const context = chapters.map((ch: any) => ch.content).join('\n\n');

    // Generate next chapter using latest story parameters
    let content: string;
    const chapter_number = chapters.length + 1;
    const isFinalChapter = story.story_length && chapter_number >= Number(story.story_length);
    if (isFinalChapter) {
      // Prompt agent to conclude the story and add "The End"
      content = await generateChapter(context, prompt, {
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
      content = await generateChapter(context, prompt, {
        preferences: story.preferences,
        reading_level: story.reading_level,
        story_length: story.story_length,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt
      });
    }

    // Insert new chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{
        story_id,
        chapter_number,
        content,
        prompt
      }])
      .select()
      .single();
    if (chapterError) throw new Error(chapterError.message);

    // Update story updated_at
    await supabase
      .from('stories')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', story_id);

    return withCORSHeaders(new Response(JSON.stringify({
      story: {
        id: story.id,
        user_id: story.user_id,
        title: story.title,
        preferences: story.preferences,
        reading_level: story.reading_level,
        story_length: story.story_length,
        chapter_length: story.chapter_length,
        structural_prompt: story.structural_prompt,
        status: story.status,
        created_at: story.created_at,
        updated_at: story.updated_at
      },
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