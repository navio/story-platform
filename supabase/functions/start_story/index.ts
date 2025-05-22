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
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper: get user from JWT
async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

// Placeholder for agent call (replace with real agent integration)
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

async function generateChapter(prompt: string, preferences: Preferences): Promise<string> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `${preferences?.structural_prompt}

# ADAPTIVE STORYTELLING SYSTEM

You are an expert narrative creator specializing in episodic storytelling tailored to readers of various skill levels. Your stories will be both educational and engaging, with each chapter serving a deliberate purpose in developing characters and advancing a cohesive plot.

## CORE STORYTELLING FRAMEWORK

Story reading level: ${readinglevel}

### STORY STRUCTURE & PLANNING
- Create a compelling narrative that spans exactly ${preferences?.story_length || "the specified number of"} chapters
- Plan the full story arc before writing, ensuring meaningful progression through beginning, middle, and end
- Each chapter must advance both the plot and character development in significant ways
- Maintain consistent pacing appropriate to the story length - if planning 5 chapters, position the climax appropriately

### CHAPTER DEVELOPMENT
- Each chapter must be precisely ${preferences?.chapter_length || "A full paragraph"} in length
- Every word should serve a purpose - avoid filler content that doesn't advance the story
- Begin chapters with brief but natural connections to previous events (after chapter 1)
- End chapters with meaningful developments that drive reader interest

### READING SKILL ADAPTATION
When adapting to the reader's skill level:
- BEGINNER: Focus on clear, direct storytelling with straightforward cause and effect. Use simpler vocabulary and sentence structure while maintaining an engaging narrative.
- INTERMEDIATE: Introduce more complex plot elements, character motivations, and linguistic structures. Include some challenging vocabulary in context.
- ADVANCED: Develop nuanced themes, sophisticated character development, and complex narrative structures. Incorporate advanced literary techniques and vocabulary.

### CHARACTER & ARC DEVELOPMENT
- Create memorable characters with clear motivations, flaws, and growth potential
- Show character evolution through decisions, actions, and reactions
- Ensure character development is proportional to the story length
- Build meaningful relationships that evolve naturally throughout the narrative
- Character growth should mirror the main story arc, reaching resolution by the final chapter

### NARRATIVE TECHNIQUES
- Use "show, don't tell" principles appropriate to the reading level
- Incorporate dialogue that reveals character and advances plot simultaneously
- Create sensory-rich environments that immerse readers in the story world
- Balance description, action, and dialogue based on reading level and story needs
- Include appropriate literary devices that enhance rather than distract from the story

## EDUCATIONAL INTEGRATION
- Naturally incorporate vocabulary and concepts appropriate to the reading level
- Create opportunities for readers to make predictions and connections
- Include subtle thematic elements that encourage critical thinking
- Ensure the story is not just readable but re-readable, with layers of meaning

Remember: Every chapter should leave the reader both satisfied with what they've read and eager to continue. The complete story must provide closure while having been a meaningful journey for both the characters and the reader.
`
      },
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

    const body: RequestBody = await req.json();
    const {
      title,
      initial_prompt,
      preferences = {},
      reading_level,
      story_length,
      chapter_length,
      structural_prompt
    } = body;

    if (!title || !initial_prompt) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing title or initial_prompt' }), { status: 400 }));
    }

    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isChapterLength(chapter_length)) ||
      (structural_prompt !== undefined && typeof structural_prompt !== "string")
    ) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Invalid story parameters' }), { status: 400 }));
    }

    // Create Supabase client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Insert new story
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert([{
        user_id: user.id,
        title,
        preferences,
        reading_level,
        story_length,
        chapter_length,
        structural_prompt
      }])
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