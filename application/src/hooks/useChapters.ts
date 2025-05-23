import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Chapter, Continuation } from '../types/chapter';

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE;

export function useChapters(storyId: string | null) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [continuations, setContinuations] = useState<Continuation[]>([]);
  const [fetchingContinuations, setFetchingContinuations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState('');

  // Fetch chapters for a story
  const fetchChapters = useCallback(async () => {
    if (!storyId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('chapter_number', { ascending: true });
      if (fetchError) throw fetchError;
      setChapters(data || []);
      // Fetch continuations for the latest chapter if any
      if (data && data.length > 0) {
        const lastChapter = data[data.length - 1];
        fetchContinuations(lastChapter.content);
      } else {
        setContinuations([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chapters');
    }
    setLoading(false);
  }, [storyId]);

  // Fetch continuations for a given chapter content
  const fetchContinuations = useCallback(
    async (chapterContent: string) => {
      if (!chapterContent) {
        setContinuations([]);
        return;
      }
      setFetchingContinuations(true);
      try {
        // Get session for access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch(`${EDGE_BASE}/get_continuations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: chapterContent,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to fetch continuations');
        setContinuations(result.continuations || []);
      } catch (err: any) {
        setContinuations([]);
      }
      setFetchingContinuations(false);
    },
    []
  );

  // Add a new chapter via Edge Function
  const addChapter = useCallback(
    async () => {
      if (!storyId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch(`${EDGE_BASE}/continue_story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            story_id: storyId,
            prompt: newPrompt,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add chapter');
        setChapters(prev => {
          const updated = [...prev, result.chapter];
          // Fetch continuations for the new chapter
          fetchContinuations(result.chapter.content);
          return updated;
        });
        setNewPrompt('');
      } catch (err: any) {
        setError(err.message || 'Failed to add chapter');
      }
      setLoading(false);
    },
    [storyId, newPrompt, fetchContinuations]
  );

  return {
    chapters,
    continuations,
    loading,
    error,
    newPrompt,
    setNewPrompt,
    fetchChapters,
    addChapter,
    fetchContinuations,
    fetchingContinuations,
    setChapters, // Exposed for rare advanced use
    setContinuations, // Exposed for advanced use if needed
  };
}