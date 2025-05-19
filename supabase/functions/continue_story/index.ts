import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getUserFromJWT(jwt: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}

// Placeholder for agent call (replace with real agent integration)
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

async function generateChapter(context: string, prompt: string, preferences: any) {
  const userPrompt = prompt ? `Continue the story with this user input: "${prompt}"` : "Continue the story in an interesting way.";
  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a creative story-telling assistant. Continue the story based on the previous chapters and user input." },
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

    // Validate and sanitize new fields if present
    function isPositiveInt(val) {
      return typeof val === "number" && Number.isInteger(val) && val > 0;
    }
    function isReadingLevel(val) {
      return typeof val === "number" && val >= 0 && val <= 12;
    }
    if (
      (reading_level !== undefined && !isReadingLevel(reading_level)) ||
      (story_length !== undefined && !isPositiveInt(story_length)) ||
      (chapter_length !== undefined && !isPositiveInt(chapter_length)) ||
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
    const content = await generateChapter(context, prompt, {
      preferences: story.preferences,
      reading_level: story.reading_level,
      story_length: story.story_length,
      chapter_length: story.chapter_length,
      structural_prompt: story.structural_prompt
    });

    // Insert new chapter
    const chapter_number = chapters.length + 1;
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