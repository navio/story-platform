import { renderHook, act } from '@testing-library/react';
import { useStories } from '../useStories';
import { AuthError } from '@supabase/supabase-js';
import { vi } from 'vitest';

// Mock supabase client
vi.mock('../../supabaseClient', () => {
  // Create deep mocks for all used methods
  const mockGetUser = vi.fn();
  const mockGetSession = vi.fn();
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();

  return {
    supabase: {
      auth: {
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
      from: vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        single: mockSingle,
        delete: mockDelete,
      })),
    },
  };
});

import { supabase } from '../../supabaseClient';
const mockedSupabase = vi.mocked(supabase, true);

const mockUser = {
  id: 'user-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockAuthError = new AuthError('Not authenticated');
const mockSession = {
  access_token: 'token-123',
  refresh_token: 'refresh-123',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};
const mockStory = { id: 'story-1', title: 'Test Story' };

describe('useStories', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for getUser and getSession to avoid undefined destructure
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    // Default mock for from().select().eq().order().single() chain using Proxy
    const chainHandler = {
      get: function (target: any, prop: string) {
        // Terminal methods return a resolved value
        if (['order', 'single'].includes(prop)) {
          return vi.fn().mockResolvedValue({ data: [], error: null });
        }
        // All other methods return the proxy itself for chaining
        return function () { return proxy; };
      }
    };
    const proxy = new Proxy({}, chainHandler);
    mockedSupabase.from.mockReturnValue(proxy as any);
  });

  it('fetches stories for authenticated user', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    // Mock the full chain to return a mock object with mockResolvedValue
    // (Removed per-test custom chain mocks; use the Proxy for all tests)

    const { result } = renderHook(() => useStories());
    // Wait for useEffect to finish
    // Set up the mock chain to return the expected data for this test
    const chain = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'order') return vi.fn().mockResolvedValue({ data: [mockStory], error: null });
        return () => chain;
      }
    });
    mockedSupabase.from.mockReturnValue(chain as any);

    await act(async () => {});

    expect(result.current.stories).toEqual([mockStory]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error if not authenticated on fetch', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: mockAuthError });

    const { result } = renderHook(() => useStories());
    await act(async () => {});

    expect(result.current.error).toBe('Not authenticated');
    expect(result.current.stories).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('handles error from supabase on fetch', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    // Set up the mock chain to return the expected error for this test
    const chain = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'order') return vi.fn().mockResolvedValue({ data: undefined, error: { message: 'DB error' } });
        return () => chain;
      }
    });
    mockedSupabase.from.mockReturnValue(chain as any);
    // (Removed per-test custom chain mocks; use the Proxy for all tests)

    const { result } = renderHook(() => useStories());
    await act(async () => {});

    expect(result.current.error).toBe('DB error');
    expect(result.current.stories).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('creates a story successfully', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    // Set up the mock chain to return the expected story for this test
    const chain = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'single') return vi.fn().mockResolvedValue({ data: mockStory, error: null });
        return () => chain;
      }
    });
    mockedSupabase.from.mockReturnValue(chain as any);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ story: mockStory }),
    });
    // (Removed per-test custom chain mocks; use the Proxy for all tests)

    const { result } = renderHook(() => useStories());
    await act(async () => {});

    await act(async () => {
      const story = await result.current.createStory({
        title: 'Test Story',
        initialPrompt: 'Prompt',
        readingLevel: 1,
        storyLength: 1,
        chapterLength: 'short',
        structuralPrompt: 'Structure',
      });
      expect(story).toEqual(mockStory);
    });

    expect(result.current.stories[0]).toEqual(mockStory);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error if not authenticated on create', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: mockAuthError });

    const { result } = renderHook(() => useStories());
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.createStory({
          title: 'Test Story',
          initialPrompt: 'Prompt',
          readingLevel: 1,
          storyLength: 1,
          chapterLength: 'short',
          structuralPrompt: 'Structure',
        });
      })
    ).rejects.toThrow('Not authenticated');

    expect(result.current.loading).toBe(false);
  });

  it('handles error from fetch on create', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Edge error' }),
    });
    // Set up the mock chain to return the expected error for this test
    const chain = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'single') return vi.fn().mockResolvedValue({ data: undefined, error: { message: 'Edge error' } });
        return () => chain;
      }
    });
    mockedSupabase.from.mockReturnValue(chain as any);

    const { result } = renderHook(() => useStories());
    await act(async () => {});
    await act(async () => {
      try {
        await result.current.createStory({
          title: 'Test Story',
          initialPrompt: 'Prompt',
          readingLevel: 1,
          storyLength: 1,
          chapterLength: 'short',
          structuralPrompt: 'Structure',
        });
      } catch (e) {
        // ignore
      }
    });
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(result.current.error).toBe('Edge error');
    expect(result.current.loading).toBe(false);
  });
});