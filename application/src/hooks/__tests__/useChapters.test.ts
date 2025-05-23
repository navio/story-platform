import { renderHook, act } from '@testing-library/react';
import { useChapters } from '../useChapters';
import { vi } from 'vitest';

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

const mockSession = { access_token: 'token-123' };
const mockChapter = { id: 'chapter-1', story_id: 'story-1', chapter_number: 1, content: 'Once upon a time...' };

describe('useChapters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches chapters for a story', async () => {
    const { supabase } = require('../../supabaseClient');
    supabase.from().select().eq().order.mockResolvedValue({
      data: [mockChapter],
      error: null,
    });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await result.current.fetchChapters();
    });

    expect(result.current.chapters).toEqual([mockChapter]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does nothing if storyId is null on fetch', async () => {
    const { result } = renderHook(() => useChapters(null));
    await act(async () => {
      await result.current.fetchChapters();
    });
    expect(result.current.chapters).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles error from supabase on fetch', async () => {
    const { supabase } = require('../../supabaseClient');
    supabase.from().select().eq().order.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await result.current.fetchChapters();
    });

    expect(result.current.error).toBe('DB error');
    expect(result.current.chapters).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('adds a chapter successfully', async () => {
    const { supabase } = require('../../supabaseClient');
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chapter: mockChapter }),
    });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      result.current.setNewPrompt('Prompt!');
      await result.current.addChapter();
    });

    expect(result.current.chapters[0]).toEqual(mockChapter);
    expect(result.current.newPrompt).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error if not authenticated on addChapter', async () => {
    const { supabase } = require('../../supabaseClient');
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await expect(result.current.addChapter()).rejects.toThrow('Not authenticated');
    });

    expect(result.current.error).toBe('Not authenticated');
    expect(result.current.loading).toBe(false);
  });

  it('handles error from fetch on addChapter', async () => {
    const { supabase } = require('../../supabaseClient');
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Edge error' }),
    });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await expect(result.current.addChapter()).rejects.toThrow('Edge error');
    });

    expect(result.current.error).toBe('Edge error');
    expect(result.current.loading).toBe(false);
  });

  it('does nothing if storyId is null on addChapter', async () => {
    const { result } = renderHook(() => useChapters(null));
    await act(async () => {
      await result.current.addChapter();
    });
    expect(result.current.chapters).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});