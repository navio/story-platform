import {
  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Container,
  Stack
} from '@mui/material';
import React, { useState } from 'react';

import AppHeader from './components/AppHeader';
import DeleteStoryDialog from './components/DeleteStoryDialog';
import NewStoryDialog from './components/NewStoryDialog';
import StoriesDrawer from './components/StoriesDrawer';
import StoryList from './components/StoryList';
import StoryView from './components/StoryView';
import { useChapters } from './hooks/useChapters';
import { useStories } from './hooks/useStories';
import { supabase } from './supabaseClient';
import type { Continuation } from './types/chapter';
import type { Story } from './types/story';

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE;

export default function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const {
    stories,
    loading,
    error,
    createStory,
    deleteStory,
    setError,
  } = useStories();

  const [showNewStory, setShowNewStory] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [createdStory, setCreatedStory] = useState<Story | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- Chapter logic extracted to hook ---
  const {
    chapters,
    continuations,
    loading: chaptersLoading,
    error: chaptersError,
    newPrompt,
    setNewPrompt,
    fetchChapters,
    addChapter,
    fetchingContinuations,
    rateChapter,
  } = useChapters(selectedStory?.id ?? null);

  // Story settings state (for new story)
  const [readingLevel, setReadingLevel] = useState(3);
  const [storyLength, setStoryLength] = useState(10);
  const [chapterLength, setChapterLength] = useState("A full paragraph");
  const [structuralPrompt, setStructuralPrompt] = useState('');

  // For story settings modal in story mode
  const [showStorySettings, setShowStorySettings] = useState(false);
  const [editReadingLevel, setEditReadingLevel] = useState<number>(selectedStory?.reading_level ?? 3);
  const [editStoryLength, setEditStoryLength] = useState<number>(typeof selectedStory?.story_length === "number" ? selectedStory.story_length : 10);
  const [editChapterLength, setEditChapterLength] = useState<string>(selectedStory?.chapter_length ?? "A full paragraph");
  const [editStructuralPrompt, setEditStructuralPrompt] = useState<string>(selectedStory?.structural_prompt ?? "");
  const [editSettingsError, setEditSettingsError] = useState<string | null>(null);
  const [editSettingsLoading, setEditSettingsLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // For delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

  // Fetch chapters when selectedStory changes
  React.useEffect(() => {
    if (selectedStory?.id) {
      fetchChapters();
    }
    // Optionally clear chapters when no story is selected
    // else setChapters([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory?.id]);

  // AppHeader and StoriesDrawer are now imported components.

  // Dialog for creating a new story
  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (selectedStory) {
    return (
      <StoryView
        selectedStory={selectedStory}
        chapters={chapters}
        addingChapter={chaptersLoading}
        newPrompt={newPrompt}
        setNewPrompt={setNewPrompt}
        handleAddChapter={(e: React.FormEvent) => {
          e.preventDefault();
          addChapter();
        }}
        continuations={continuations}
        handleSelectContinuation={(continuation: Continuation) => {
          setNewPrompt(continuation.description);
          addChapter();
        }}
        setSelectedStory={setSelectedStory}
        showStorySettings={showStorySettings}
        setShowStorySettings={setShowStorySettings}
        editReadingLevel={editReadingLevel}
        setEditReadingLevel={setEditReadingLevel}
        editStoryLength={editStoryLength}
        setEditStoryLength={setEditStoryLength}
        onRateChapter={rateChapter}
        editChapterLength={editChapterLength}
        setEditChapterLength={setEditChapterLength}
        editStructuralPrompt={editStructuralPrompt}
        setEditStructuralPrompt={setEditStructuralPrompt}
        editSettingsError={editSettingsError}
        setEditSettingsError={setEditSettingsError}
        editSettingsLoading={editSettingsLoading}
        setEditSettingsLoading={setEditSettingsLoading}
        handleUpdateSettings={async () => {
          setEditSettingsError(null);
          if (
            editReadingLevel < 1 || editReadingLevel > 10 ||
            Number(editStoryLength) < 1 || Number(editStoryLength) > 50 ||
            ![
              "A sentence",
              "A few sentences",
              "A small paragraph",
              "A full paragraph",
              "A few paragraphs"
            ].includes(editChapterLength)
          ) {
            setEditSettingsError('Please ensure all fields are within valid ranges.');
            return;
          }
          setEditSettingsLoading(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const res = await fetch(`${EDGE_BASE}/update_story`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                story_id: selectedStory.id,
                reading_level: editReadingLevel,
                story_length: editStoryLength,
                chapter_length: editChapterLength,
                structural_prompt: editStructuralPrompt,
              }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to update settings');
            setSelectedStory({
              ...selectedStory,
              ...selectedStory,
              reading_level: editReadingLevel,
              story_length: editStoryLength,
              chapter_length: editChapterLength,
              structural_prompt: editStructuralPrompt,
            });
            setShowStorySettings(false);
          } catch (err: unknown) {
            // Safely extract error message for all error types
            let message = 'An unexpected error occurred';
            if (err instanceof Error) {
              message = err.message;
            } else if (typeof err === 'string') {
              message = err;
            } else if (
              typeof err === 'object' &&
              err !== null &&
              // Type guard for objects with a string 'message' property
              typeof (err as { message?: unknown }).message === 'string'
            ) {
              message = (err as { message: string }).message;
            }
            // Optionally log the error for debugging
            // console.error('Edit settings error:', err);
            setEditSettingsError(message);
          }
          setEditSettingsLoading(false);
        }}
        error={chaptersError || error}
        fetchingContinuations={fetchingContinuations}
      />
    );
  }

  // Main dashboard view
  return (
    <Box>
      <AppHeader
        isMobile={isMobile}
        selectedStory={selectedStory}
        onSignOut={onSignOut}
        setDrawerOpen={setDrawerOpen}
        setShowNewStory={setShowNewStory}
      />
      {isMobile && (
        <StoriesDrawer
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          stories={stories}
          selectedStory={selectedStory}
          setSelectedStory={setSelectedStory}
        />
      )}
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          mt: 0,
          px: 0,
          width: '100vw',
          minHeight: isMobile ? '100vh' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isMobile ? 'flex-start' : 'center',
          overflow: 'hidden',
          bgcolor: isMobile ? '#faf9f6' : 'transparent',
        }}
      >
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={4}
          alignItems={isMobile ? 'flex-start' : 'center'}
          justifyContent="center"
          sx={{
            width: '100%',
            minHeight: isMobile ? '100vh' : 'auto',
            maxWidth: isMobile ? '100vw' : 900,
            mx: 'auto',
            py: isMobile ? 0 : 6,
            px: isMobile ? 0 : 2,
            boxSizing: 'border-box',
          }}
        >
          <StoryList
            stories={stories}
            selectedStory={selectedStory}
            setSelectedStory={setSelectedStory}
            onSignOut={onSignOut}
            setShowNewStory={setShowNewStory}
            onDelete={async (story: Story) => {
              await deleteStory(story.id);
              if ((selectedStory as Story | null)?.id === (story as Story).id) setSelectedStory(null);
            }}
            error={error}
          />
          {/* Main Content (empty for now, could add welcome/info) */}
          {!isMobile && (
            <Box flex={1} />
          )}
        </Stack>
      </Container>
      {/* Arc preview and story creation dialog */}
      <NewStoryDialog
        open={showNewStory}
        loading={loading}
        error={error}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        initialPrompt={initialPrompt}
        setInitialPrompt={setInitialPrompt}
        readingLevel={readingLevel}
        setReadingLevel={setReadingLevel}
        storyLength={storyLength}
        setStoryLength={setStoryLength}
        chapterLength={chapterLength}
        setChapterLength={setChapterLength}
        structuralPrompt={structuralPrompt}
        setStructuralPrompt={setStructuralPrompt}
        onClose={() => {
          setShowNewStory(false);
          setCreatedStory(null);
        }}
        onCreate={async (e) => {
          e.preventDefault();
          try {
            const newStory = await createStory({
              title: newTitle,
              initialPrompt,
              readingLevel,
              storyLength,
              chapterLength,
              structuralPrompt,
            });
            setCreatedStory(newStory);
            // Do not setSelectedStory or close dialog yet; wait for user to click "View Story"
            setNewTitle('');
            setInitialPrompt('');
            setReadingLevel(3);
            setStoryLength(10);
            setChapterLength("A full paragraph");
            setStructuralPrompt('');
            setError(null);
          } catch (err) {
            console.error('Error creating story:', err);
          }
        }}
        createdStory={createdStory}
        onViewStory={() => {
          if (createdStory) {
            setSelectedStory(createdStory);
          }
          setShowNewStory(false);
          setCreatedStory(null);
        }}
      />
      {/* StorySettingsDialog is only available in story view */}
      {/* Delete Confirmation Dialog */}
      <DeleteStoryDialog
        open={deleteDialogOpen}
        storyToDelete={storyToDelete}
        loading={loading}
        onClose={() => setDeleteDialogOpen(false)}
        onDelete={async (story: Story) => {
          if (selectedStory && 'id' in selectedStory && story && 'id' in story) {
            if ((selectedStory as Story).id === story.id) setSelectedStory(null);
          }
          await deleteStory(story.id);
          setDeleteDialogOpen(false);
          setStoryToDelete(null);
        }}
      />
    </Box>
  );
}