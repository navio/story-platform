import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.203.0/encoding/base64.ts";

// Define basic interfaces
interface User {
  id: string;
  [key: string]: any;
}

// RequestBody interface is no longer strictly needed for the main path if using FormData,
// but can be kept for type clarity or other potential uses.
// interface RequestBody {
//   description: string; 
// }

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Helper to get user from JWT
async function getUserFromJWT(jwt: string): Promise<User> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user as User;
}

// CORS Headers Helper
function withCORSHeaders(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*"); 
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, content-type, x-client-info, apikey"); // apikey for Supabase client
  return new Response(resp.body, { ...resp, headers });
}

// Renamed and unchanged DALL-E call function
async function generateImageFromDALLE(prompt: string, apiKey: string): Promise<{ imageUrl: string }> {
  const body = {
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url" as const,
  };

  console.log(`Requesting image generation from OpenAI DALL-E for: ${prompt}`);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenAI DALL-E API error:", res.status, errorText);
    throw new Error(`OpenAI DALL-E API request failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();

  if (!data.data || !data.data[0] || !data.data[0].url) {
    console.error("Invalid response structure from OpenAI DALL-E API:", data);
    throw new Error("Failed to extract image URL from OpenAI DALL-E API response.");
  }

  console.log(`Successfully received image URL: ${data.data[0].url}`);
  return { imageUrl: data.data[0].url };
}

// NEW: GPT-4 Vision call function
async function analyzeImageWithGPTVision(imageDataBuffer: ArrayBuffer, mimeType: string, apiKey: string): Promise<string> {
  const base64Image = encode(imageDataBuffer); // Deno's built-in base64 encoding

  const payload = {
    model: "gpt-4-turbo", // Or "gpt-4-vision-preview"
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Analyze this character image. Provide a concise textual description focusing on prominent visual elements (like art style, character archetype, key clothing items, colors, mood) that could inspire a new character design based on it. This description will be used to augment a prompt for an image generation model." 
          },
          { 
            type: "image_url", 
            image_url: { 
              url: `data:${mimeType};base64,${base64Image}` 
            } 
          }
        ]
      }
    ],
    max_tokens: 300
  };

  console.log(`Requesting image analysis from OpenAI GPT-4 Vision for image type: ${mimeType}`);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenAI GPT-4 Vision API error:", res.status, errorText);
    throw new Error(`OpenAI GPT-4 Vision API request failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    console.error("Invalid response structure from OpenAI GPT-4 Vision API:", data);
    throw new Error("Failed to extract analysis from OpenAI GPT-4 Vision API response.");
  }

  console.log("Successfully received image analysis from GPT-4 Vision.");
  return data.choices[0].message.content;
}


serve(async (req: Request): Promise<Response> => {
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
    await getUserFromJWT(jwt);

    const contentType = req.headers.get("content-type");
    let finalPrompt: string;
    let description: string | null = null;

    if (contentType && contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      description = formData.get("description") as string | null;
      const imageFile = formData.get("image") as File | null;

      if (!description && !imageFile) {
        return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing description or image in form data' }), { status: 400 }));
      }
      
      finalPrompt = description || "";

      if (imageFile) {
        const imageArrayBuffer = await imageFile.arrayBuffer();
        const mimeType = imageFile.type || 'image/png'; // Use file's MIME type or default to PNG
        
        console.log(`Processing uploaded image: ${imageFile.name}, type: ${mimeType}, size: ${imageArrayBuffer.byteLength} bytes`);
        const visionAnalysisResult = await analyzeImageWithGPTVision(imageArrayBuffer, mimeType, openaiApiKey);
        
        if (description && description.trim() !== "") {
          finalPrompt = `User's request: "${description}". Visual context from uploaded image: "${visionAnalysisResult}"`;
        } else {
          finalPrompt = `Generate a character based on the visual context of an uploaded image. Analysis of image: "${visionAnalysisResult}"`;
        }
        console.log("Augmented prompt with vision analysis:", finalPrompt);
      } else if (!description || description.trim() === "") {
        // This case means imageFile is null AND description is null or empty.
        // The check at the beginning of the block (`!description && !imageFile`) should catch if both are null.
        // This handles if description is present but empty string, and no image.
        return withCORSHeaders(new Response(JSON.stringify({ error: 'Description is required if no image is provided or if description is empty.' }), { status: 400 }));
      }
    } else if (contentType && contentType.includes("application/json")) {
      // Original path: JSON body with description only
      const bodyJson = await req.json();
      description = bodyJson.description;
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return withCORSHeaders(new Response(JSON.stringify({ error: 'Missing or invalid description in JSON request body' }), { status: 400 }));
      }
      finalPrompt = description;
      console.log("Using text-only prompt (JSON):", finalPrompt);
    } else {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Unsupported content type. Please use multipart/form-data or application/json.' }), { status: 415 }));
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
        // Final safety net, though previous checks should prevent this.
        return withCORSHeaders(new Response(JSON.stringify({ error: 'A valid prompt could not be constructed.' }), { status: 400 }));
    }

    const { imageUrl } = await generateImageFromDALLE(finalPrompt, openaiApiKey);
    return withCORSHeaders(new Response(JSON.stringify({ imageUrl }), { status: 200 }));

  } catch (err: any) {
    console.error("Error in character-render function:", err.message, err.stack); 
    let statusCode = 500;
    let errorMessage = err.message || 'Internal server error';

    if (err.message === 'Unauthorized') {
      statusCode = 401;
    } else if (err.message.includes('Missing or invalid description') || err.message.includes('Missing description or image')) {
      statusCode = 400;
    } else if (err.message.startsWith('OpenAI DALL-E API request failed:')) {
      const detail = err.message.substring('OpenAI DALL-E API request failed:'.length).trim();
      errorMessage = `Image generation DALL-E error: ${detail}`;
      if (detail.includes('billing') || detail.includes('quota')) {
        statusCode = 403; 
        errorMessage = "Image generation failed due to DALL-E billing or quota restrictions.";
      } else if (detail.includes('safety system') || detail.includes('prompt constraints')) {
        statusCode = 400;
        errorMessage = `Image generation DALL-E error: Rejected by safety system or prompt constraints. Details: ${detail}`;
      } else {
        statusCode = 502; 
        errorMessage = `The DALL-E service returned an error: ${detail}`;
      }
    } else if (err.message.startsWith('OpenAI GPT-4 Vision API request failed:')) {
        const detail = err.message.substring('OpenAI GPT-4 Vision API request failed:'.length).trim();
        errorMessage = `Image analysis GPT Vision error: ${detail}`;
        if (detail.includes('billing') || detail.includes('quota')) {
            statusCode = 403;
            errorMessage = "Image analysis failed due to GPT Vision billing or quota restrictions.";
        } else if (detail.includes('Invalid image') || detail.includes('Unsupported image format')) {
            statusCode = 400; 
            errorMessage = `Image analysis GPT Vision error: Invalid or unsupported image. Details: ${detail}`;
        } else {
            statusCode = 502;
            errorMessage = `The GPT Vision service returned an error: ${detail}`;
        }
    } else if (err.message === "Failed to extract image URL from OpenAI DALL-E API response.") {
        statusCode = 502;
        errorMessage = "The DALL-E service returned an unexpected response.";
    } else if (err.message === "Failed to extract analysis from OpenAI GPT-4 Vision API response.") {
        statusCode = 502;
        errorMessage = "The GPT Vision service returned an unexpected response.";
    } else if (err instanceof Deno.errors.Http || err.message.includes("could not parse multipart form")) {
        statusCode = 400; // Bad request if form data parsing fails
        errorMessage = "Invalid request: Could not parse form data.";
    }
    
    return withCORSHeaders(new Response(JSON.stringify({ error: errorMessage, details: err.stack }), { status: statusCode })); // Include stack in details for debugging
  }
});

console.log("Character-render function server listening for image and text prompts...");
