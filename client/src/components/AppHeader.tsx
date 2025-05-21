import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Story } from '../types/story';

interface AppHeaderProps {
  isMobile: boolean;
  selectedStory: Story | null;
  onSignOut: () => void;
  setDrawerOpen: (open: boolean) => void;
  setShowNewStory: (open: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  isMobile,
  selectedStory,
  onSignOut,
  setDrawerOpen,
  setShowNewStory,
}) => (
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

export default AppHeader;