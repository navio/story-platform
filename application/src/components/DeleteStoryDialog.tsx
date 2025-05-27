import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import React from 'react';

import type { Story } from '../types/story';

interface DeleteStoryDialogProps {
  open: boolean;
  storyToDelete: Story | null;
  loading: boolean;
  onClose: () => void;
  onDelete: (story: Story) => Promise<void>;
}

const DeleteStoryDialog: React.FC<DeleteStoryDialogProps> = ({
  open,
  storyToDelete,
  loading,
  onClose,
  onDelete,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => storyToDelete && onDelete(storyToDelete)}
          color="error"
          variant="contained"
          disabled={loading}
        >
          Erase
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteStoryDialog;