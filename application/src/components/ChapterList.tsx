import { Box, Typography } from '@mui/material';
import React from 'react';

import type { Chapter } from '../types/chapter';

interface ChapterListProps {
  chapters: Chapter[];
}

const ChapterList: React.FC<ChapterListProps> = ({ chapters }) => (
  <>
    {chapters.length === 0 && (
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
  </>
);

export default ChapterList;