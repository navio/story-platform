import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  TextField,
  Slider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import type { Story } from '../types/story';
import type { Chapter } from '../types/chapter';
import ChapterList from './ChapterList';
import StorySettingsDialog from './StorySettingsDialog';

interface StoryViewProps {
  selectedStory: Story;
  chapters: Chapter[];
  addingChapter: boolean;
  newPrompt: string;
  setNewPrompt: (prompt: string) => void;
  handleAddChapter: (e: React.FormEvent) => void;
  setSelectedStory: (story: Story | null) => void;
  showStorySettings: boolean;
  setShowStorySettings: (show: boolean) => void;
  editReadingLevel: number;
  setEditReadingLevel: (level: number) => void;
  editStoryLength: number;
  setEditStoryLength: (length: number) => void;
  editChapterLength: string;
  setEditChapterLength: (length: string) => void;
  editStructuralPrompt: string;
  setEditStructuralPrompt: (prompt: string) => void;
  editSettingsError: string | null;
  setEditSettingsError: (err: string | null) => void;
  editSettingsLoading: boolean;
  setEditSettingsLoading: (loading: boolean) => void;
  handleUpdateSettings: () => Promise<void>;
  error: string | null;
}

const StoryView: React.FC<StoryViewProps> = ({
  selectedStory,
  chapters,
  addingChapter,
  newPrompt,
  setNewPrompt,
  handleAddChapter,
  setSelectedStory,
  showStorySettings,
  setShowStorySettings,
  editReadingLevel,
  setEditReadingLevel,
  editStoryLength,
  setEditStoryLength,
  editChapterLength,
  setEditChapterLength,
  editStructuralPrompt,
  setEditStructuralPrompt,
  editSettingsError,
  editSettingsLoading,
  handleUpdateSettings,
  error,
}) => {
  return (
    <Box>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4, md: 12 }, borderRadius: 3 }}>
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
            <ChapterList chapters={chapters} />
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
                    // This should be handled by parent, but for now, do nothing
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
     <StorySettingsDialog
       open={showStorySettings}
       onClose={() => setShowStorySettings(false)}
       editReadingLevel={editReadingLevel}
       setEditReadingLevel={setEditReadingLevel}
       editStoryLength={editStoryLength}
       setEditStoryLength={setEditStoryLength}
       editChapterLength={editChapterLength}
       setEditChapterLength={setEditChapterLength}
       editStructuralPrompt={editStructuralPrompt}
       setEditStructuralPrompt={setEditStructuralPrompt}
       editSettingsError={editSettingsError}
       editSettingsLoading={editSettingsLoading}
       onSave={handleUpdateSettings}
     />
    </Box>
  );
};

export default StoryView;