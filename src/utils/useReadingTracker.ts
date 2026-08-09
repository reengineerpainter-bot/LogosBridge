import { useEffect, useState, useRef, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ReadingHistory } from '../types';

export function useReadingTracker(currentBook: string, currentChapter: number) {
  const [isRead, setIsRead] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Function to mark a chapter as read
  const markAsRead = useCallback(async () => {
    console.log("markAsRead called", { currentBook, currentChapter, isRead });
    if (isRead) return;

    try {
      setIsRead(true);
      const timestamp = Date.now();
      const readData: ReadingHistory = {
        book: currentBook,
        chapter: currentChapter,
        readAt: timestamp
      };

      // Try saving to Firebase
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'reading_history', `${currentBook}_${currentChapter}`);
        await setDoc(docRef, readData);
      }
      
      // Also save to local storage as fallback/quick access
      const localHistory = JSON.parse(localStorage.getItem('logosbridge_reading_history') || '{}');
      localHistory[`${currentBook}_${currentChapter}`] = readData;
      localStorage.setItem('logosbridge_reading_history', JSON.stringify(localHistory));

      // Trigger Notification Logic
      if (Capacitor.isNativePlatform()) {
        try {
          const permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            const requested = await LocalNotifications.requestPermissions();
            if (requested.display !== 'granted') {
              return; // User denied
            }
          }

          // Schedule a returning notification
          await LocalNotifications.schedule({
            notifications: [
              {
                title: 'Continue your study',
                body: `You recently read ${currentBook} ${currentChapter}. Ready to continue?`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24) }, // 24 hours from now
                sound: undefined,
                attachments: undefined,
                actionTypeId: '',
                extra: null
              }
            ]
          });
        } catch (e) {
          console.warn("LocalNotifications error:", e);
        }
      }

    } catch (err) {
      console.error("Failed to mark chapter as read:", err);
    }
  }, [currentBook, currentChapter, isRead]);

  // Use an IntersectionObserver to detect when user scrolls to the bottom of the chapter
  const [bottomNodes, setBottomNodes] = useState<HTMLDivElement[]>([]);
  
  const bottomRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setBottomNodes(prev => {
        if (!prev.includes(node)) return [...prev, node];
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    setIsRead(false); // Reset when book/chapter changes
    
    // Check if already read in local storage to prevent duplicate calls
    const localHistory = JSON.parse(localStorage.getItem('logosbridge_reading_history') || '{}');
    if (localHistory[`${currentBook}_${currentChapter}`]) {
      setIsRead(true);
    }
    
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      const isAnyIntersecting = entries.some(e => e.isIntersecting);
      console.log("IntersectionObserver triggered", isAnyIntersecting, "isRead:", isRead);
      if (isAnyIntersecting && !isRead) {
        markAsRead();
      }
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    if (bottomNodes.length > 0) {
      console.log("Observer attaching to nodes", bottomNodes);
      bottomNodes.forEach(node => observerRef.current?.observe(node));
    } else {
      console.log("No bottom nodes found to attach observer");
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [currentBook, currentChapter, markAsRead, isRead, bottomNodes]);

  return { bottomRef, isRead };
}
