import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateChapterLength,
  truncateToSpec,
  ChapterLengthCategory
} from "../utils/chapter_length.ts";


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
 *
 * {
 *   story: { ... },
 *   chapter: { ... },
 *   continuations: [
 *     { description: string },
 *     { description: string },
 *     { description: string }
 *   ]
 * }
 */
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
/**
 * Generate a full story arc/outline (e.g., hero’s journey) as a structured array of steps.
 * Returns an array of arc steps, each with a title and description.
 */
async function generateStoryArc(
  title: string,
  initial_prompt: string,
  preferences: Preferences
): Promise<{ steps: { title: string; description: string }[] }> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: `You are an expert story architect. Given a story title, initial prompt, and preferences, generate a full story arc/outline using a classic structure (e.g., hero's journey, three-act, or similar). 
Return a JSON object with a "steps" array, where each step has a "title" and "description". 
The arc should have as many steps as the intended story_length (default 7 if not specified). 
Each step should be concise, actionable, and guide the narrative for a chapter.`
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
  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: `# CHAPTER ONE: MAXIMUM ENGAGEMENT PROTOCOL

Generate Chapter 1 of a ${preferences?.story_length || "[NUMBER]"}-chapter thriller.
Length: EXACTLY ${preferences?.chapter_length || "a pargraph"}. 
Reading level: ${readinglevel}.

## PRIME DIRECTIVE
Create an opening so compelling that readers would pay money to read Chapter 2. Every sentence must be a hook that pulls deeper into the story.

## OPENING IMPACT FORMULA

### THE FIRST LINE RULE
Open with one of these power techniques:
- In medias res: Drop readers into the middle of action
- The Paradox: Present an impossible situation
- The Voice: Unforgettable character perspective
- The Question: Pose something readers must know
- The Reversal: Subvert expectations immediately

### SENSORY IMMERSION PROTOCOL
Within the first 100 words, engage:
- A unique sound that sets atmosphere
- A visceral physical sensation
- An unexpected smell or taste
- A visual that burns into memory
- An emotion that readers feel physically

## CHARACTER MAGNETISM ENGINE

### INSTANT CONNECTION TECHNIQUE
Make readers care desperately about your protagonist within 3 paragraphs by showing:
- A relatable vulnerability hidden beneath strength
- A specific detail that makes them unforgettable
- A moral line they won't cross (that they'll have to)
- A secret desire they can't admit
- A ticking clock only they know about

### THE CONTRADICTION PRINCIPLE
Your protagonist must be:
- Competent but flawed in a specific, plot-critical way
- Confident but harboring a deep fear
- Moral but capable of necessary darkness
- Ordinary but with one extraordinary quality
- In control but about to lose everything

## PLOT ARCHITECTURE

### THE TRIPLE HOOK SYSTEM
Layer three escalating hooks:
1. Immediate: A problem that needs solving NOW
2. Personal: A stake that threatens what character loves most
3. Universal: A larger mystery that affects everything

### MICRO-TENSION INJECTION
Every 50 words must contain:
- A question (stated or implied)
- A contradiction
- A sensory detail
- Forward momentum
- Emotional stakes raising

### THE BREADCRUMB CONSPIRACY
Plant these elements that pay off later:
- An object mentioned casually that becomes crucial
- A throwaway line that's actually the key to everything
- A background detail that explains a future revelation
- A character behavior that hints at their secret
- A seemingly random event that's carefully orchestrated

## CLIFFHANGER ENGINEERING

### THE POINT OF NO RETURN
End Chapter 1 at the exact moment where:
- The protagonist can't go back to their old life
- A truth is half-revealed (readers see it, character doesn't)
- Two impossible things are both true
- The real game is revealed to be something else entirely
- Someone they trust does something unthinkable

### LAST LINE DETONATION
Your final sentence must:
- Recontextualize everything that came before
- Create a question readers would lose sleep over
- Promise a revelation in Chapter 2
- Make the protagonist's goal suddenly impossible
- Introduce a element that changes all the rules

## ADVANCED ENGAGEMENT TECHNIQUES

### THE ICEBERG METHOD
- Show 10%, imply 90%
- Every revelation suggests deeper mysteries
- Each answer spawns three questions
- Nothing is exactly what it seems
- Trust no narrator completely

### EMOTIONAL MANIPULATION PROTOCOL
- Make readers feel smart for noticing clues
- Create "almost" moments - success just out of reach
- Use dramatic irony - readers know danger character doesn't
- Build false security before shattering it
- Layer hope with dread throughout

### PACING DYNAMICS
- Short sentences during tension.
- Longer, flowing sentences during false calm.
- Fragments. For. Impact.
- Questions that make readers supply answers?
- Paragraph breaks 
  that create
    suspense.

## SOPHISTICATED ELEMENTS

### THEMATIC DEPTH
Weave in (subtly):
- A philosophical question with no easy answer
- A moral dilemma that divides readers
- A universal fear made personal
- A societal issue through individual lens
- A choice between two rights or two wrongs

### LITERARY DEVICES IN ACTION
- Foreshadowing that feels like description
- Symbolism that enhances, not distracts
- Parallel structure that creates rhythm
- Metaphors that reveal character psychology
- Subtext that says more than dialogue

## THE ADDICTION FORMULA

Before writing, ensure your chapter will:
- Create a reading experience readers can't pause
- Generate water-cooler moments readers must discuss
- Plant questions that haunt readers after they stop
- Build a world readers desperately want to explore
- Introduce characters readers would follow anywhere
- Promise revelations readers would pay to discover

${preferences.structural_prompt ? `## CRUCIAL STORY ELEMENTS
Seamlessly incorporate: ${preferences.structural_prompt}
These must enhance, not interrupt, the narrative flow.` : ''}

## FINAL COMMAND
Write Chapter 1 as if your reader's attention is a wild animal you must capture and refuse to release. Every word is a trap. Every sentence is a snare. Every paragraph tightens the net.

Begin with a line that changes everything:
`
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


function withCORSHeaders(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "https://story-platform.netlify.app");
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

  // --- LOG: request received ---
  console.log('[START_STORY] Incoming request', { method: req.method, time: new Date().toISOString() });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), { status: 401 }));
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const user = await getUserFromJWT(jwt);
    // --- LOG: user authenticated ---
    console.log('[START_STORY] Authenticated user', user.id);

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

    // --- LOG: body parsed ---
    console.log('[START_STORY] Parsed body', { title, reading_level, story_length, chapter_length });

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
    if (chapter_length && validateChapterLength && truncateToSpec) {
      const category = chapter_length as ChapterLengthCategory;
      if (!validateChapterLength(content, category)) {
        console.log('[START_STORY] Chapter content does not fit length spec, truncating...');
        content = truncateToSpec(content, category);
        console.log('[START_STORY] Truncated content length', content.length);
      }
    }

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
    return withCORSHeaders(new Response(JSON.stringify(response), { status: 201 }));
  } catch (err: any) {
    console.error('[START_STORY] Error', err);
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500 }));
  }
});