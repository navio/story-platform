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
  DialogActions,
  Slider,
  InputAdornment
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';

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

  // Story settings state (for new story)
  const [readingLevel, setReadingLevel] = useState(3); // 1-10, default 3
  const [storyLength, setStoryLength] = useState(10); // 1-50, default 10
  const [chapterLength, setChapterLength] = useState(1000); // 100-5000, default 1000
  const [structuralPrompt, setStructuralPrompt] = useState('');

  // For mid-story settings dialog
  const [showSettings, setShowSettings] = useState(false);
  const [settingsReadingLevel, setSettingsReadingLevel] = useState(3);
  const [settingsStoryLength, setSettingsStoryLength] = useState(10);
  const [settingsChapterLength, setSettingsChapterLength] = useState(1000);
  const [settingsStructuralPrompt, setSettingsStructuralPrompt] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

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

    // Validation
    if (
      readingLevel < 1 || readingLevel > 10 ||
      storyLength < 1 || storyLength > 50 ||
      chapterLength < 100 || chapterLength > 5000
    ) {
      setError('Please ensure all fields are within valid ranges.');
      return;
    }

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
          preferences: {
            reading_level: readingLevel,
            story_length: storyLength,
            chapter_length: chapterLength,
            structural_prompt: structuralPrompt,
          },
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
      setReadingLevel(3);
      setStoryLength(10);
      setChapterLength(1000);
      setStructuralPrompt('');
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
          <Box mt={2}>
            <Typography gutterBottom>Reading Level: {readingLevel === 1 ? "Kindergarten" : `${readingLevel + 4}th Grade`}</Typography>
            <Slider
              value={readingLevel}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: "K" },
                { value: 5, label: "5th" },
                { value: 10, label: "10th" }
              ]}
              onChange={(_, v) => setReadingLevel(v as number)}
              valueLabelDisplay="auto"
            />
          </Box>
          <TextField
            label="Story Length (Chapters)"
            type="number"
            value={storyLength}
            onChange={e => setStoryLength(Number(e.target.value))}
            inputProps={{ min: 1, max: 50 }}
            fullWidth
            margin="normal"
            InputProps={{
              endAdornment: <InputAdornment position="end">chapters</InputAdornment>
            }}
          />
          <TextField
            label="Chapter Length (Words)"
            type="number"
            value={chapterLength}
            onChange={e => setChapterLength(Number(e.target.value))}
            inputProps={{ min: 100, max: 5000 }}
            fullWidth
            margin="normal"
            InputProps={{
              endAdornment: <InputAdornment position="end">words</InputAdornment>
            }}
          />
          <TextField
            label="Structural Prompt (optional)"
            value={structuralPrompt}
            onChange={e => setStructuralPrompt(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
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
    // Prepare settings state when opening settings dialog
    const openSettingsDialog = () => {
      const prefs = selectedStory.preferences || {};
      setSettingsReadingLevel(prefs.reading_level ?? 3);
      setSettingsStoryLength(prefs.story_length ?? 10);
      setSettingsChapterLength(prefs.chapter_length ?? 1000);
      setSettingsStructuralPrompt(prefs.structural_prompt ?? '');
      setSettingsError(null);
      setShowSettings(true);
    };

    // Handler for updating story settings
    const handleUpdateSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSettingsError(null);

      if (
        settingsReadingLevel < 1 || settingsReadingLevel > 10 ||
        settingsStoryLength < 1 || settingsStoryLength > 50 ||
        settingsChapterLength < 100 || settingsChapterLength > 5000
      ) {
        setSettingsError('Please ensure all fields are within valid ranges.');
        return;
      }

      setSettingsLoading(true);
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
            story_id: selectedStory.id,
            preferences: {
              reading_level: settingsReadingLevel,
              story_length: settingsStoryLength,
              chapter_length: settingsChapterLength,
              structural_prompt: settingsStructuralPrompt,
            },
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update settings');
        // Update local state
        setSelectedStory({
          ...selectedStory,
          preferences: {
            reading_level: settingsReadingLevel,
            story_length: settingsStoryLength,
            chapter_length: settingsChapterLength,
            structural_prompt: settingsStructuralPrompt,
          }
        });
        setStories(stories.map(s =>
          s.id === selectedStory.id
            ? { ...s, preferences: {
                reading_level: settingsReadingLevel,
                story_length: settingsStoryLength,
                chapter_length: settingsChapterLength,
                structural_prompt: settingsStructuralPrompt,
              } }
            : s
        ));
        setShowSettings(false);
      } catch (err: any) {
        setSettingsError(err.message);
      }
      setSettingsLoading(false);
    };

    // Settings dialog for mid-story editing
    const StorySettingsDialog = (
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Story Settings</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleUpdateSettings} sx={{ mt: 1 }}>
            <Box mt={2}>
              <Typography gutterBottom>Reading Level: {settingsReadingLevel === 1 ? "Kindergarten" : `${settingsReadingLevel + 4}th Grade`}</Typography>
              <Slider
                value={settingsReadingLevel}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: "K" },
                  { value: 5, label: "5th" },
                  { value: 10, label: "10th" }
                ]}
                onChange={(_, v) => setSettingsReadingLevel(v as number)}
                valueLabelDisplay="auto"
              />
            </Box>
            <TextField
              label="Story Length (Chapters)"
              type="number"
              value={settingsStoryLength}
              onChange={e => setSettingsStoryLength(Number(e.target.value))}
              inputProps={{ min: 1, max: 50 }}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: <InputAdornment position="end">chapters</InputAdornment>
              }}
            />
            <TextField
              label="Chapter Length (Words)"
              type="number"
              value={settingsChapterLength}
              onChange={e => setSettingsChapterLength(Number(e.target.value))}
              inputProps={{ min: 100, max: 5000 }}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: <InputAdornment position="end">words</InputAdornment>
              }}
            />
            <TextField
              label="Structural Prompt (optional)"
              value={settingsStructuralPrompt}
              onChange={e => setSettingsStructuralPrompt(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
            {settingsError && (
              <Typography color="error" mt={1}>
                {settingsError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleUpdateSettings}
            variant="contained"
            color="primary"
            disabled={settingsLoading}
            endIcon={settingsLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    );

    return (
      <Box>
        {AppHeader}
        {isMobile && StoriesDrawer}
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Button
                onClick={() => setSelectedStory(null)}
                startIcon={<MenuIcon />}
                color="secondary"
                variant="outlined"
              >
                Back to Stories
              </Button>
              <Button
                onClick={openSettingsDialog}
                startIcon={<SettingsIcon />}
                color="primary"
                variant="contained"
              >
                Story Settings
              </Button>
            </Box>
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
        {StorySettingsDialog}
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