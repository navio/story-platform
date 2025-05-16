# Setting OpenAI API Key for Supabase Edge Functions

Supabase Edge Functions require secrets to be set using the Supabase CLI.

## 1. Set the Secret

From your project root, run:

```
supabase secrets set OPENAI_API_KEY=sk-...   # (replace with your actual key)
```

## 2. Redeploy Edge Functions

After setting the secret, redeploy your functions:

```
supabase functions deploy start_story
supabase functions deploy continue_story
```

**Note:**  
- Secrets set in the Supabase dashboard are NOT available to Edge Functions.  
- Only secrets set via the CLI are available at runtime in Edge Functions.