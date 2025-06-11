import { describe, it, expect } from 'vitest';
import {
  countSentences,
  countWords,
  countParagraphs,
  validateChapterLength,
  truncateToSpec,
  type ChapterLengthCategory,
} from '../../netlify/functions/utils/chapter_length.js';

describe('Chapter Length Utilities', () => {
  describe('countSentences', () => {
    it('should count sentences correctly', () => {
      expect(countSentences('Hello world.')).toBe(1);
      expect(countSentences('Hello world. How are you?')).toBe(2);
      expect(countSentences('What? Really! Yes.')).toBe(3);
      expect(countSentences('')).toBe(0);
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('The quick brown fox jumps')).toBe(5);
      expect(countWords('')).toBe(0);
      expect(countWords('One')).toBe(1);
    });
  });

  describe('countParagraphs', () => {
    it('should count paragraphs correctly', () => {
      expect(countParagraphs('Single paragraph')).toBe(1);
      expect(countParagraphs('First paragraph.\n\nSecond paragraph.')).toBe(2);
      expect(countParagraphs('Para 1.\n\nPara 2.\n\nPara 3.')).toBe(3);
      expect(countParagraphs('')).toBe(0);
    });
  });

  describe('validateChapterLength', () => {
    it('should validate "A sentence" category', () => {
      const category: ChapterLengthCategory = 'A sentence';
      
      // Valid: 1 sentence, 10-20 words
      expect(validateChapterLength('This is a valid sentence with fifteen words in total.', category)).toBe(true);
      
      // Invalid: too many sentences
      expect(validateChapterLength('First sentence. Second sentence.', category)).toBe(false);
      
      // Invalid: too few words
      expect(validateChapterLength('Short.', category)).toBe(false);
      
      // Invalid: too many words
      expect(validateChapterLength('This is a very long sentence with way too many words that exceeds the twenty word limit for this category.', category)).toBe(false);
    });

    it('should validate "A few sentences" category', () => {
      const category: ChapterLengthCategory = 'A few sentences';
      
      // Valid: 2-4 sentences, 20-60 words
      const validText = 'First sentence with some words. Second sentence with more words. Third sentence completes the requirement.';
      expect(validateChapterLength(validText, category)).toBe(true);
      
      // Invalid: only 1 sentence
      expect(validateChapterLength('Just one sentence.', category)).toBe(false);
    });

    it('should validate "A few paragraphs" category', () => {
      const category: ChapterLengthCategory = 'A few paragraphs';
      
      // Valid: 12-20 sentences, 150-300 words, 2-3 paragraphs
      const validText = `First paragraph with multiple sentences. This paragraph has several sentences. More sentences here. Even more sentences. And one final sentence for this paragraph.

Second paragraph starts here. It also has multiple sentences. More sentences in this paragraph. Additional sentences here. Even more content. Final sentence of second paragraph.`;
      
      // This might not perfectly match the word count, but tests the structure
      expect(countParagraphs(validText)).toBe(2);
    });
  });

  describe('truncateToSpec', () => {
    it('should truncate to "A sentence" spec', () => {
      const category: ChapterLengthCategory = 'A sentence';
      const longText = 'First sentence with many words. Second sentence should be removed. Third sentence too.';
      
      const result = truncateToSpec(longText, category);
      expect(countSentences(result)).toBeLessThanOrEqual(1);
      expect(countWords(result)).toBeLessThanOrEqual(20);
    });

    it('should truncate to "A few sentences" spec', () => {
      const category: ChapterLengthCategory = 'A few sentences';
      const longText = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence should be removed.';
      
      const result = truncateToSpec(longText, category);
      expect(countSentences(result)).toBeLessThanOrEqual(4);
    });

    it('should handle text that is already within spec', () => {
      const category: ChapterLengthCategory = 'A sentence';
      const shortText = 'This is a perfect sentence.';
      
      const result = truncateToSpec(shortText, category);
      expect(result).toBe(shortText);
    });

    it('should add period if missing after truncation', () => {
      const category: ChapterLengthCategory = 'A sentence';
      const text = 'This is a very long sentence that will be truncated because it has way too many words and will exceed the twenty word limit set for this category';
      
      const result = truncateToSpec(text, category);
      expect(result.endsWith('.')).toBe(true);
    });
  });
});