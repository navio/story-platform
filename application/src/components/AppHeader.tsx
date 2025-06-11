import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import React from 'react';

import type { Story } from '../types/story';
import packageJson from '../../package.json';

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
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {selectedStory ? selectedStory.title : 'Your Stories'}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.7rem', 
            color: 'text.secondary',
            opacity: 0.6,
            fontFamily: 'monospace'
          }}
        >
          v{packageJson.version}
        </Typography>
      </Box>
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