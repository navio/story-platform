# Deploying Supabase Edge Functions

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Logged in to Supabase CLI (`supabase login`)
- Project ref set for your project (`supabase link --project-ref xzngetmbbuoxjucudiyo`)

## Deploying Functions

From the root of your project, run:

```sh
cd supabase
supabase functions deploy start_story --project-ref xzngetmbbuoxjucudiyo
supabase functions deploy continue_story --project-ref xzngetmbbuoxjucudiyo
```

## Setting Environment Variables

Set the following environment variables in your Supabase project (via dashboard or CLI):

- `SUPABASE_URL` = https://xzngetmbbuoxjucudiyo.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = [Your Supabase service role key]

You can find the service role key in your Supabase dashboard under Project Settings > API.

## Invoking Functions

After deployment, your functions will be available at:

- `POST https://xzngetmbbuoxjucudiyo.functions.supabase.co/start_story`
- `POST https://xzngetmbbuoxjucudiyo.functions.supabase.co/continue_story`

**Authentication:**  
Include the user's Supabase Auth JWT in the `Authorization: Bearer ...` header for all requests.