# Story Platform

This project is a premium, book-like, responsive story platform built with React, TypeScript, Vite, Supabase, and OpenAI. It features a distraction-free reading experience, dynamic story generation, and a robust pre-story configuration system.

For detailed information on the project architecture, components, setup, and design principles, please see [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

## Running & Building

- To start the client:  
  `cd client && npm install && npm run dev`
- To build for production:  
  `cd client && npm run build`
- To deploy backend functions:  
  `cd supabase && supabase functions deploy start_story && supabase functions deploy continue_story`
- To apply database migrations:  
  Use the Supabase dashboard SQL editor or CLI.
