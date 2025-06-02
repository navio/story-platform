import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Typography,
  Slider,
  Button,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import React from 'react';

import type { Story } from '../types/story';

interface NewStoryDialogProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  newTitle: string;
  setNewTitle: (title: string) => void;
  initialPrompt: string;
  setInitialPrompt: (prompt: string) => void;
  readingLevel: number;
  setReadingLevel: (level: number) => void;
  storyLength: number;
  setStoryLength: (length: number) => void;
  chapterLength: string;
  setChapterLength: (length: string) => void;
  structuralPrompt: string;
  setStructuralPrompt: (prompt: string) => void;
  onClose: () => void;
  onCreate: (e: React.FormEvent) => void;
  createdStory?: Story | null;
  onViewStory?: () => void;
}

const chapterLengthOptions = [
  "A sentence",
  "A few sentences",
  "A small paragraph",
  "A full paragraph",
  "A few paragraphs"
];

const NewStoryDialog: React.FC<NewStoryDialogProps> = ({
  open,
  loading,
  error,
  newTitle,
  setNewTitle,
  initialPrompt,
  setInitialPrompt,
  readingLevel,
  setReadingLevel,
  storyLength,
  setStoryLength,
  chapterLength,
  setChapterLength,
  structuralPrompt,
  setStructuralPrompt,
  onClose,
  onCreate,
  createdStory,
  onViewStory
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Story</DialogTitle>
      <DialogContent>
        {createdStory && createdStory.story_arc && createdStory.story_arc.steps && createdStory.story_arc.steps.length > 0 ? (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Story Arc / Outline
            </Typography>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {createdStory.story_arc.steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <Typography variant="body1" fontWeight={500}>{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{step.description}</Typography>
                </li>
              ))}
            </ol>
            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                onClick={onViewStory}
              >
                View Story
              </Button>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={onCreate} sx={{ mt: 1 }}>
            <TextField
              label="Story Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
              fullWidth
              margin="normal"
            />
            <TextField
              label="Story Guidance / Metadata"
              value={initialPrompt}
              onChange={e => setInitialPrompt(e.target.value)}
              required
              fullWidth
              margin="normal"
              multiline
              rows={3}
              helperText="Describe the story concept, themes, or any guidance for the story. This will not appear as the first line of the story."
            />
            <Box mt={2}>
              <Typography gutterBottom>
                Reading Level: {readingLevel === 0 ? "Kindergarten" : `${readingLevel} Grade`}
              </Typography>
              <Slider
                value={readingLevel}
                min={0}
                max={10}
                step={1}
                marks={[
                  { value: 0, label: "K" },
                  { value: 1, label: "1st" },
                  { value: 2, label: "2nd" },
                  { value: 3, label: "3rd" },
                  { value: 4, label: "4th" },
                  { value: 5, label: "5th" },
                  { value: 6, label: "6th" },
                  { value: 7, label: "7th" },
                  { value: 8, label: "8th" },
                  { value: 9, label: "9th" },
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
              {chapterLengthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
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
        )}
      </DialogContent>
      {!createdStory && (
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            variant="contained"
            color="primary"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Create Story
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default NewStoryDialog;