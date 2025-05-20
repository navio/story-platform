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
  story_length?: number;
  reading_level?: number;
  chapter_length?: string;
  structural_prompt?: string;
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
  const [chapterLength, setChapterLength] = useState("A full paragraph"); // qualitative, default "A full paragraph"
  const [structuralPrompt, setStructuralPrompt] = useState('');

// For story settings modal in story mode
const [showStorySettings, setShowStorySettings] = useState(false);
const [editReadingLevel, setEditReadingLevel] = useState<number>(selectedStory?.reading_level ?? 3);
const [editStoryLength, setEditStoryLength] = useState<number>(typeof selectedStory?.story_length === "number" ? selectedStory.story_length : 10);
const [editChapterLength, setEditChapterLength] = useState<string>(selectedStory?.chapter_length ?? "A full paragraph");
const [editStructuralPrompt, setEditStructuralPrompt] = useState<string>(selectedStory?.structural_prompt ?? "");
const [editSettingsError, setEditSettingsError] = useState<string | null>(null);
const [editSettingsLoading, setEditSettingsLoading] = useState(false);
  // For mid-story settings dialog
  // Removed unused showSettings, setShowSettings, settingsReadingLevel, setSettingsReadingLevel

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
      ![
        "A sentence",
        "A few sentences",
        "A small paragraph",
        "A full paragraph",
        "A few paragraphs"
      ].includes(chapterLength)
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
          reading_level: readingLevel,
          story_length: storyLength,
          chapter_length: chapterLength,
          structural_prompt: structuralPrompt,
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
        .eq('id', result.story?.id)
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
      setChapterLength("A full paragraph");
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
            select
            label="Chapter Length"
            value={chapterLength}
            onChange={e => setChapterLength(e.target.value)}
            fullWidth
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="A sentence">A sentence</option>
            <option value="A few sentences">A few sentences</option>
            <option value="A small paragraph">A small paragraph</option>
            <option value="A full paragraph">A full paragraph</option>
            <option value="A few paragraphs">A few paragraphs</option>
          </TextField>
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
    // Removed unused openSettingsDialog

    // Handler for updating story settings
    // Removed unused handleUpdateSettings

    // Settings dialog for mid-story editing
    // Removed unused StorySettingsDialog
    // Close all open tags for Box, Container, Paper, and Box in the story view
  }
// End of story view block

// Main dashboard view
if (selectedStory) {
  // Story view
  return (
    <Box>
      {AppHeader}
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
              onClick={() => setShowStorySettings(true)}
              startIcon={<SettingsIcon />}
              color="primary"
              variant="contained"
            >
              Story Settings
            </Button>
          </Box>
          <Typography variant="h5" fontWeight={700} mb={2}>
            {selectedStory?.title}
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
            {!(selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length)) && (
              <>
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
                  disabled={Boolean(addingChapter)}
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
                    fullWidth
                    disabled={Boolean(selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length))}
                  />
                </Box>
              </>
            )}
            {selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length) && (
              <Typography variant="h5" color="success.main" fontWeight={700} mt={4} textAlign="center">
                The End
              </Typography>
            )}
          </Box>
          {error && (
            <Typography color="error" mt={2}>
              {error}
            </Typography>
          )}
        </Paper>
      </Container>
      {/* Story Settings Modal */}
      <Dialog open={showStorySettings} onClose={() => setShowStorySettings(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Story Settings</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <Box mt={2}>
              <Typography gutterBottom>Reading Level: {editReadingLevel === 1 ? "Kindergarten" : `${editReadingLevel + 4}th Grade`}</Typography>
              <Slider
                value={editReadingLevel}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: "K" },
                  { value: 5, label: "5th" },
                  { value: 10, label: "10th" }
                ]}
                onChange={(_, v) => setEditReadingLevel(v as number)}
                valueLabelDisplay="auto"
              />
            </Box>
            <TextField
              label="Story Length (Chapters)"
              type="number"
              value={editStoryLength}
              onChange={e => setEditStoryLength(Number(e.target.value))}
              inputProps={{ min: 1, max: 50 }}
              fullWidth
              margin="normal"
            />
            <TextField
              select
              label="Chapter Length"
              value={editChapterLength}
              onChange={e => setEditChapterLength(e.target.value)}
              fullWidth
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="A sentence">A sentence</option>
              <option value="A few sentences">A few sentences</option>
              <option value="A small paragraph">A small paragraph</option>
              <option value="A full paragraph">A full paragraph</option>
              <option value="A few paragraphs">A few paragraphs</option>
            </TextField>
            <TextField
              label="Structural Prompt (optional)"
              value={editStructuralPrompt}
              onChange={e => setEditStructuralPrompt(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
            {editSettingsError && (
              <Typography color="error" mt={1}>
                {editSettingsError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStorySettings(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setEditSettingsError(null);
              if (
                editReadingLevel < 1 || editReadingLevel > 10 ||
                Number(editStoryLength) < 1 || Number(editStoryLength) > 50 ||
                ![
                  "A sentence",
                  "A few sentences",
                  "A small paragraph",
                  "A full paragraph",
                  "A few paragraphs"
                ].includes(editChapterLength)
              ) {
                setEditSettingsError('Please ensure all fields are within valid ranges.');
                return;
              }
              setEditSettingsLoading(true);
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
                    reading_level: editReadingLevel,
                    story_length: editStoryLength,
                    chapter_length: editChapterLength,
                    structural_prompt: editStructuralPrompt,
                  }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Failed to update settings');
                setSelectedStory({
                  ...selectedStory,
                  ...selectedStory,
                  reading_level: editReadingLevel,
                  story_length: editStoryLength,
                  chapter_length: editChapterLength,
                  structural_prompt: editStructuralPrompt,
                });
                setShowStorySettings(false);
              } catch (err: any) {
                setEditSettingsError(err.message);
              }
              setEditSettingsLoading(false);
            }}
            variant="contained"
            color="primary"
            disabled={editSettingsLoading}
            endIcon={editSettingsLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
      {/* End Story Settings Modal */}
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
    {/* StorySettingsDialog is only available in story view */}
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
          {/* Duplicate/stray Paper block removed to fix tag mismatch */}
            {/* All content in Paper must be wrapped in a single parent element */}
            <React.Fragment>
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
                onClick={() => {}}
                startIcon={<SettingsIcon />}
                color="primary"
                variant="contained"
              >
                Story Settings
              </Button>
            </Box>
            <Typography variant="h5" fontWeight={700} mb={2}>
              {selectedStory?.title}
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
            {/* Duplicate/stray Box block removed to fix tag mismatch */}
              {/* ...rest of the Paper content... */}
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
                disabled={
                  Boolean(
                    addingChapter ||
                    (selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length))
                  )
                }
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
              <Box component="form"
                onSubmit={handleAddChapter}
                flex={1}
              >
                <TextField
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  placeholder="Write the next part or prompt the agent..."
                  label="Next prompt"
                  fullWidth
                  disabled={
                    Boolean(selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length))
                  }
                />
              </Box>
              {selectedStory?.story_length && chapters.length >= Number(selectedStory?.story_length) && (
                <Typography variant="h5" color="success.main" fontWeight={700} mt={4} textAlign="center">
                  The End
                </Typography>
              )}
            </React.Fragment>
            {/* End of Paper content */}
                {/* The following TextField and Button are now redundant and should be removed to fix tag mismatch */}
{/* End of file */}

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
      {/* StorySettingsDialog is only available in story view */}
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