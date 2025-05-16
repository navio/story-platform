import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

type Story = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  preferences?: any;
};

type Chapter = {
  id: string;
  chapter_number: number;
  content: string;
  created_at: string;
  prompt?: string;
};

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE;

export default function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewStory, setShowNewStory] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [addingChapter, setAddingChapter] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  // Fetch stories for the current user
  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) setError(error.message);
      else setStories(data || []);
      setLoading(false);
    };
    fetchStories();
  }, []);

  // Fetch chapters for selected story
  useEffect(() => {
    if (!selectedStory) return;
    const fetchChapters = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', selectedStory.id)
        .order('chapter_number', { ascending: true });
      if (error) setError(error.message);
      else setChapters(data || []);
      setLoading(false);
    };
    fetchChapters();
  }, [selectedStory]);

  // Create a new story via Edge Function
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${EDGE_BASE}/start_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          initial_prompt: initialPrompt,
          preferences: {},
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create story');
      // Refetch stories and select the new one
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', result.story_id)
        .single();
      if (error) throw new Error(error.message);
      setStories([data, ...stories]);
      setSelectedStory(data);
      setChapters([result.chapter]);
      setShowNewStory(false);
      setNewTitle('');
      setInitialPrompt('');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Add a new chapter via Edge Function
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) return;
    setAddingChapter(true);
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
          story_id: selectedStory.id,
          prompt: newPrompt,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add chapter');
      setChapters([...chapters, result.chapter]);
      setNewPrompt('');
    } catch (err: any) {
      setError(err.message);
    }
    setAddingChapter(false);
  };

  if (loading) return <div>Loading...</div>;

  if (selectedStory) {
    return (
      <div className="paper-container">
        <button onClick={() => setSelectedStory(null)} style={{ marginBottom: 16 }}>← Back to Stories</button>
        <h2>{selectedStory.title}</h2>
        <div style={{ margin: '1rem 0', minHeight: 200 }}>
          {chapters.length === 0 && <p>No chapters yet.</p>}
          {chapters.map(ch => (
            <div key={ch.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>Chapter {ch.chapter_number}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{ch.content}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{new Date(ch.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddChapter} style={{ marginTop: 24 }}>
          <textarea
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            placeholder="Write the next part or prompt the agent..."
            rows={3}
            style={{ width: '100%', borderRadius: 4, border: '1px solid #ddd', padding: 8, marginBottom: 8 }}
            required
          />
          <button type="submit" disabled={addingChapter || !newPrompt} style={{ width: '100%', padding: 12, borderRadius: 4, background: '#222', color: '#fff', fontWeight: 600 }}>
            {addingChapter ? 'Adding...' : 'Add Chapter'}
          </button>
        </form>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div className="paper-container">
      <h1 style={{ textAlign: 'center' }}>Your Stories</h1>
      <button
        onClick={() => setShowNewStory(true)}
        style={{
          marginBottom: 16,
          width: '100%',
          maxWidth: 500,
          padding: 12,
          borderRadius: 4,
          background: '#222',
          color: '#fff',
          fontWeight: 600,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      >
        + New Story
      </button>
      {showNewStory && (
        <form
          onSubmit={handleCreateStory}
          style={{
            marginBottom: 24,
            width: '100%',
            maxWidth: 500,
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Story Title"
            required
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', marginBottom: 8 }}
          />
          <textarea
            value={initialPrompt}
            onChange={e => setInitialPrompt(e.target.value)}
            placeholder="Initial prompt for the story"
            rows={3}
            required
            style={{ width: '100%', borderRadius: 4, border: '1px solid #ddd', padding: 8, marginBottom: 8 }}
          />
          <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 4, background: '#0070f3', color: '#fff', fontWeight: 600 }}>
            Create Story
          </button>
        </form>
      )}
      {stories.length === 0 && <p>No stories yet. Start your first one!</p>}
      <ul className="centered-list" style={{ listStyle: 'none' }}>
        {stories.map(story => (
          <li key={story.id} style={{ marginBottom: 16, border: '1px solid #eee', borderRadius: 4, padding: 12, cursor: 'pointer' }} onClick={() => setSelectedStory(story)}>
            <div style={{ fontWeight: 600 }}>{story.title}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{story.status} • {new Date(story.updated_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
      <button
        onClick={onSignOut}
        style={{
          marginTop: 32,
          width: '100%',
          maxWidth: 500,
          padding: 12,
          borderRadius: 4,
          background: '#e00',
          color: '#fff',
          fontWeight: 600,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      >
        Sign Out
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
}