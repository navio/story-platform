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

/**
 * Represents a possible continuation for the story.
 */
interface ContinuationOption {
  description: string;
}

/**
 * API response for continuing a story.
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
  const chapterLength = preferences?.chapter_length || "A full paragraph";
  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: `# CHAPTER CONTINUATION: MAXIMUM ENGAGEMENT PROTOCOL

Generate the next chapter of the ${preferences?.story_length || "[NUMBER]"}-chapter thriller.
Length: EXACTLY ${chapterLength}.
Reading level: ${readinglevel}.

## PRIME DIRECTIVE
Create a continuation so compelling that readers would sacrifice sleep to read the next chapter. Every sentence must tighten the narrative noose.

## CONTINUATION ARCHITECTURE

### OPENING IMPACT FORMULA
First sentence must:
- Directly address the previous chapter's cliffhanger
- Subvert or exceed reader expectations
- Maintain momentum without repetitive recap
- Hook deeper than the previous chapter
- Promise this chapter will be even more intense

### THE ESCALATION IMPERATIVE
This chapter must be MORE than the last:
- Higher stakes (what can be lost has increased)
- Deeper danger (the threat has evolved)
- Tighter timeline (less time to solve problems)
- Harder choices (no good options remain)
- Darker truths (revelations that change everything)

## NARRATIVE PROGRESSION DYNAMICS

### CHAPTER POSITION PROTOCOLS

**IF EARLY CHAPTERS (First Third):**
- Deepen the mystery while providing tantalizing clues
- Introduce a secondary threat that complicates the primary one
- Reveal character backstory through action, not exposition
- Create false victories that mask greater dangers
- Build alliances that will later be tested

**IF MIDDLE CHAPTERS (Middle Third):**
- Shatter a fundamental belief the protagonist held
- Force impossible choices between competing values
- Reveal that the real enemy isn't who they thought
- Strip away the protagonist's support systems
- Approach the "dark night of the soul" moment

**IF LATER CHAPTERS (Final Third):**
- Accelerate toward inevitable confrontation
- Pay off earlier planted clues in surprising ways
- Force protagonist to use their flaw as a strength
- Reveal the true cost of victory
- Build to maximum tension before resolution

**IF FINAL CHAPTER:**
- Deliver a climax that exceeds all expectations
- Resolve the central mystery with a revelation that recontextualizes everything
- Show character transformation through decisive action
- Provide emotional catharsis while maintaining sophistication
- End with a line that haunts readers forever

## ADVANCED CONTINUATION TECHNIQUES

### THE CALLBACK CONSPIRACY
Reference earlier chapters by:
- Revealing hidden significance of "throwaway" details
- Showing how minor characters were crucial all along
- Connecting seemingly unrelated events into a pattern
- Transforming apparent coincidences into orchestrated plans
- Making readers want to immediately reread from the beginning

### TENSION MULTIPLICATION SYSTEM
Layer multiple types of tension:
- Physical danger (immediate threat)
- Emotional conflict (relationship stakes)
- Moral dilemma (ethical impossibilities)
- Psychological pressure (internal breakdown)
- Temporal urgency (countdown/deadline)

### THE REVELATION CASCADE
Structure information reveals:
- 25% confirmation of reader suspicions (they feel smart)
- 50% unexpected twists on expectations
- 25% complete shocking surprises
- Each revelation must make previous chapters richer
- Never reveal everything—always hold something back

## CHARACTER EVOLUTION ENGINE

### PRESSURE POINT DEVELOPMENT
Show how previous events have:
- Created new fears or dissolved old ones
- Changed fundamental beliefs about the world
- Altered relationships in irreversible ways
- Revealed hidden strengths or devastating weaknesses
- Pushed characters past their breaking points

### THE TRANSFORMATION TRACKER
Characters must be different from last chapter:
- Speech patterns reflect their emotional state
- Physical descriptions show toll of events
- Decisions demonstrate learned lessons
- Reactions reveal how they've hardened or softened
- Internal thoughts show shifting priorities

## SENSORY IMMERSION PROTOCOL 2.0

### ENVIRONMENTAL STORYTELLING
Every setting must:
- Reflect the emotional state of the scene
- Contain details that advance the plot
- Hide clues in plain sight
- Create atmosphere through specific sensations
- Feel different from previous chapter locations

### MICRO-DETAIL DEPLOYMENT
Include per 100 words:
- One unexpected sensory detail
- One physical sensation that readers feel
- One environmental element that increases tension
- One subtle change from previous descriptions
- One detail that will matter later

## CLIFFHANGER ENGINEERING 2.0

### THE ESCALATING CLIFFHANGER
This chapter's ending must:
- Be more intense than the previous cliffhanger
- Feel inevitable yet surprising
- Create a problem that seems truly unsolvable
- Promise the next chapter will change everything
- Make readers physically unable to stop reading

### CLIFFHANGER VARIETY MATRIX
Rotate types to maintain freshness:
- The Betrayal: Trusted ally reveals true nature
- The Countdown: Time limit suddenly imposed
- The Trap: Protagonist realizes they've been played
- The Cost: Victory requires unthinkable sacrifice
- The Return: Defeated threat resurfaces stronger
- The Choice: Two people to save, time for only one
- The Truth: Everything believed was a lie

## PACING DYNAMICS 2.0

### RHYTHM ENGINEERING
- Action scenes: Short. Sharp. Brutal.
- Revelation moments: Let sentences breathe with weight
- Emotional beats: Vary length to mirror feeling
- Suspense building: Fragments and questions?
- Climactic moments: ONE. WORD. PARAGRAPHS.

### THE BREATHER TRAP
Include brief moments of:
- False calm before storms
- Small victories before larger defeats
- Human moments before inhuman choices
- Beauty before horror
- Hope before despair

## SOPHISTICATED LAYERING

### THEMATIC DEEPENING
Without preaching, explore:
- How good people do terrible things
- The price of survival vs. maintaining humanity
- Whether ends can ever justify means
- The nature of identity under extreme pressure
- What separates heroes from villains

### LITERARY DEVICE INTEGRATION
- Irony that cuts both ways
- Symbolism that evolves with the story
- Metaphors that become literal
- Foreshadowing disguised as character moments
- Parallel structures that create meaning

## THE ADDICTION FORMULA 2.0

Ensure this chapter:
- Makes the previous chapter better in retrospect
- Creates moments readers will discuss obsessively
- Builds mysteries within mysteries
- Develops characters readers would follow into hell
- Promises the next chapter will be even more intense
- Delivers satisfaction while creating new hunger

## CONTINUITY EXCELLENCE

### CALLBACK CHECKLIST
- Reference at least 3 specific details from previous chapters
- Show consequences of earlier character decisions
- Develop relationships established before
- Build on revealed information logically
- Honor the emotional journey so far

### CONSISTENCY MAINTENANCE
- Character voices remain distinct but show evolution
- Setting details match unless purposefully changed
- Timeline remains logical and trackable
- Technology/magic rules stay consistent
- Motivations flow naturally from established traits

${preferences?.structural_prompt ? `## CRUCIAL STORY ELEMENTS
Continue incorporating: ${preferences.structural_prompt}
These elements should feel increasingly integral to the plot.` : ''}

## FINAL COMMAND
Write this chapter as if the reader's previous investment demands a massive return. Every callback enriches. Every revelation recontextualizes. Every character moment deepens. Every plot development accelerates toward a conclusion that will leave readers breathless.

The story continues NOW:
`
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

/**
 * Generates three possible continuations for the next part of the story.
 * Each continuation is a brief description (one sentence or a few words).
 */
async function generateContinuations(context: string, preferences: Preferences): Promise<ContinuationOption[]> {
  const readinglevel = preferences?.reading_level !== 0 ? `${preferences?.reading_level} Grade` :'Kindergarden';
  const body = {
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: `You are an expert narrative designer. Given the current story context, suggest three possible directions the story could take next. Each suggestion should be a brief description (one sentence or a few words) and should be creative, engaging, and distinct from each other. Do not continue the story, only provide the options.

Story reading level: ${readinglevel}
Chapter length: ${preferences?.chapter_length || "A full paragraph"}
${preferences?.structural_prompt ? "\n" + preferences.structural_prompt : ""}
`
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

    // ENFORCE STORY LENGTH LIMIT
    if (
      typeof story.story_length === "number" &&
      chapters.length >= Number(story.story_length)
    ) {
      return withCORSHeaders(
        new Response(
          JSON.stringify({ error: "Story has reached its maximum number of chapters." }),
          { status: 400 }
        )
      );
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

    // Generate three possible continuations (brief descriptions) using the new chapter's content
    const continuations = await generateContinuations(chapter.content, story.preferences || {});

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

    return withCORSHeaders(new Response(JSON.stringify(response), { status: 201 }));
  } catch (err: any) {
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500 }));
  }
});