import React from 'react';
import { SamsungNotebookReflection } from './SamsungNotebookReflection';

interface InlineReflectionContextProps {
  verseNumber: number;
  reference: string;
  verseText?: string;
  initialNote?: string;
  onSave: (note: string) => void;
  onCollapse?: () => void;
  theme: 'light' | 'dark';
}

export const InlineReflectionContext: React.FC<InlineReflectionContextProps> = ({
  verseNumber,
  reference,
  initialNote = '',
  onSave,
  onCollapse,
  theme,
}) => {
  return (
    <SamsungNotebookReflection
      verseNumber={verseNumber}
      reference={reference}
      initialNote={initialNote}
      onSave={onSave}
      onCollapse={onCollapse}
      theme={theme}
    />
  );
};
