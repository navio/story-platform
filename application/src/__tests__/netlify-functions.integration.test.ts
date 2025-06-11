import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '../supabaseClient';

// Integration tests for Netlify functions
// These tests require the functions to be running locally (npm run dev:netlify)

const FUNCTIONS_BASE = 'http://localhost:8888/.netlify/functions';

describe('Netlify Functions Integration Tests', () => {
  let authToken: string;
  let testStoryId: string;
  let testChapterId: string;

  beforeAll(async () => {
    // Get auth token for testing
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session. Please ensure you are logged in for testing.');
    }
    authToken = session.access_token;
  });

  describe('start_story function', () => {
    it('should create a new story with initial chapter', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/start_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Test Story for Functions',
          initial_prompt: 'A mysterious door appears in a quiet library.',
          reading_level: 5,
          story_length: 3,
          chapter_length: 'A full paragraph',
          structural_prompt: 'Focus on mystery and discovery',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('story');
      expect(result).toHaveProperty('chapter');
      expect(result.story.title).toBe('Test Story for Functions');
      expect(result.chapter.chapter_number).toBe(1);
      expect(result.chapter.content).toContain('library');
      
      // Store for later tests
      testStoryId = result.story.id;
      testChapterId = result.chapter.id;
    });

    it('should handle missing required fields', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/start_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Incomplete Story',
          // Missing initial_prompt
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing title or initial_prompt');
    });
  });

  describe('get_continuations function', () => {
    it('should get continuation options for chapter content', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/get_continuations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'The mysterious door creaked open, revealing darkness beyond.',
          preferences: {
            reading_level: 5,
            chapter_length: 'A full paragraph',
          },
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('continuations');
      expect(Array.isArray(result.continuations)).toBe(true);
      expect(result.continuations.length).toBeGreaterThan(0);
      expect(result.continuations[0]).toHaveProperty('description');
    });

    it('should handle missing content', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/get_continuations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Missing content
          preferences: {},
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing content');
    });
  });

  describe('continue_story function', () => {
    it('should add a new chapter to existing story', async () => {
      // Skip if we don't have a test story
      if (!testStoryId) {
        console.warn('Skipping continue_story test - no test story available');
        return;
      }

      const response = await fetch(`${FUNCTIONS_BASE}/continue_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          story_id: testStoryId,
          prompt: 'The protagonist steps through the door bravely.',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('story');
      expect(result).toHaveProperty('chapter');
      expect(result.chapter.chapter_number).toBe(2);
      expect(result.chapter.story_id).toBe(testStoryId);
      expect(result.chapter.content).toBeTruthy();
      
      // Update for rating test
      testChapterId = result.chapter.id;
    });

    it('should handle missing story_id', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/continue_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Missing story_id
          prompt: 'Some prompt',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing story_id');
    });
  });

  describe('rate_chapter function', () => {
    it('should update chapter rating', async () => {
      // Skip if we don't have a test chapter
      if (!testChapterId) {
        console.warn('Skipping rate_chapter test - no test chapter available');
        return;
      }

      const response = await fetch(`${FUNCTIONS_BASE}/rate_chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          chapter_id: testChapterId,
          rating: 4,
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.chapter_id).toBe(testChapterId);
      expect(result.rating).toBe(4);
    });

    it('should validate rating range', async () => {
      if (!testChapterId) {
        console.warn('Skipping rating validation test - no test chapter available');
        return;
      }

      const response = await fetch(`${FUNCTIONS_BASE}/rate_chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          chapter_id: testChapterId,
          rating: 10, // Invalid rating (should be 1-5)
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('rating (must be 1-5)');
    });
  });

  describe('update_story function', () => {
    it('should update story settings', async () => {
      // Skip if we don't have a test story
      if (!testStoryId) {
        console.warn('Skipping update_story test - no test story available');
        return;
      }

      const response = await fetch(`${FUNCTIONS_BASE}/update_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          story_id: testStoryId,
          reading_level: 7,
          story_length: 5,
          chapter_length: 'A few paragraphs',
          structural_prompt: 'Updated structural guidance',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('story');
      expect(result.story.reading_level).toBe(7);
      expect(result.story.story_length).toBe(5);
      expect(result.story.chapter_length).toBe('A few paragraphs');
    });

    it('should handle missing story_id', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/update_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Missing story_id
          reading_level: 5,
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing story_id');
    });
  });

  describe('CORS and Authentication', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/start_story`, {
        method: 'OPTIONS',
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should reject requests without authorization', async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/start_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify({
          title: 'Test',
          initial_prompt: 'Test prompt',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('authorization');
    });
  });

  // Cleanup test data
  describe('Cleanup', () => {
    it('should cleanup test story', async () => {
      if (!testStoryId) {
        return;
      }

      // Delete test story and chapters
      await supabase.from('chapters').delete().eq('story_id', testStoryId);
      await supabase.from('stories').delete().eq('id', testStoryId);
    });
  });
});