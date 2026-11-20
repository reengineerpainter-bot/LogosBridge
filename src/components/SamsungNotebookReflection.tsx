import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MoreVertical,
  Share2,
  X,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eraser,
} from 'lucide-react';
import { triggerNativeShare } from '../utils/shareUtils';
import { auth } from '../firebase';
import { updateUserProfile as updateFirebaseUserProfile, NotebookUserSettings } from '../utils/firebaseSync';
import { supabase } from '../supabase';
import { updateUserProfile as updateSupabaseUserProfile } from '../utils/supabaseSync';

export type NotebookHeadingStyle = 'h1' | 'h2' | 'h3' | 'b1' | 'b2';
export type PageTemplateType = 'ruled' | 'grid' | 'blank';
export type PenInstrument = 'fountain' | 'ballpoint' | 'calligraphy' | 'pencil';

export interface NotebookPageData {
  id: string;
  text: string;
  html?: string;
  style: NotebookHeadingStyle;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  listType?: 'none' | 'bullet' | 'check';
  drawingData?: string; // Base64 snapshot of handwriting
}

export interface NotebookDocument {
  version: 3;
  title?: string;
  template: PageTemplateType;
  pages: NotebookPageData[];
  activePageIndex: number;
}

export const extractPlainTextFromNote = (noteContent: string): string => {
  if (!noteContent) return '';
  const trimmed = noteContent.trim();
  if (!trimmed.startsWith('{')) {
    return trimmed.replace(/<[^>]+>/g, '').trim();
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return parsed.pages.map((p: any) => {
        const raw = p.text || p.html || '';
        return raw.replace(/<[^>]+>/g, '').trim();
      }).filter(Boolean).join('\n') || '';
    }
  } catch {
    // Return original if not JSON
  }
  return noteContent;
};

interface SamsungNotebookReflectionProps {
  verseNumber: number;
  reference: string;
  verseText?: string;
  initialNote?: string;
  onSave: (serialized: string) => void;
  onCollapse?: () => void;
  theme: 'light' | 'dark';
}

const TEXT_COLORS = [
  { id: 'default', label: 'Ink', light: '#18181b', dark: '#fafafa' },
  { id: 'gold', label: 'Gold', light: '#b45309', dark: '#fbbf24' },
  { id: 'crimson', label: 'Crimson', light: '#b91c1c', dark: '#f87171' },
  { id: 'blue', label: 'Sapphire', light: '#1d4ed8', dark: '#60a5fa' },
  { id: 'green', label: 'Forest', light: '#15803d', dark: '#4ade80' },
  { id: 'violet', label: 'Violet', light: '#6d28d9', dark: '#c084fc' },
];

const HIGHLIGHT_COLORS = [
  { id: 'none', label: 'None', light: 'transparent', dark: 'transparent' },
  { id: 'yellow', label: 'Amber', light: '#fef08a', dark: '#854d0e50' },
  { id: 'mint', label: 'Mint', light: '#bbf7d0', dark: '#14532d50' },
  { id: 'rose', label: 'Rose', light: '#fecdd3', dark: '#88133750' },
  { id: 'lavender', label: 'Lavender', light: '#e9d5ff', dark: '#581c8750' },
  { id: 'sky', label: 'Sky', light: '#bae6fd', dark: '#0369a150' },
];

const PEN_STROKES = [
  { id: 'fine', label: 'Fine', width: 1.5 },
  { id: 'medium', label: 'Medium', width: 3 },
  { id: 'broad', label: 'Broad', width: 6 },
];

const PEN_COLORS = [
  { id: 'default', light: '#18181b', dark: '#ffffff' },
  { id: 'gold', light: '#b45309', dark: '#fbbf24' },
  { id: 'crimson', light: '#dc2626', dark: '#ef4444' },
  { id: 'blue', light: '#2563eb', dark: '#60a5fa' },
  { id: 'green', light: '#16a34a', dark: '#4ade80' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 22];

export const PAGE_CHAR_LIMIT = 1200;

export const getCachedNotebookSettings = (): NotebookUserSettings => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('logosbridge_notebook_settings');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return {};
};

export const saveNotebookUserSettings = (patch: Partial<NotebookUserSettings>): void => {
  try {
    const current = getCachedNotebookSettings();
    const merged: NotebookUserSettings = { ...current, ...patch };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('logosbridge_notebook_settings', JSON.stringify(merged));
    }

    // Auto-save to Firebase user profile if authenticated
    try {
      const fbUid = auth?.currentUser?.uid;
      if (fbUid && !fbUid.startsWith('guest')) {
        updateFirebaseUserProfile(fbUid, { notebookSettings: merged }).catch(() => {});
      }
    } catch {}

    // Auto-save to Supabase user profile if authenticated
    try {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const supaUid = sessionData?.session?.user?.id;
        if (supaUid && !supaUid.startsWith('guest')) {
          updateSupabaseUserProfile(supaUid, { notebookSettings: merged }).catch(() => {});
        }
      }).catch(() => {});
    } catch {}
  } catch {}
};

const createDefaultPage = (id: string, initialText = ''): NotebookPageData => {
  const cached = getCachedNotebookSettings();
  return {
    id,
    text: initialText,
    html: initialText ? initialText.replace(/\n/g, '<br>') : '',
    style: cached.style || 'b1',
    fontSize: cached.fontSize || 16,
    textColor: cached.textColor || 'default',
    highlightColor: cached.highlightColor || 'none',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    listType: 'none',
  };
};

type ActivePopover = 'pen' | 'textColor' | 'highlightColor' | 'preset' | 'fontSize' | 'more' | null;

export const SamsungNotebookReflection: React.FC<SamsungNotebookReflectionProps> = ({
  verseNumber,
  reference,
  verseText,
  initialNote = '',
  onSave,
  onCollapse,
  theme,
}) => {
  // Parse document
  const parseDocument = useCallback((): NotebookDocument => {
    const cached = getCachedNotebookSettings();
    if (!initialNote) {
      return {
        version: 3,
        title: '',
        template: cached.template || 'blank',
        pages: [createDefaultPage('page-1')],
        activePageIndex: 0,
      };
    }

    try {
      const parsed = JSON.parse(initialNote);
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        return {
          version: 3,
          title: parsed.title || '',
          template: parsed.template || cached.template || 'blank',
          pages: parsed.pages.map((p: any) => ({
            ...p,
            html: p.html || (p.text ? p.text.replace(/\n/g, '<br>') : ''),
          })),
          activePageIndex: Math.min(parsed.activePageIndex || 0, parsed.pages.length - 1),
        };
      }
    } catch {
      // Legacy text note fallback
    }

    return {
      version: 3,
      title: '',
      template: cached.template || 'blank',
      pages: [createDefaultPage('page-1', initialNote)],
      activePageIndex: 0,
    };
  }, [initialNote]);

  const initialSettings = useRef(getCachedNotebookSettings()).current;
  const [doc, setDoc] = useState<NotebookDocument>(parseDocument);
  const docRef = useRef<NotebookDocument>(doc);
  docRef.current = doc;

  useEffect(() => {
    if (!isTypingRef.current) {
      const reParsed = parseDocument();
      setDoc(reParsed);
      docRef.current = reParsed;
    }
  }, [parseDocument]);
  const [mode, setMode] = useState<'text' | 'pen'>('text');
  const [penInstrument, setPenInstrument] = useState<PenInstrument>(initialSettings.penInstrument || 'fountain');
  const [activePenStroke, setActivePenStroke] = useState<number>(initialSettings.penStroke || 3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [activePenColor, setActivePenColor] = useState<string>(initialSettings.penColor || 'default');
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [isReadingMode] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Compact surface height state & sleek mobile-friendly drag resize handle logic
  const [surfaceHeight, setSurfaceHeight] = useState<number>(initialSettings.surfaceHeight || 140);
  const [isDraggingHeight, setIsDraggingHeight] = useState<boolean>(false);
  const isDraggingHeightRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(initialSettings.surfaceHeight || 140);
  const currentHeightRef = useRef<number>(initialSettings.surfaceHeight || 140);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const startResizeDrag = (clientY: number) => {
    isDraggingHeightRef.current = true;
    setIsDraggingHeight(true);
    dragStartYRef.current = clientY;
    startHeightRef.current = currentHeightRef.current;
  };

  const updateResizeDrag = (clientY: number) => {
    if (!isDraggingHeightRef.current) return;
    const deltaY = clientY - dragStartYRef.current;
    const newHeight = Math.max(90, Math.min(650, startHeightRef.current + deltaY));
    currentHeightRef.current = newHeight;
    if (surfaceRef.current) {
      surfaceRef.current.style.height = `${newHeight}px`;
    }
    setSurfaceHeight(newHeight);
  };

  const endResizeDrag = () => {
    if (!isDraggingHeightRef.current) return;
    isDraggingHeightRef.current = false;
    setIsDraggingHeight(false);
    resizeCanvas();
    saveNotebookUserSettings({ surfaceHeight: currentHeightRef.current });
  };

  useEffect(() => {
    if (!isDraggingHeight) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      updateResizeDrag(e.clientY);
    };

    const handleWindowPointerUp = () => {
      endResizeDrag();
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        updateResizeDrag(e.touches[0].clientY);
      }
    };

    const handleWindowTouchEnd = () => {
      endResizeDrag();
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isDraggingHeight]);

  const handleDragHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startResizeDrag(e.clientY);
  };

  const handleDragHandleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      startResizeDrag(e.touches[0].clientY);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const popoverCardRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = (): boolean => {
    if (!savedRangeRef.current || !editorRef.current) return false;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      return true;
    }
    return false;
  };

  const ensureSelection = () => {
    restoreSelection();
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return false;

    // If selection is collapsed (cursor blinking on a word), expand selection to the word under cursor
    if (sel.isCollapsed && typeof (sel as any).modify === 'function') {
      try {
        (sel as any).modify('move', 'backward', 'word');
        (sel as any).modify('extend', 'forward', 'word');
        if (sel.rangeCount > 0) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch {}
    }
    return true;
  };

  const currentPage = doc.pages[doc.activePageIndex] || doc.pages[0];
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistDocument = (updatedDoc: NotebookDocument, immediate: boolean = false) => {
    docRef.current = updatedDoc;
    setDoc(updatedDoc);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (immediate) {
      onSave(JSON.stringify(updatedDoc));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } else {
      saveTimeoutRef.current = setTimeout(() => {
        onSave(JSON.stringify(updatedDoc));
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }, 400);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (docRef.current) {
          onSave(JSON.stringify(docRef.current));
        }
      }
    };
  }, [onSave]);

  // Redraw canvas on page change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentPage?.drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = currentPage.drawingData;
    }
  }, [doc.activePageIndex, currentPage?.id]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      const tempDrawing = canvas.toDataURL();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (ctx && currentPage?.drawingData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = tempDrawing;
      }
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Click-away listener to instantly close open floating cards or options menu
  useEffect(() => {
    if (!activePopover) return;

    const handleOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverCardRef.current && popoverCardRef.current.contains(target)) {
        return;
      }
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        return;
      }
      if (moreMenuRef.current && moreMenuRef.current.contains(target)) {
        return;
      }
      setActivePopover(null);
    };

    window.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [activePopover]);

  const updateCurrentPage = (patch: Partial<NotebookPageData>, immediate: boolean = false) => {
    const updatedPages = [...docRef.current.pages];
    const activePage = updatedPages[docRef.current.activePageIndex] || updatedPages[0];
    updatedPages[docRef.current.activePageIndex] = {
      ...activePage,
      ...patch,
    };
    persistDocument({
      ...docRef.current,
      pages: updatedPages,
    }, immediate);
  };

  const handleEditorContentChange = (immediate: boolean = false) => {
    if (!editorRef.current) return;
    isTypingRef.current = true;
    let html = editorRef.current.innerHTML;
    let text = editorRef.current.innerText || '';

    // Enforce 1,200 character per-page bound
    if (text.length > PAGE_CHAR_LIMIT) {
      text = text.slice(0, PAGE_CHAR_LIMIT);
      editorRef.current.innerText = text;
      html = editorRef.current.innerHTML;
    }

    saveSelection();
    updateCurrentPage({ html, text }, immediate);
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText) return;

    const currentText = editorRef.current?.innerText || '';
    if (currentText.length + pastedText.length > PAGE_CHAR_LIMIT) {
      e.preventDefault();
      const remainingCapacity = Math.max(0, PAGE_CHAR_LIMIT - currentText.length);
      const firstChunk = pastedText.slice(0, remainingCapacity);
      const remainingChunks: string[] = [];

      let leftover = pastedText.slice(remainingCapacity);
      while (leftover.length > 0) {
        remainingChunks.push(leftover.slice(0, PAGE_CHAR_LIMIT));
        leftover = leftover.slice(PAGE_CHAR_LIMIT);
      }

      if (firstChunk) {
        document.execCommand('insertText', false, firstChunk);
        handleEditorContentChange(true);
      }

      if (remainingChunks.length > 0) {
        const newPages = [...docRef.current.pages];
        remainingChunks.forEach((chunk) => {
          newPages.push({
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: chunk,
            html: chunk.replace(/\n/g, '<br>'),
            style: 'b1',
            fontSize: 16,
            textColor: 'default',
            highlightColor: 'none',
          });
        });
        persistDocument({
          ...docRef.current,
          pages: newPages,
          activePageIndex: docRef.current.activePageIndex,
        }, true);
      }
    }
  };

  const applyInlineStyle = (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    ensureSelection();
    document.execCommand(command, false);
    handleEditorContentChange(true);
  };

  const applyTextColor = (colorId: string) => {
    ensureSelection();
    const colorObj = TEXT_COLORS.find((t) => t.id === colorId);
    const hex = colorObj ? (theme === 'light' ? colorObj.light : colorObj.dark) : '#18181b';
    document.execCommand('foreColor', false, hex);
    handleEditorContentChange(true);
    saveNotebookUserSettings({ textColor: colorId });
  };

  const applyHighlightColor = (highlightId: string) => {
    ensureSelection();
    if (highlightId === 'none') {
      if (!document.execCommand('hiliteColor', false, 'transparent')) {
        document.execCommand('backColor', false, 'transparent');
      }
    } else {
      const hObj = HIGHLIGHT_COLORS.find((h) => h.id === highlightId);
      const hex = hObj ? (theme === 'light' ? hObj.light : hObj.dark) : 'transparent';
      if (!document.execCommand('hiliteColor', false, hex)) {
        document.execCommand('backColor', false, hex);
      }
    }
    handleEditorContentChange(true);
    saveNotebookUserSettings({ highlightColor: highlightId });
  };

  // Sync editor innerHTML when page changes or document is parsed
  useEffect(() => {
    if (editorRef.current) {
      const targetHtml = currentPage?.html || (currentPage?.text ? currentPage.text.replace(/\n/g, '<br>') : '');
      if (editorRef.current.innerHTML !== targetHtml && !isTypingRef.current) {
        editorRef.current.innerHTML = targetHtml;
      }
      isTypingRef.current = false;
    }
  }, [doc.activePageIndex, currentPage?.id, currentPage?.html]);

  const setTemplate = (template: PageTemplateType) => {
    persistDocument({
      ...doc,
      template,
    });
    saveNotebookUserSettings({ template });
    setActivePopover(null);
  };

  const flushCurrentEditor = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = (editorRef.current.innerText || '').slice(0, PAGE_CHAR_LIMIT);
      const updatedPages = [...docRef.current.pages];
      if (updatedPages[docRef.current.activePageIndex]) {
        updatedPages[docRef.current.activePageIndex] = {
          ...updatedPages[docRef.current.activePageIndex],
          html,
          text,
        };
        docRef.current.pages = updatedPages;
      }
    }
  };

  const addNewPage = () => {
    flushCurrentEditor();
    const newPage = createDefaultPage(`page-${Date.now()}`);
    const newPages = [...docRef.current.pages, newPage];
    setSlideDirection(1);
    persistDocument({
      ...docRef.current,
      pages: newPages,
      activePageIndex: newPages.length - 1,
    }, true);
    setActivePopover(null);
  };

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShareNote = async () => {
    setActivePopover(null);
    const plainNote = extractPlainTextFromNote(currentPage?.text || '');
    const titleText = doc.title?.trim();

    const lines: string[] = [];
    lines.push(reference);
    lines.push('');
    if (titleText) {
      lines.push(`Reflection: ${titleText}`);
    } else {
      lines.push('Reflection:');
    }
    if (plainNote) {
      lines.push(plainNote);
    } else {
      lines.push('(Empty note)');
    }
    lines.push('');
    lines.push('— Shared via LogosBridge');

    const shareContent = lines.join('\n');
    const shareTitle = `${reference} Reflection`;

    const result = await triggerNativeShare({
      title: shareTitle,
      text: shareContent,
      dialogTitle: `Share ${shareTitle}`,
    });

    if (result === 'copied') {
      setShareFeedback('Copied');
      setTimeout(() => setShareFeedback(null), 2500);
    } else if (result === 'shared') {
      setShareFeedback('Shared');
      setTimeout(() => setShareFeedback(null), 2000);
    } else if (result === 'failed') {
      setShareFeedback('Could not share');
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  const deleteCurrentPage = () => {
    if (docRef.current.pages.length <= 1) return;
    const newPages = docRef.current.pages.filter((_, idx) => idx !== docRef.current.activePageIndex);
    const newIndex = Math.max(0, docRef.current.activePageIndex - 1);
    setSlideDirection(-1);
    persistDocument({
      ...docRef.current,
      pages: newPages,
      activePageIndex: newIndex,
    }, true);
    setActivePopover(null);
  };

  const goToPage = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= docRef.current.pages.length || targetIndex === docRef.current.activePageIndex) return;
    flushCurrentEditor();
    setSlideDirection(targetIndex > docRef.current.activePageIndex ? 1 : -1);
    persistDocument({
      ...docRef.current,
      activePageIndex: targetIndex,
    }, true);
  };

  // Touch Swipe Handlers for Page Turning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode === 'pen') return;
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (mode === 'pen' || !touchStartRef.current) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 50 && Math.abs(dy) < 60) {
      if (dx < 0 && doc.activePageIndex < doc.pages.length - 1) {
        goToPage(doc.activePageIndex + 1);
      } else if (dx > 0 && doc.activePageIndex > 0) {
        goToPage(doc.activePageIndex - 1);
      }
    }
  };

  // Drawing Canvas Methods
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePopover) setActivePopover(null);
    if (mode !== 'pen' || isReadingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoordinates(e);
    lastPointRef.current = coords;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = activePenStroke;
      ctx.strokeStyle = getComputedPenColor();
    }

    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || mode !== 'pen' || isReadingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoordinates(e);
    if (!lastPointRef.current) {
      lastPointRef.current = currentPoint;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const drawingDataUrl = canvas.toDataURL();
    updateCurrentPage({ drawingData: drawingDataUrl });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCurrentPage({ drawingData: undefined });
    setActivePopover(null);
  };

  const getComputedPenColor = (): string => {
    const matched = PEN_COLORS.find((c) => c.id === activePenColor);
    if (!matched) return theme === 'light' ? '#18181b' : '#ffffff';
    return theme === 'light' ? matched.light : matched.dark;
  };

  const getComputedTextColor = (): string => {
    const matched = TEXT_COLORS.find((c) => c.id === currentPage.textColor);
    if (!matched || matched.id === 'default') {
      return theme === 'light' ? '#18181b' : '#fafafa';
    }
    return theme === 'light' ? matched.light : matched.dark;
  };

  const getComputedHighlightColor = (): string => {
    const matched = HIGHLIGHT_COLORS.find((c) => c.id === currentPage.highlightColor);
    if (!matched || matched.id === 'none') return 'transparent';
    return theme === 'light' ? matched.light : matched.dark;
  };

  const togglePopover = (target: ActivePopover) => {
    setActivePopover((prev) => (prev === target ? null : target));
  };

  // Background style based on page template
  const getPaperBackgroundStyle = (): React.CSSProperties => {
    if (doc.template === 'grid') {
      return {
        backgroundImage:
          theme === 'light'
            ? 'linear-gradient(to right, rgba(200, 190, 180, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(200, 190, 180, 0.35) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(70, 60, 52, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(70, 60, 52, 0.45) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    }
    if (doc.template === 'ruled') {
      return {
        backgroundImage:
          theme === 'light'
            ? 'linear-gradient(to bottom, transparent 31px, rgba(200, 190, 180, 0.35) 32px)'
            : 'linear-gradient(to bottom, transparent 31px, rgba(70, 60, 52, 0.45) 32px)',
        backgroundSize: '100% 32px',
        backgroundPosition: '0 8px',
      };
    }
    // Default: Blank
    return {};
  };

  return (
    <div className="w-full text-left font-sans select-none my-2 transition-all relative border-y border-black/[0.05] dark:border-white/[0.06] rounded-lg overflow-hidden shadow-xs bg-white dark:bg-[#1a1614]">
      {/* ── TOP MINIMAL APP BAR (< Title   ⋮) ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#fafafb] dark:bg-[#1a1614] border-b border-black/[0.04] dark:border-white/[0.04] select-none">
        {/* Left: < Back + Note Name Input */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <button
            type="button"
            onClick={() => {
              flushCurrentEditor();
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
              }
              onSave(JSON.stringify(docRef.current));
              onCollapse?.();
            }}
            className="p-1 -ml-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Back / Close Note"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={doc.title || ''}
            onChange={(e) => {
              persistDocument({
                ...doc,
                title: e.target.value,
              });
            }}
            placeholder="Name your note..."
            className="bg-transparent border-0 focus:outline-none focus:ring-0 font-semibold text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-sans tracking-wide py-0 px-1 w-full max-w-[200px] transition-colors"
          />
          {justSaved && (
            <span className="text-[9px] text-emerald-500 font-mono flex items-center gap-0.5 shrink-0 ml-0.5 animate-fade-in">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>Saved</span>
            </span>
          )}
          {shareFeedback && (
            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-medium px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1 animate-fade-in shrink-0 ml-1">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>{shareFeedback}</span>
            </span>
          )}
        </div>

        {/* Center: Multi-Page Navigator & Character Limit Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 mr-1.5">
          {/* Character Count Badge (e.g. 840/1200) */}
          <span
            className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded transition-colors ${
              (currentPage?.text?.length || 0) >= PAGE_CHAR_LIMIT
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                : (currentPage?.text?.length || 0) >= PAGE_CHAR_LIMIT * 0.9
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
            title={`Characters on current page: ${currentPage?.text?.length || 0} / ${PAGE_CHAR_LIMIT}`}
          >
            {currentPage?.text?.length || 0}/{PAGE_CHAR_LIMIT}
          </span>

          {/* Page Pill Controls (< Page 1/2 > +) */}
          <div className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 p-0.5 border border-black/[0.04] dark:border-white/[0.05]">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => goToPage(doc.activePageIndex - 1)}
              disabled={doc.activePageIndex <= 0}
              className={`p-1 rounded transition-colors ${
                doc.activePageIndex <= 0
                  ? 'opacity-30 cursor-not-allowed text-zinc-400'
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer active:scale-95'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <span className="text-[10px] font-sans font-semibold px-1 text-zinc-700 dark:text-zinc-300 select-none">
              {doc.activePageIndex + 1}/{doc.pages.length}
            </span>

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => goToPage(doc.activePageIndex + 1)}
              disabled={doc.activePageIndex >= doc.pages.length - 1}
              className={`p-1 rounded transition-colors ${
                doc.activePageIndex >= doc.pages.length - 1
                  ? 'opacity-30 cursor-not-allowed text-zinc-400'
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer active:scale-95'
              }`}
              title="Next Page"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            <div className="w-[1px] h-3 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={addNewPage}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-95"
              title="Add New Page"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Options (⋮) */}
        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 relative">
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => togglePopover('more')}
              className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                activePopover === 'more' ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}
              title="More options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* More Options Popover */}
            {activePopover === 'more' && (
              <div
                className={`absolute right-0 top-7 z-40 p-1.5 rounded-xl border shadow-lg backdrop-blur-md flex flex-col gap-1 w-40 ${
                  theme === 'light'
                    ? 'bg-white/95 border-zinc-200 text-zinc-800 shadow-black/10'
                    : 'bg-[#221c17]/95 border-[#45372d] text-[#ded6cb] shadow-black/40'
                }`}
              >
                <button
                  type="button"
                  onClick={handleShareNote}
                  className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span>Share Note</span>
                  <Share2 className="w-3 h-3 opacity-70" />
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                <div className="px-1.5 text-[8px] font-bold uppercase tracking-wider text-zinc-400">Template</div>
                <div className="grid grid-cols-3 gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTemplate('blank')}
                    className={`py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors text-center ${
                      doc.template === 'blank'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Blank
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('ruled')}
                    className={`py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors text-center ${
                      doc.template === 'ruled'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Ruled
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('grid')}
                    className={`py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors text-center ${
                      doc.template === 'grid'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Grid
                  </button>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  Clear Handwriting
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                <button
                  type="button"
                  onClick={addNewPage}
                  className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span>Add New Page</span>
                  <Plus className="w-3 h-3 opacity-70" />
                </button>

                {doc.pages.length > 1 && (
                  <button
                    type="button"
                    onClick={deleteCurrentPage}
                    className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <span>Delete Page {doc.activePageIndex + 1}</span>
                    <Trash2 className="w-3 h-3 opacity-70" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN STATIONERY SURFACE ── */}
      <div
        ref={surfaceRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full overflow-hidden p-3 ${
          isDraggingHeight ? 'transition-none select-none pointer-events-none' : 'transition-[height] duration-150'
        } ${
          theme === 'light'
            ? 'bg-white text-zinc-900'
            : 'bg-[#1a1614] text-[#ded6cb]'
        }`}
        style={{
          ...getPaperBackgroundStyle(),
          height: `${surfaceHeight}px`,
          willChange: isDraggingHeight ? 'height' : 'auto',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage?.id}
            initial={{ opacity: 0, x: slideDirection * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection * -60 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full relative"
          >
            {/* Rich ContentEditable Text Layer */}
            <div
              ref={(el) => {
                editorRef.current = el;
                if (el && !isTypingRef.current) {
                  const targetHtml = currentPage?.html || (currentPage?.text ? currentPage.text.replace(/\n/g, '<br>') : '');
                  if (el.innerHTML !== targetHtml) {
                    el.innerHTML = targetHtml;
                  }
                }
              }}
              contentEditable={mode === 'text'}
              suppressContentEditableWarning
              onInput={() => handleEditorContentChange()}
              onPaste={handleEditorPaste}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              onTouchEnd={saveSelection}
              onSelect={saveSelection}
              onBlur={() => {
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = null;
                  onSave(JSON.stringify(docRef.current));
                }
              }}
              onFocus={() => { if (activePopover) setActivePopover(null); }}
              onClick={() => { if (activePopover) setActivePopover(null); }}
              data-placeholder="Write note..."
              className={`select-text w-full h-full bg-transparent border-0 focus:outline-none focus:ring-0 p-0 overflow-y-auto pb-2 relative z-10 empty:before:content-[attr(data-placeholder)] empty:before:opacity-40 empty:before:pointer-events-none ${
                currentPage?.style === 'h1'
                  ? 'font-serif font-black text-2xl'
                  : currentPage?.style === 'h2'
                  ? 'font-serif font-bold text-xl'
                  : currentPage?.style === 'h3'
                  ? 'font-serif font-semibold text-lg'
                  : currentPage?.style === 'b2'
                  ? 'font-sans text-sm opacity-90'
                  : 'font-sans'
              }`}
              style={{
                fontSize: `${currentPage?.fontSize || 16}px`,
                color: theme === 'light' ? '#18181b' : '#fafafa',
                lineHeight: doc.template === 'ruled' ? '32px' : '1.75',
              }}
            />

            {/* Page Limit Reached Helper Pill */}
            {(currentPage?.text?.length || 0) >= PAGE_CHAR_LIMIT && (
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/95 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 shadow-md text-[10px] text-rose-700 dark:text-rose-300 font-medium backdrop-blur-xs animate-fade-in select-none">
                <span>Page Limit Reached</span>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={addNewPage}
                  className="font-bold underline cursor-pointer hover:opacity-80 active:scale-95 ml-1 text-cyan-600 dark:text-cyan-400"
                >
                  + Next Page
                </button>
              </div>
            )}

            {/* S-Pen Handwriting Overlay Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className={`absolute inset-0 w-full h-full ${
                mode === 'pen'
                  ? isEraser
                    ? 'cursor-cell pointer-events-auto touch-none'
                    : 'cursor-crosshair pointer-events-auto touch-none'
                  : 'pointer-events-none'
              }`}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── SLEEK DRAG HANDLE (Drag down/up to expand/contract note height) ── */}
      <div
        onPointerDown={handleDragHandlePointerDown}
        onPointerMove={(e) => {
          if (isDraggingHeightRef.current) {
            updateResizeDrag(e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (isDraggingHeightRef.current) {
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            endResizeDrag();
          }
        }}
        onPointerCancel={(e) => {
          if (isDraggingHeightRef.current) {
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            endResizeDrag();
          }
        }}
        onTouchStart={handleDragHandleTouchStart}
        onTouchMove={(e) => {
          if (isDraggingHeightRef.current && e.touches.length > 0) {
            if (e.cancelable) e.preventDefault();
            updateResizeDrag(e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => {
          if (isDraggingHeightRef.current) endResizeDrag();
        }}
        onTouchCancel={() => {
          if (isDraggingHeightRef.current) endResizeDrag();
        }}
        style={{ touchAction: 'none' }}
        className={`w-full flex items-center justify-center h-8 py-1.5 border-t cursor-ns-resize transition-colors touch-none select-none group relative ${
          isDraggingHeight
            ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-400/50'
            : 'bg-[#fafafb]/95 dark:bg-[#1a1614]/95 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border-black/[0.06] dark:border-white/[0.06]'
        }`}
        title="Drag up or down to resize note box"
      >
        {/* Invisible expanded touch hit zone for mobile */}
        <div className="absolute -inset-y-2 inset-x-0 pointer-events-none" />

        {/* Visual Pill with Micro Grip Affordance */}
        <div
          className={`flex items-center justify-center gap-1 px-3 py-1 rounded-full transition-all duration-150 ${
            isDraggingHeight
              ? 'bg-cyan-500 text-white shadow-sm scale-105'
              : 'bg-zinc-200/90 dark:bg-zinc-700/80 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600'
          }`}
        >
          <div className={`w-12 h-1 rounded-full transition-colors ${isDraggingHeight ? 'bg-white' : 'bg-zinc-400 dark:bg-zinc-400'}`} />
        </div>
      </div>

      {/* ── CONTEXTUAL POPOVERS ANCHORED ABOVE BOTTOM TOOLBAR ── */}
      <AnimatePresence>
        {activePopover && activePopover !== 'more' && (
          <motion.div
            ref={popoverCardRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={`absolute left-1/2 -translate-x-1/2 bottom-10 z-30 p-1.5 rounded-xl border shadow-xl backdrop-blur-md w-max max-w-[92%] ${
              theme === 'light'
                ? 'bg-white/95 border-zinc-200 text-zinc-800 shadow-black/10'
                : 'bg-[#221c17]/95 border-[#45372d] text-[#ded6cb] shadow-black/40'
            }`}
          >
            {/* 1. PEN TOOL POPOVER */}
            {activePopover === 'pen' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 border-b pb-0.5 border-zinc-200 dark:border-zinc-800">
                  <span>Pen & Stroke</span>
                  <button type="button" onClick={() => setActivePopover(null)} className="cursor-pointer hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Instruments */}
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Tool</span>
                  {[
                    { id: 'fountain', label: 'Fountain' },
                    { id: 'ballpoint', label: 'Ballpoint' },
                    { id: 'calligraphy', label: 'Calligraphy' },
                    { id: 'pencil', label: 'Pencil' },
                  ].map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        const nextInst = inst.id as PenInstrument;
                        setPenInstrument(nextInst);
                        saveNotebookUserSettings({ penInstrument: nextInst });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-all ${
                        penInstrument === inst.id
                          ? theme === 'light' ? 'bg-black text-white' : 'bg-white text-black'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>

                {/* Stroke */}
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Stroke</span>
                  {PEN_STROKES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActivePenStroke(s.width);
                        saveNotebookUserSettings({ penStroke: s.width });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-all ${
                        activePenStroke === s.width
                          ? theme === 'light' ? 'bg-black text-white' : 'bg-white text-black'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsEraser(!isEraser)}
                    className={`ml-auto px-1.5 py-0.5 rounded text-[9.5px] font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                      isEraser
                        ? 'bg-rose-500 text-white'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Eraser className="w-2.5 h-2.5" />
                    <span>Eraser</span>
                  </button>
                </div>

                {/* Colors */}
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Color</span>
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActivePenColor(c.id);
                        saveNotebookUserSettings({ penColor: c.id });
                      }}
                      className={`w-3.5 h-3.5 rounded cursor-pointer transition-transform border ${
                        activePenColor === c.id
                          ? 'scale-115 ring-1.5 ring-sky-500 border-white'
                          : 'border-zinc-300 dark:border-zinc-700 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: theme === 'light' ? c.light : c.dark }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. TEXT COLOR & UNDERLINE POPOVER */}
            {activePopover === 'textColor' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 border-b pb-0.5 border-zinc-200 dark:border-zinc-800">
                  <span>Text Formatting & Ink</span>
                  <button type="button" onClick={() => setActivePopover(null)} className="cursor-pointer hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Inline formatting buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Style</span>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineStyle('bold')}
                    className="p-1 rounded-full transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90"
                    title="Bold selected words"
                  >
                    <Bold className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineStyle('italic')}
                    className="p-1 rounded-full transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90"
                    title="Italicize selected words"
                  >
                    <Italic className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineStyle('underline')}
                    className="p-1 rounded-full transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90"
                    title="Underline selected words"
                  >
                    <Underline className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineStyle('strikeThrough')}
                    className="p-1 rounded-full transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90"
                    title="Strikethrough selected words"
                  >
                    <Strikethrough className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Text Colors */}
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Ink</span>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyTextColor(c.id)}
                      className="w-3.5 h-3.5 rounded cursor-pointer transition-transform border border-zinc-300 dark:border-zinc-700 opacity-85 hover:opacity-100 active:scale-120"
                      style={{ backgroundColor: theme === 'light' ? c.light : c.dark }}
                      title={`Color selection: ${c.label}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. HIGHLIGHT COLOR POPOVER */}
            {activePopover === 'highlightColor' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 border-b pb-0.5 border-zinc-200 dark:border-zinc-800">
                  <span>Highlight & Background Box</span>
                  <button type="button" onClick={() => setActivePopover(null)} className="cursor-pointer hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 w-8 shrink-0">Color</span>
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyHighlightColor(h.id)}
                      className="w-3.5 h-3.5 rounded cursor-pointer transition-transform border border-zinc-300 dark:border-zinc-700 opacity-85 hover:opacity-100 active:scale-120"
                      style={{
                        backgroundColor: h.id === 'none' ? 'transparent' : (theme === 'light' ? h.light : h.dark),
                        backgroundImage: h.id === 'none' ? 'linear-gradient(45deg, #bbb 25%, transparent 25%, transparent 75%, #bbb 75%), linear-gradient(45deg, #bbb 25%, transparent 25%, transparent 75%, #bbb 75%)' : undefined,
                        backgroundSize: h.id === 'none' ? '6px 6px' : undefined,
                        backgroundPosition: h.id === 'none' ? '0 0, 3px 3px' : undefined,
                      }}
                      title={h.id === 'none' ? 'Clear highlight' : `Highlight selection: ${h.label}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. PRESET (Aa) POPOVER */}
            {activePopover === 'preset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 border-b pb-0.5 border-zinc-200 dark:border-zinc-800">
                  <span>Style Preset</span>
                  <button type="button" onClick={() => setActivePopover(null)} className="cursor-pointer hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { id: 'h1', label: 'Title' },
                    { id: 'h2', label: 'Heading' },
                    { id: 'h3', label: 'Subhead' },
                    { id: 'b1', label: 'Body' },
                    { id: 'b2', label: 'Compact' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const nextStyle = preset.id as NotebookHeadingStyle;
                        updateCurrentPage({ style: nextStyle });
                        saveNotebookUserSettings({ style: nextStyle });
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        currentPage.style === preset.id
                          ? theme === 'light' ? 'bg-black text-white shadow-xs' : 'bg-white text-black shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. FONT SIZE POPOVER */}
            {activePopover === 'fontSize' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 border-b pb-0.5 border-zinc-200 dark:border-zinc-800">
                  <span>Font Size</span>
                  <button type="button" onClick={() => setActivePopover(null)} className="cursor-pointer hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {FONT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        updateCurrentPage({ fontSize: sz });
                        saveNotebookUserSettings({ fontSize: sz });
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        (currentPage.fontSize || 16) === sz
                          ? theme === 'light' ? 'bg-black text-white shadow-xs' : 'bg-white text-black shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM FIXED TOOLBAR (7 EXACT TOOLS FROM NOTE 4.7) ── */}
      <div ref={toolbarRef} className="w-full bg-[#fafafb] dark:bg-[#1a1614] border-t border-black/[0.04] dark:border-white/[0.04] px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-zinc-700 dark:text-zinc-300 select-none">
        {/* Tool 1: Pen / Handwriting Mode (〰️) */}
        <button
          type="button"
          onClick={() => {
            const nextMode = mode === 'pen' ? 'text' : 'pen';
            setMode(nextMode);
            if (nextMode === 'pen') {
              togglePopover('pen');
              resizeCanvas();
            } else {
              setActivePopover(null);
            }
          }}
          className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
            mode === 'pen'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Handwriting Mode"
        >
          <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 16c2-4 4-6 6-6s3 6 5 6 3-8 5-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Tool 2: Text Color & Underline (T̲) */}
        <button
          type="button"
          onPointerDown={(e) => { saveSelection(); e.preventDefault(); }}
          onTouchStart={(e) => { saveSelection(); e.preventDefault(); }}
          onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
          onClick={() => togglePopover('textColor')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer flex flex-col items-center justify-center leading-none ${
            activePopover === 'textColor'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Text Formatting & Color"
        >
          <span className="font-serif font-bold text-xs">T</span>
          <span className="w-3 h-[1.5px] bg-current mt-[1px]" />
        </button>

        {/* Tool 3: Text Background Box (🔲T🔲) */}
        <button
          type="button"
          onPointerDown={(e) => { saveSelection(); e.preventDefault(); }}
          onTouchStart={(e) => { saveSelection(); e.preventDefault(); }}
          onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
          onClick={() => togglePopover('highlightColor')}
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            activePopover === 'highlightColor'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Text Highlight & Background"
        >
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-serif font-bold">
            T
          </span>
        </button>

        {/* Tool 4: Style Preset (Aa) */}
        <button
          type="button"
          onClick={() => togglePopover('preset')}
          className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold cursor-pointer transition-colors ${
            activePopover === 'preset'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Style Preset"
        >
          <span>Aa</span>
        </button>

        {/* Tool 5: Font Size (16) */}
        <button
          type="button"
          onClick={() => togglePopover('fontSize')}
          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium cursor-pointer transition-colors ${
            activePopover === 'fontSize'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Font Size"
        >
          <span>{currentPage?.fontSize || 16}</span>
        </button>
      </div>
    </div>
  );
};
