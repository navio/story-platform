import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Story, Chapter, Preferences } from '../../../shared/types/index.ts';

/**
* Local Interfaces and Types
*/

// User interface remains local as it's not part of shared types yet
interface User {
  id: string;
  [key: string]: any;
}

interface RequestBody {
  title: string;
  initial_prompt: string;
  preferences?: Preferences; // Uses imported Preferences
  reading_level?: number;
  story_length?: number;
  chapter_length?: number;
  structural_prompt?: string;
}

// Specific parameters needed for chapter generation by OpenAI
interface ChapterGenerationParams {
  structural_prompt?: string;
  chapter_length?: number;
  story_length?: number;
  reading_level?: number; // Not in shared Preferences, but needed for prompt
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
// function isChapterLength(val: unknown): val is Preferences["chapter_length"] {
//   return (
//     typeof val === "string" &&
//     [
//       "A sentence",
//       "A few sentences",
//       "A small paragraph",
//       "A full paragraph",
//       "A few paragraphs"
//     ].includes(val)
//   );
// }

function isValidChapterLength(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0 && val <= 5; // Assuming 5 is a reasonable upper limit
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

async function generateChapter(prompt: string, generationParams: ChapterGenerationParams): Promise<string> {
  const readinglevel = generationParams?.reading_level !== 0 ? `${generationParams?.reading_level} Grade` :'Kindergarden';
  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `${generationParams?.structural_prompt || ''}

# ADAPTIVE STORYTELLING SYSTEM

You are an expert narrative creator specializing in episodic storytelling tailored to readers of various skill levels. Your stories will be both educational and engaging, with each chapter serving a deliberate purpose in developing characters and advancing a cohesive plot.

## CORE STORYTELLING FRAMEWORK

Story reading level: ${readinglevel}

### STORY STRUCTURE & PLANNING
- Create a compelling narrative that spans exactly ${generationParams?.story_length || "the specified number of"} chapters
- Plan the full story arc before writing, ensuring meaningful progression through beginning, middle, and end
- Each chapter must advance both the plot and character development in significant ways
- Maintain consistent pacing appropriate to the story length - if planning 5 chapters, position the climax appropriately

### CHAPTER DEVELOPMENT
- Each chapter must be precisely ${generationParams?.chapter_length || "A full paragraph"} in length
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
      preferences = {} as Preferences, // body.preferences is of imported Preferences type
      reading_level, // root level reading_level
      story_length, // root level story_length
      chapter_length, // root level chapter_length
      structural_prompt // root level structural_prompt
    } = body;

    if (!title || !initial_prompt) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing title or initial_prompt' }), { status: 400 }));
    }

    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isValidChapterLength(chapter_length)) ||
      (structural_prompt !== undefined && typeof structural_prompt !== "string")
    ) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Invalid story parameters' }), { status: 400 }));
    }

    // Create Supabase client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Create Supabase client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Prepare data for story insertion
    // The 'preferences' field in DB stores body.preferences
    // Root-level fields from request body are stored as direct columns in the story
    const storyToInsert: Partial<Story> = { // Use Partial<Story> for type safety
        user_id: user.id,
        title,
        preferences, // This is body.preferences, typed as imported Preferences
        reading_level, // from body.reading_level
        story_length, // from body.story_length
        chapter_length, // from body.chapter_length
        structural_prompt, // from body.structural_prompt
    };

    // Insert new story
    const { data: storyResult, error: storyError } = await supabase
      .from('stories')
      .insert([storyToInsert])
      .select()
      .single();

    if (storyError) throw new Error(`Story insertion error: ${storyError.message}`);
    if (!storyResult) throw new Error('Failed to create story: No data returned.');

    const newStory = storyResult as Story; // Cast to imported Story type

    // Prepare parameters for chapter generation
    // Use values from request body, falling back to preferences if not set at root
    const generationParams: ChapterGenerationParams = {
      structural_prompt: structural_prompt || preferences.structural_prompt,
      chapter_length: chapter_length || preferences.chapter_length,
      story_length: story_length || preferences.story_length,
      reading_level: reading_level, // reading_level is not in shared Preferences
    };

    // Generate first chapter
    const content = await generateChapter(initial_prompt, generationParams);

    // Insert first chapter
    const chapterToInsert: Partial<Chapter> = { // Use Partial<Chapter>
        story_id: newStory.id,
        chapter_number: 1,
        content,
        prompt: initial_prompt,
    };
    const { data: chapterResult, error: chapterError } = await supabase
      .from('chapters')
      .insert([chapterToInsert])
      .select()
      .single();

    if (chapterError) throw new Error(`Chapter insertion error: ${chapterError.message}`);
    if (!chapterResult) throw new Error('Failed to create chapter: No data returned.');
    
    const newChapter = chapterResult as Chapter; // Cast to imported Chapter type

    return withCORSHeaders(new Response(JSON.stringify({
      story: newStory, // Return the full story object typed as imported Story
      chapter: { // Return relevant chapter details
        id: newChapter.id,
        chapter_number: newChapter.chapter_number,
        content: newChapter.content,
        created_at: newChapter.created_at
      }
    }), { status: 201 }));
  } catch (err: any) {
    console.error("Error in start_story:", err);
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500 }));
  }
});