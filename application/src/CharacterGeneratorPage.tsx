import React, { useState, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Ensure this path is correct

// Basic styling (can be moved to a CSS file and imported)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  imagePreview: {
    marginTop: '20px',
    maxWidth: '100%',
    maxHeight: '500px',
    border: '1px solid #eee',
    padding: '5px',
    borderRadius: '4px',
  },
  error: {
    color: 'red',
    marginTop: '10px',
  },
  loading: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '18px',
  }
};

const CharacterGeneratorPage: React.FC = () => {
  const [description, setDescription] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description && !imageFile) {
      setError('Please provide a description or upload an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    const formData = new FormData();
    if (description) {
      formData.append('description', description);
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'character-render', // Ensure this is the correct function name
        { body: formData }
      );

      if (functionError) {
        throw new Error(`Supabase function error: ${functionError.message} (Details: ${functionError.details ? JSON.stringify(functionError.details): 'N/A'})`);
      }

      if (data && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      } else if (data && data.error) {
        // Handle errors returned in the data payload (as per our function's design)
        throw new Error(data.error);
      } 
      else {
        // Fallback for unexpected response structure
        throw new Error('Unexpected response structure from function.');
      }
    } catch (e: any) {
      console.error('Submission error:', e); // Keep full error logging

      let displayErrorMessage = e.message || 'Failed to generate character.';
      if (e.message && e.message.startsWith('Supabase function error:')) {
        // For errors from the function invocation itself (network, function crash, etc.)
        // functionError.message is already part of e.message here.
        // We want to make it more user-friendly for display.
        displayErrorMessage = 'An unexpected error occurred with the character generation service. Please try again. Details have been logged for the development team.';
      } else if (e.message && e.message.startsWith('Image generation DALL-E error:')) {
        // This is an application-level error message from the backend, potentially user actionable
        displayErrorMessage = e.message; // Keep as is, it's already specific
      } else if (e.message && e.message.startsWith('Image analysis GPT Vision error:')) {
        // Also an application-level error
        displayErrorMessage = e.message; // Keep as is
      }
      // Other specific backend errors like "Missing description or image..." will also pass through as e.message.

      setError(displayErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [description, imageFile]);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Character Generator</h1>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label htmlFor="description" style={styles.label}>Character Description (Optional if image provided):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.textarea}
            placeholder="e.g., A brave knight with a gleaming sword, fantasy art style"
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="imageFile" style={styles.label}>Upload Image (Optional):</label>
          <input
            type="file"
            id="imageFile"
            accept="image/png, image/jpeg"
            onChange={handleImageChange}
            style={styles.fileInput}
          />
        </div>
        
        {previewUrl && imageFile && (
            <div style={styles.formGroup}>
                <p style={styles.label}>Selected image preview:</p>
                <img src={previewUrl} alt="Selected image preview" style={styles.imagePreview} />
            </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading || (!description && !imageFile)}
          style={{...styles.button, ...( (isLoading || (!description && !imageFile)) ? styles.buttonDisabled : {})}}
        >
          {isLoading ? 'Generating...' : 'Generate Character'}
        </button>
      </form>

      {isLoading && <p style={styles.loading}>Generating your character, please wait...</p>}
      
      {error && <p style={styles.error}>Error: {error}</p>}

      {generatedImageUrl && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Generated Character:</h2>
          <img src={generatedImageUrl} alt="Generated character" style={styles.imagePreview} />
        </div>
      )}
    </div>
  );
};

export default CharacterGeneratorPage;
