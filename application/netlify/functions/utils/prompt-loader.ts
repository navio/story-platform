import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PromptVariables {
  story_length?: string | number;
  chapter_length?: string;
  reading_level?: string;
  structural_prompt?: string;
}

/**
 * Gets the current directory for the prompt loader
 */
function getCurrentDir(): string {
  // In Netlify functions, use __dirname if available
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  
  // Fallback for other environments
  return process.cwd();
}

/**
 * Loads a prompt template from the prompts directory and replaces variables
 */
export function loadPrompt(
  promptName: string, 
  variables: PromptVariables = {}
): string {
  try {
    const currentDir = getCurrentDir();
    
    // Try multiple possible paths
    const possiblePaths = [
      join(currentDir, '..', 'prompts', `${promptName}.md`),
      join(currentDir, 'prompts', `${promptName}.md`),
      join(process.cwd(), 'netlify', 'functions', 'prompts', `${promptName}.md`),
      join(process.cwd(), 'prompts', `${promptName}.md`),
      // For Netlify bundled functions
      join('/var/task', 'prompts', `${promptName}.md`),
      join('/var/task', 'netlify', 'functions', 'prompts', `${promptName}.md`),
      // Alternative Netlify paths
      join(process.env.LAMBDA_TASK_ROOT || '', 'prompts', `${promptName}.md`),
      join(process.env.LAMBDA_TASK_ROOT || '', 'netlify', 'functions', 'prompts', `${promptName}.md`)
    ];
    
    let promptPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        promptPath = path;
        break;
      }
    }
    
    if (!promptPath) {
      console.error(`Could not find prompt file ${promptName}.md in any of these locations:`, possiblePaths);
      throw new Error(`Prompt file not found: ${promptName}.md`);
    }
    
    console.log(`Loading prompt from: ${promptPath}`);
    let template = readFileSync(promptPath, 'utf-8');
    
    // Replace template variables
    template = template.replace(/\{\{story_length\}\}/g, String(variables.story_length || '[NUMBER]'));
    template = template.replace(/\{\{chapter_length\}\}/g, variables.chapter_length || 'a paragraph');
    template = template.replace(/\{\{reading_level\}\}/g, variables.reading_level || 'Kindergarden');
    
    // Handle structural prompt section
    const structuralSection = variables.structural_prompt 
      ? `## CRUCIAL STORY ELEMENTS\nSeamlessly incorporate: ${variables.structural_prompt}\nThese must enhance, not interrupt, the narrative flow.`
      : '';
    template = template.replace(/\{\{structural_prompt_section\}\}/g, structuralSection);
    
    return template;
  } catch (error) {
    console.error(`Failed to load prompt ${promptName}:`, error);
    throw new Error(`Failed to load prompt template: ${promptName}`);
  }
}