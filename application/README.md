# Story Platform Application

## Project Structure

### Netlify Functions
The serverless functions are located in `netlify/functions/` directory:
- `continue_story.ts` - Continues an existing story with AI-generated content
- `get_continuations.ts` - Retrieves story continuation options
- `rate_chapter.ts` - Handles chapter rating functionality
- `start_story.ts` - Initializes new stories
- `update_story.ts` - Updates existing story metadata
- `utils/chapter_length.ts` - Utility functions for chapter length calculations
- `utils/prompt-loader.ts` - Utility for loading external prompt templates
- `prompts/` - External prompt template files (.md format)
  - `continue-story-system.md` - System prompt for story continuation
  - `start-story-system.md` - System prompt for starting new stories
  - `continuations-system.md` - System prompt for generating story options
  - `story-arc-system.md` - System prompt for generating story arcs

#### Prompt Templates
The AI prompts have been externalized into separate markdown files in the `prompts/` directory. This allows for:
- Easy manual tuning of prompts without code changes
- Version control of prompt modifications
- Template variable substitution for dynamic content
- Separation of AI logic from application code

## Development

### Running the Application
```bash
npm install
npm run dev
```

### Testing
```bash
npm test
```

### Deployment

#### Git-based Deployment (Recommended)
The application is automatically deployed via git commits using the configuration in `netlify.toml`:
- **Build command**: `npm ci && npm run build` 
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`
- **Included files**: Prompt templates and utilities are included in function deployment

#### Manual Deployment  
For manual deployments:
- `npm run deploy` - Deploy the built application
- `npm run deploy:functions` - Deploy functions and application together

#### Configuration
- `netlify.toml` - Main Netlify configuration
- `netlify/functions/package.json` - Function-specific dependencies
- Environment variables are configured in `netlify.toml` for consistency