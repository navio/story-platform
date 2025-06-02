import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

import { useChapters } from '../useChapters';
import { supabase } from '../../supabaseClient';
const mockedSupabase = vi.mocked(supabase, true);

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
const mockChapter = {
  id: 'chapter-1',
  story_id: 'story-1',
  chapter_number: 1,
  content: 'Once upon a time...',
  structural_metadata: { title: 'Linear', description: 'A linear story structure.' },
  rating: 5,
  created_at: new Date().toISOString(),
};
// Proxy to mock the full chain for from().select().eq().order().single()
const chainHandler = {
  get: function (target: any, prop: string) {
    // Terminal methods return a resolved value
    if (['order', 'single'].includes(prop)) {
      return vi.fn();
    }
    // All other methods return the proxy itself for chaining
    return function () { return proxy; };
  }
};
const proxy = new Proxy({}, chainHandler);

describe('useChapters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedSupabase.from.mockReturnValue(proxy as any);
  });

  it('fetches chapters for a story', async () => {
    // Mock the supabase chain to return [mockChapter]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockChapter], error: null }),
    };
    mockedSupabase.from.mockReturnValue(chain as any);

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await result.current.fetchChapters();
    });

    expect(result.current.chapters).toEqual([mockChapter]);
    expect(result.current.chapters[0].structural_metadata).toEqual({ title: 'Linear', description: 'A linear story structure.' });
    expect(result.current.chapters[0].rating).toBe(5);
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
    // Mock the supabase chain to return an error object
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: undefined, error: { message: 'DB error' } }),
    };
    mockedSupabase.from.mockReturnValue(chain as any);

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await result.current.fetchChapters();
    });

    expect(result.current.error).toBe('DB error');
    expect(result.current.chapters).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('adds a chapter successfully', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh-123',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-1',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          }
        }
      },
      error: null
    });
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
    // Mock getSession to return no session
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Not authenticated'),
    });

    const { result } = renderHook(() => useChapters('story-1'));
    await act(async () => {
      await expect(result.current.addChapter()).rejects.toThrow('Not authenticated');
    });

    expect(result.current.error).toBe('Not authenticated');
    expect(result.current.loading).toBe(false);
  });

  it('handles error from fetch on addChapter', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh-123',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-1',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          }
        }
      },
      error: null
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
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
// --- Additional tests for arc-guided metadata and rating update ---

it('adds a chapter with correct structural_metadata from arc', async () => {
  mockedSupabase.auth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-1',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        }
      }
    },
    error: null
  });
  const arcStep = { title: 'Call to Adventure', description: 'The hero receives an invitation to begin a quest.' };
  const chapterWithArc = { ...mockChapter, structural_metadata: arcStep };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ chapter: chapterWithArc }),
  });

  const { result } = renderHook(() => useChapters('story-1'));
  await act(async () => {
    result.current.setNewPrompt('Prompt!');
    await result.current.addChapter();
  });

  expect(result.current.chapters[0].structural_metadata).toEqual(arcStep);
});

it('updates chapter rating via API', async () => {
  mockedSupabase.auth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-1',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        }
      }
    },
    error: null
  });
  // Simulate a successful rating update API call
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, chapter_id: mockChapter.id, rating: 4 }),
  });

  // Simulate a local update after rating
  const { result } = renderHook(() => useChapters('story-1'));
  // Add a chapter first
  // Use setChapters to set initial state
  await act(async () => {
    result.current.setChapters([mockChapter]);
  });
  await act(async () => {
    if (typeof result.current.rateChapter === 'function') {
      await result.current.rateChapter(mockChapter.id, 4);
    }
  });
  // Wait for state update
  await act(async () => {});
  expect(global.fetch).toHaveBeenCalled();
  expect(result.current.chapters[0].rating).toBe(4);
});
});