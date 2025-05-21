import React from 'react';
import { Drawer, Box, Typography, Divider, List, ListItem, ListItemText } from '@mui/material';
import type { Story } from '../types/story';

interface StoriesDrawerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  stories: Story[];
  selectedStory: Story | null;
  setSelectedStory: (story: Story) => void;
}

const StoriesDrawer: React.FC<StoriesDrawerProps> = ({
  drawerOpen,
  setDrawerOpen,
  stories,
  selectedStory,
  setSelectedStory,
}) => (
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

export default StoriesDrawer;