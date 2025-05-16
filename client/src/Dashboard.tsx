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
            <Box component="form" onSubmit={handleAddChapter} mt={3}>
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
                  onClick={() => setSelectedStory(story)}
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
                  }}
                >
                  <ListItemText
                    primary={story.title}
                    secondary={`${story.status} • ${new Date(story.updated_at).toLocaleString()}`}
                  />
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
    </Box>
  );
}