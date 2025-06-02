import { Box, Typography, Rating, IconButton, Tooltip } from '@mui/material';
import React from 'react';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import type { Chapter } from '../types/chapter';

interface ChapterListProps {
  chapters: Chapter[];
  onRateChapter?: (chapterId: string, rating: number) => void;
}

const ChapterList: React.FC<ChapterListProps> = ({ chapters, onRateChapter }) => (
  <>
    {chapters.length === 0 && (
      <Typography>No chapters yet.</Typography>
    )}
    {chapters.map(ch => (
      <Box key={ch.id} mb={3} p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, background: '#fafbfc' }}>
        <Typography fontWeight={600}>Chapter {ch.chapter_number}</Typography>
        {/* Arc Step/Guidance */}
        {ch.structural_metadata && (
          <Box mb={1} mt={0.5} p={1} sx={{ background: '#f5f5fa', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={500} color="primary">
              Arc Step: {ch.structural_metadata.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ch.structural_metadata.description}
            </Typography>
          </Box>
        )}
        <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{ch.content}</Typography>
        <Box display="flex" alignItems="center" mt={1} gap={2}>
          <Typography variant="caption" color="text.secondary">
            {new Date(ch.created_at).toLocaleString()}
          </Typography>
          {/* Rating UI */}
          <Box display="flex" alignItems="center" ml={2}>
            <Rating
              name={`chapter-rating-${ch.id}`}
              value={typeof ch.rating === 'number' ? ch.rating : null}
              max={5}
              precision={1}
              icon={<StarIcon fontSize="inherit" />}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
              onChange={(_, value) => {
                if (onRateChapter && value !== null) {
                  onRateChapter(ch.id, value);
                }
              }}
              size="small"
            />
            <Typography variant="caption" color="text.secondary" ml={0.5}>
              {typeof ch.rating === 'number' ? ch.rating.toFixed(1) : 'Unrated'}
            </Typography>
          </Box>
        </Box>
      </Box>
    ))}
  </>
);

export default ChapterList;