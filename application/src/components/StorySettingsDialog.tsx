import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Slider,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import React from 'react';

interface StorySettingsDialogProps {
  open: boolean;
  onClose: () => void;
  editReadingLevel: number;
  setEditReadingLevel: (level: number) => void;
  editStoryLength: number;
  setEditStoryLength: (length: number) => void;
  editChapterLength: string;
  setEditChapterLength: (length: string) => void;
  editStructuralPrompt: string;
  setEditStructuralPrompt: (prompt: string) => void;
  editSettingsError: string | null;
  editSettingsLoading: boolean;
  onSave: () => Promise<void>;
}

const StorySettingsDialog: React.FC<StorySettingsDialogProps> = ({
  open,
  onClose,
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
  onSave,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Edit Story Settings</DialogTitle>
    <DialogContent>
      <Box component="form" sx={{ mt: 1 }}>
        <Box mt={2}>
          <Typography gutterBottom>
            Reading Level: {editReadingLevel === 0 ? "Kindergarten" : `${editReadingLevel} Grade`}
          </Typography>
          <Slider
            value={editReadingLevel}
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
      <Button onClick={onClose} color="secondary">
        Cancel
      </Button>
      <Button
        onClick={onSave}
        variant="contained"
        color="primary"
        disabled={editSettingsLoading}
        endIcon={editSettingsLoading ? <CircularProgress size={18} color="inherit" /> : null}
      >
        Save Settings
      </Button>
    </DialogActions>
  </Dialog>
);

export default StorySettingsDialog;