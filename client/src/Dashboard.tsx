import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Container,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // For delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

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

  // AppBar for both desktop and mobile
  const AppHeader = (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {selectedStory ? selectedStory.title : 'Your Stories'}
        </Typography>
        <IconButton color="primary" onClick={() => setShowNewStory(true)} sx={{ mr: 1 }}>
          <AddIcon />
        </IconButton>
        <IconButton color="inherit" onClick={onSignOut}>
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );

  // Drawer for mobile navigation
  const StoriesDrawer = (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      ModalProps={{ keepMounted: true }}
    >
      <Box sx={{ width: 280, pt: 2 }}>
        <Typography variant="h6" align="center" fontWeight={700} mb={2}>
          Stories
        </Typography>
        <Divider />
        <List>
          {stories.map(story => (
            <ListItem
              key={story.id}
              onClick={() => {
                setSelectedStory(story);
                setDrawerOpen(false);
              }}
              sx={{
                cursor: 'pointer',
                bgcolor: selectedStory?.id === story.id ? 'action.selected' : undefined,
              }}
            >
              <ListItemText
                primary={story.title}
                secondary={`${story.status} • ${new Date(story.updated_at).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  // Dialog for creating a new story
  const NewStoryDialog = (
    <Dialog open={showNewStory} onClose={() => setShowNewStory(false)} maxWidth="xs" fullWidth>
      <DialogTitle>New Story</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleCreateStory} sx={{ mt: 1 }}>
          <TextField
            label="Story Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            label="Initial prompt for the story"
            value={initialPrompt}
            onChange={e => setInitialPrompt(e.target.value)}
            required
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          {error && (
            <Typography color="error" mt={1}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowNewStory(false)} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleCreateStory}
          variant="contained"
          color="primary"
          disabled={loading}
          endIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          Create Story
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  // Story view
  if (selectedStory) {
    return (
      <Box>
        {AppHeader}
        {isMobile && StoriesDrawer}
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Button
              onClick={() => setSelectedStory(null)}
              sx={{ mb: 2 }}
              startIcon={<MenuIcon />}
              color="secondary"
              variant="outlined"
            >
              Back to Stories
            </Button>
            <Typography variant="h5" fontWeight={700} mb={2}>
              {selectedStory.title}
            </Typography>
            <Box minHeight={200} mb={2}>
              {addingChapter && (
                <Box textAlign="center" my={4} color="text.secondary" fontStyle="italic">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Generating next chapter...
                </Box>
              )}
              {chapters.length === 0 && !addingChapter && (
                <Typography>No chapters yet.</Typography>
              )}
              {chapters.map(ch => (
                <Box key={ch.id} mb={3}>
                  <Typography fontWeight={600}>Chapter {ch.chapter_number}</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{ch.content}</Typography>
                  <Typography variant="caption" color="text.secondary" mt={0.5}>
                    {new Date(ch.created_at).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                color="info"
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  minWidth: 160,
                  boxShadow: 3,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
                disabled={addingChapter}
                onClick={async () => {
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
                        prompt: "",
                      }),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error || 'Failed to add chapter');
                    setChapters([...chapters, result.chapter]);
                  } catch (err: any) {
                    setError(err.message);
                  }
                  setAddingChapter(false);
                }}
              >
                Continue
              </Button>
              <Box component="form" onSubmit={handleAddChapter} flex={1}>
                <TextField
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  placeholder="Write the next part or prompt the agent..."
                  label="Next prompt"
                  multiline
                  rows={3}
                  fullWidth
                  required
                  margin="normal"
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={addingChapter || !newPrompt}
                  sx={{ py: 1.5, fontWeight: 600, mt: 1 }}
                  endIcon={addingChapter ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {addingChapter ? 'Adding...' : 'Add Chapter'}
                </Button>
              </Box>
            </Box>
            {error && (
              <Typography color="error" mt={2}>
                {error}
              </Typography>
            )}
          </Paper>
        </Container>
        {NewStoryDialog}
      </Box>
    );
  }

  // Main dashboard view
  return (
    <Box>
      {AppHeader}
      {isMobile && StoriesDrawer}
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          mt: 0,
          px: 0,
          width: '100vw',
          minHeight: isMobile ? '100vh' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isMobile ? 'flex-start' : 'center',
          overflow: 'hidden',
          bgcolor: isMobile ? '#faf9f6' : 'transparent',
        }}
      >
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={4}
          alignItems={isMobile ? 'flex-start' : 'center'}
          justifyContent="center"
          sx={{
            width: '100%',
            minHeight: isMobile ? '100vh' : 'auto',
            maxWidth: isMobile ? '100vw' : 900,
            mx: 'auto',
            py: isMobile ? 0 : 6,
            px: isMobile ? 0 : 2,
            boxSizing: 'border-box',
          }}
        >
          {/* Stories List */}
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              minWidth: isMobile ? '100vw' : 350,
              maxWidth: isMobile ? '100vw' : 400,
              width: isMobile ? '100vw' : '100%',
              flex: '0 0 auto',
              mb: isMobile ? 3 : 0,
              boxSizing: 'border-box',
              minHeight: isMobile ? 'calc(100vh - 56px)' : 'auto', // 56px = AppBar height
              overflowY: isMobile ? 'auto' : 'visible',
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={2} align="center">
              Stories
            </Typography>
            <List>
              {stories.map(story => (
                <ListItem
                  key={story.id}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border:
                      selectedStory && (selectedStory as any).id === story.id
                        ? '2px solid #1976d2'
                        : '1px solid #eee',
                    cursor: 'pointer',
                    bgcolor:
                      selectedStory && (selectedStory as any).id === story.id
                        ? 'action.selected'
                        : undefined,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    flex={1}
                    onClick={() => setSelectedStory(story)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText
                      primary={story.title}
                      secondary={`${story.status} • ${new Date(story.updated_at).toLocaleString()}`}
                    />
                  </Box>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    color="error"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setLoading(true);
                      setError(null);
                      // Delete chapters first (to avoid FK constraint), then story
                      const { error: chaptersError } = await supabase
                        .from('chapters')
                        .delete()
                        .eq('story_id', story.id);
                      const { error: storyError } = await supabase
                        .from('stories')
                        .delete()
                        .eq('id', story.id);
                      if (chaptersError || storyError) {
                        setError(
                          chaptersError?.message ||
                          storyError?.message ||
                          'Failed to delete story'
                        );
                      } else {
                        setStories((prev) => prev.filter((s) => (s as Story).id !== story.id));
                        if ((selectedStory as Story | null)?.id === story.id) setSelectedStory(null);
                      }
                      setLoading(false);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <span role="img" aria-label="Delete">❌</span>
                  </IconButton>
                </ListItem>
              ))}
            </List>
            <Button
              onClick={() => setShowNewStory(true)}
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AddIcon />}
              sx={{ mt: 2, fontWeight: 600 }}
            >
              New Story
            </Button>
            <Button
              onClick={onSignOut}
              variant="outlined"
              color="secondary"
              fullWidth
              startIcon={<LogoutIcon />}
              sx={{ mt: 2, fontWeight: 600 }}
            >
              Sign Out
            </Button>
            {error && (
              <Typography color="error" mt={2}>
                {error}
              </Typography>
            )}
          </Paper>
          {/* Main Content (empty for now, could add welcome/info) */}
          {!isMobile && (
            <Box flex={1} />
          )}
        </Stack>
      </Container>
      {NewStoryDialog}
{/* Delete Confirmation Dialog */}
  <Dialog
    open={deleteDialogOpen}
    onClose={() => setDeleteDialogOpen(false)}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle>Confirm Delete</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to erase the story{' '}
        <b>{storyToDelete?.title}</b>? This will permanently remove the story and all its chapters.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setDeleteDialogOpen(false)} color="secondary">
        Cancel
      </Button>
      <Button
        onClick={async () => {
          if (!storyToDelete) return;
          setLoading(true);
          setError(null);
          setDeleteDialogOpen(false);
          // Delete chapters first (to avoid FK constraint), then story
          const { error: chaptersError } = await supabase
            .from('chapters')
            .delete()
            .eq('story_id', storyToDelete.id);
          const { error: storyError } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyToDelete.id);
          if (chaptersError || storyError) {
            setError(
              chaptersError?.message ||
              storyError?.message ||
              'Failed to delete story'
            );
          } else {
            setStories((prev) => prev.filter((s) => (s as Story).id !== storyToDelete.id));
            if ((selectedStory as Story | null)?.id === storyToDelete.id) setSelectedStory(null);
          }
          setLoading(false);
          setStoryToDelete(null);
        }}
        color="error"
        variant="contained"
      >
        Erase
      </Button>
    </DialogActions>
  </Dialog>
    </Box>
  );
}