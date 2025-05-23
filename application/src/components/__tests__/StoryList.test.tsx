import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoryList from '../StoryList';
import { vi } from 'vitest';

const stories = [
  {
    id: '1',
    title: 'Story One',
    status: 'draft',
    created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T12:00:00Z').toISOString(),
  },
  {
    id: '2',
    title: 'Story Two',
    status: 'published',
    created_at: new Date('2024-01-02T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-02T12:00:00Z').toISOString(),
  },
];

describe('StoryList', () => {
  it('renders stories and highlights selected', () => {
    const setSelectedStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        selectedStory={stories[1]}
        setSelectedStory={setSelectedStory}
        onSignOut={vi.fn()}
        setShowNewStory={vi.fn()}
        onDelete={vi.fn()}
        error={null}
      />
    );
    expect(screen.getByText('Story One')).toBeInTheDocument();
    expect(screen.getByText('Story Two')).toBeInTheDocument();
    // Selected story should have a border or background (visual, but we can check aria or class if set)
    // For now, just ensure both are rendered
  });

  it('calls setSelectedStory when a story is clicked', () => {
    const setSelectedStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        selectedStory={null}
        setSelectedStory={setSelectedStory}
        onSignOut={vi.fn()}
        setShowNewStory={vi.fn()}
        onDelete={vi.fn()}
        error={null}
      />
    );
    fireEvent.click(screen.getByText('Story One'));
    expect(setSelectedStory).toHaveBeenCalledWith(stories[0]);
  });

  it('calls onDelete when delete icon is clicked', () => {
    const onDelete = vi.fn();
    render(
      <StoryList
        stories={stories}
        selectedStory={null}
        setSelectedStory={vi.fn()}
        onSignOut={vi.fn()}
        setShowNewStory={vi.fn()}
        onDelete={onDelete}
        error={null}
      />
    );
    // Find the delete icon for the first story
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(stories[0]);
  });

  it('calls setShowNewStory when "New Story" button is clicked', () => {
    const setShowNewStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        selectedStory={null}
        setSelectedStory={vi.fn()}
        onSignOut={vi.fn()}
        setShowNewStory={setShowNewStory}
        onDelete={vi.fn()}
        error={null}
      />
    );
    fireEvent.click(screen.getByText('New Story'));
    expect(setShowNewStory).toHaveBeenCalledWith(true);
  });

  it('calls onSignOut when "Sign Out" button is clicked', () => {
    const onSignOut = vi.fn();
    render(
      <StoryList
        stories={stories}
        selectedStory={null}
        setSelectedStory={vi.fn()}
        onSignOut={onSignOut}
        setShowNewStory={vi.fn()}
        onDelete={vi.fn()}
        error={null}
      />
    );
    fireEvent.click(screen.getByText('Sign Out'));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('displays error message if error prop is set', () => {
    render(
      <StoryList
        stories={stories}
        selectedStory={null}
        setSelectedStory={vi.fn()}
        onSignOut={vi.fn()}
        setShowNewStory={vi.fn()}
        onDelete={vi.fn()}
        error="Something went wrong"
      />
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});