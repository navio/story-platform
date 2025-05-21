import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Story } from '../types/story';

interface StoryListProps {
  stories: Story[];
  selectedStory: Story | null;
  setSelectedStory: (story: Story | null) => void;
  onSignOut: () => void;
  setShowNewStory: (show: boolean) => void;
  onDelete: (story: Story) => void;
  error: string | null;
}

const StoryList: React.FC<StoryListProps> = ({
  stories,
  selectedStory,
  setSelectedStory,
  onSignOut,
  setShowNewStory,
  onDelete,
  error,
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        minWidth: { xs: '100vw', md: 350 },
        maxWidth: '100vw',
        width: '100%',
        flex: '0 0 auto',
        mb: { xs: 3, md: 0 },
        boxSizing: 'border-box',
        minHeight: { xs: 'calc(100vh - 56px)', md: 'auto' },
        overflowY: { xs: 'auto', md: 'visible' },
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
                selectedStory && selectedStory.id === story.id
                  ? '2px solid #1976d2'
                  : '1px solid #eee',
              cursor: 'pointer',
              bgcolor:
                selectedStory && selectedStory.id === story.id
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
              onClick={e => {
                e.stopPropagation();
                if (onDelete) onDelete(story);
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
  );
};

export default StoryList;