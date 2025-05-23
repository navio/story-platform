import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Story } from '../types/story';

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE as string;

interface CreateStoryParams {
  title: string;
  initialPrompt: string;
  readingLevel: number;
  storyLength: number;
  chapterLength: string;
  structuralPrompt: string;
}

interface UpdateStoryParams {
  storyId: string;
  readingLevel: number;
  storyLength: number;
  chapterLength: string;
  structuralPrompt: string;
}

export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all stories for the current user
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }
    const { user } = userData;
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (storiesError) setError(storiesError.message);
    else if (!storiesData) {
      setError(storiesError ? (storiesError as any).message : 'No data returned');
      setLoading(false);
      return;
    }
    else setStories(storiesData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Create a new story via Edge Function
  const createStory = useCallback(async (params: CreateStoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const { session } = sessionData;
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${EDGE_BASE}/start_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: params.title,
          initial_prompt: params.initialPrompt,
          reading_level: params.readingLevel,
          story_length: params.storyLength,
          chapter_length: params.chapterLength,
          structural_prompt: params.structuralPrompt,
          preferences: {
            reading_level: params.readingLevel,
            story_length: params.storyLength,
            chapter_length: params.chapterLength,
            structural_prompt: params.structuralPrompt,
          },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create story');
      // Refetch stories and select the new one
      // Refetch stories and select the most recent one for the user (by title and created_at)
      const { data: allStories, error: allStoriesError } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      if (allStoriesError) throw new Error(allStoriesError.message);
      // Try to find the story with the matching title (and optionally user_id if available)
      const newStory = allStories?.find((s: any) => s.title === params.title) || (allStories && allStories[0]);
      if (!newStory) {
        setError('Story not found after creation');
        setLoading(false);
        return Promise.reject(new Error('Story not found after creation'));
      }
      setStories(prev => [newStory, ...prev]);
      setLoading(false);
      return newStory as Story;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  // Update a story via Edge Function
  const updateStory = useCallback(async (params: UpdateStoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${EDGE_BASE}/update_story`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          story_id: params.storyId,
          reading_level: params.readingLevel,
          story_length: params.storyLength,
          chapter_length: params.chapterLength,
          structural_prompt: params.structuralPrompt,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update story');
      // Refetch the updated story
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', params.storyId)
        .single();
      if (error) throw new Error(error.message);
      setStories(prev =>
        prev.map(s => (s.id === params.storyId ? data : s))
      );
      setLoading(false);
      return data as Story;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  // Delete a story (and its chapters)
  const deleteStory = useCallback(async (storyId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Delete chapters first (to avoid FK constraint), then story
      const { error: chaptersError } = await supabase
        .from('chapters')
        .delete()
        .eq('story_id', storyId);
      const { error: storyError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);
      if (chaptersError || storyError) {
        throw new Error(
          chaptersError?.message ||
          storyError?.message ||
          'Failed to delete story'
        );
      }
      setStories(prev => prev.filter(s => s.id !== storyId));
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    stories,
    loading,
    error,
    fetchStories,
    createStory,
    updateStory,
    deleteStory,
    setStories, // for selection, if needed
    setError,
  };
}