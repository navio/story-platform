import { useState, useCallback } from 'react';

import { supabase } from '../supabaseClient';
import type { Chapter, Continuation } from '../types/chapter';

const EDGE_BASE = "https://xzngetmbbuoxjucudiyo.functions.supabase.co";

export function useChapters(storyId: string | null) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [continuations, setContinuations] = useState<Continuation[]>([]);
  const [fetchingContinuations, setFetchingContinuations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState('');

  // Fetch chapters for a story
  // Move fetchContinuations above fetchChapters to avoid initialization errors
  const fetchContinuations = useCallback(
    async (chapterContent: string) => {
      if (!chapterContent) {
        setContinuations([]);
        return;
      }
      setFetchingContinuations(true);
      try {
        // Log the EDGE_BASE and request details for debugging
        console.log('[fetchContinuations] EDGE_BASE:', EDGE_BASE);
        // Get session for access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const url = `${EDGE_BASE}/get_continuations`;
        console.log('[fetchContinuations] Requesting:', url, 'with content:', chapterContent);
        const res = await fetch(url, {
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
        if (!res.ok) {
          console.error('[fetchContinuations] Error response:', result);
          throw new Error(result.error || 'Failed to fetch continuations');
        }
        setContinuations(result.continuations || []);
      } catch (err) {
        console.error('[fetchContinuations] Exception:', err);
        setContinuations([]);
      }
      setFetchingContinuations(false);
    },
    [setContinuations, setFetchingContinuations]
  );

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
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        setError((err as any).message);
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to fetch chapters');
      } else {
        setError('Failed to fetch chapters');
      }
    }
    setLoading(false);
  }, [storyId, fetchContinuations]);

  // (Removed duplicate fetchContinuations declaration)

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
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'Failed to add chapter');
          throw err;
        } else {
          setError('Failed to add chapter');
          throw new Error('Failed to add chapter');
        }
      } finally {
        setLoading(false);
      }
    },
    [storyId, newPrompt, fetchContinuations]
  );

  // Rate a chapter (update rating)
  const rateChapter = useCallback(
    async (chapterId: string, rating: number) => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const url = `${EDGE_BASE}/rate_chapter`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ chapter_id: chapterId, rating }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to rate chapter');
        // Update local chapter rating
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === chapterId ? { ...ch, rating } : ch
          )
        );
      } catch (err: any) {
        setError(err.message || 'Failed to rate chapter');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setChapters]
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
    rateChapter, // <-- expose the new method
  };
}