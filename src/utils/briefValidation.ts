import { Editor } from '@tiptap/react';

export interface BriefValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateBriefContent(editor: Editor | null): BriefValidationResult {
  const errors: string[] = [];

  if (!editor) {
    errors.push('Editor is not initialized');
    return { isValid: false, errors };
  }

  // Check if content is empty
  const content = editor.getHTML();
  if (!content || content.trim() === '<p></p>' || content.trim() === '') {
    errors.push('Content cannot be empty');
  }

  // Check content length
  const textContent = editor.getText();
  if (textContent.length > 10000) {
    errors.push('Content exceeds maximum length of 10,000 characters');
  }

  // Check for minimum content length
  if (textContent.length < 10) {
    errors.push('Content must be at least 10 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateBriefMetadata(version: string, date: string): BriefValidationResult {
  const errors: string[] = [];

  if (!version || version.trim() === '') {
    errors.push('Version is required');
  }

  if (!date || date.trim() === '') {
    errors.push('Date is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
