// Utility functions for chapter length validation and adjustment

export type ChapterLengthCategory =
  | "A sentence"
  | "A few sentences"
  | "A small paragraph"
  | "A full paragraph"
  | "A few paragraphs";

export interface ChapterLengthSpec {
  sentences: [number, number]; // [min, max]
  words: [number, number];     // [min, max]
  paragraphs?: [number, number]; // [min, max], only for "A few paragraphs"
}

export const CHAPTER_LENGTH_SPECS: Record<ChapterLengthCategory, ChapterLengthSpec> = {
  "A sentence": { sentences: [1, 1], words: [10, 20] },
  "A few sentences": { sentences: [2, 4], words: [20, 60] },
  "A small paragraph": { sentences: [4, 6], words: [60, 100] },
  "A full paragraph": { sentences: [6, 10], words: [100, 150] },
  "A few paragraphs": { sentences: [12, 20], words: [150, 300], paragraphs: [2, 3] }
};

// Count sentences using a simple regex (could be improved for edge cases)
export function countSentences(text: string): number {
  return (text.match(/[^.!?]+[.!?]+/g) || []).length;
}

// Count words
export function countWords(text: string): number {
  return (text.match(/\b\w+\b/g) || []).length;
}

// Count paragraphs
export function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
}

// Truncate text to fit within the max sentence/word/paragraph limits
export function truncateToSpec(text: string, category: ChapterLengthCategory): string {
  const spec = CHAPTER_LENGTH_SPECS[category];
  let result = text;

  // Truncate paragraphs if needed
  if (spec.paragraphs) {
    const paragraphs = result.split(/\n\s*\n/);
    if (paragraphs.length > spec.paragraphs[1]) {
      result = paragraphs.slice(0, spec.paragraphs[1]).join('\n\n');
    }
  }

  // Truncate sentences if needed
  let sentences = result.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > spec.sentences[1]) {
    result = sentences.slice(0, spec.sentences[1]).join(' ').trim();
  }

  // Truncate words if needed
  let words = result.match(/\b\w+\b/g) || [];
  if (words.length > spec.words[1]) {
    // Truncate to max words, then reconstruct text
    let wordArray = result.split(/\s+/);
    result = wordArray.slice(0, spec.words[1]).join(' ');
    // Add period if missing
    if (!/[.!?]$/.test(result.trim())) result = result.trim() + '.';
  }

  return result.trim();
}

// Validate if text fits the spec
export function validateChapterLength(text: string, category: ChapterLengthCategory): boolean {
  const spec = CHAPTER_LENGTH_SPECS[category];
  const sentenceCount = countSentences(text);
  const wordCount = countWords(text);
  const paragraphCount = spec.paragraphs ? countParagraphs(text) : undefined;

  const sentencesOk = sentenceCount >= spec.sentences[0] && sentenceCount <= spec.sentences[1];
  const wordsOk = wordCount >= spec.words[0] && wordCount <= spec.words[1];
  const paragraphsOk = spec.paragraphs
    ? paragraphCount !== undefined && paragraphCount >= spec.paragraphs[0] && paragraphCount <= spec.paragraphs[1]
    : true;

  return sentencesOk && wordsOk && paragraphsOk;
}