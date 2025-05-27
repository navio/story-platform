# Integrating OpenAI LLM Agent in Supabase Edge Functions

## 1. Store the OpenAI API Key Securely

- In your Supabase project dashboard, go to Project Settings > Environment Variables.
- Add a new variable:
  - Name: `OPENAI_API_KEY`
  - Value: [your OpenAI API key]

## 2. Update Edge Function to Call OpenAI

Example for `start_story/index.ts` and `continue_story/index.ts`:

```ts
// Add at the top
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Replace the generateChapter function with:
async function generateChapter(prompt: string, preferences: any) {
  const body = {
    model: "gpt-4.1-mini-2025-04-14", // or "gpt-4"
    messages: [
      { role: "system", content: "You are a creative story-telling assistant." },
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
  if (!res.ok) throw new Error("OpenAI API error");
  const data = await res.json();
  return data.choices[0].message.content.trim();
}
```

- In `continue_story`, you can build the prompt from the story context and user input.

## 3. Redeploy the Edge Functions

After updating the code, redeploy the functions:
```
supabase functions deploy start_story
supabase functions deploy continue_story
```

## 4. Security

- Never hardcode the API key in your code.
- Always use environment variables for secrets.

---

**Note:** You can further customize the prompt, system message, and model parameters for your use case.