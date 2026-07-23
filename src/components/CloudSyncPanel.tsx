/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  CloudOff,
  Database,
  LogOut,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Award,
  Bookmark,
  ExternalLink,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  getOrCreateUserProfile,
  getUserBookmarks,
  getUserQuizScores,
  syncBookmarks,
  BookmarkData,
  QuizScoreData,
  UserProfileData
} from '../utils/firebaseSync';

interface CloudSyncPanelProps {
  theme: 'light' | 'dark';
  isOpen: boolean;
  onClose: () => void;
  localBookmarks: Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>;
  onSyncBookmarksFromCloud: (cloudBookmarks: Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>) => void;
}

export default function CloudSyncPanel({
  theme,
  isOpen,
  onClose,
  localBookmarks,
  onSyncBookmarksFromCloud
}: CloudSyncPanelProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);
  const [quizzesCount, setQuizzesCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Monitor Auth Status Change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        setSyncStatus('idle');
        setSyncError(null);
        await handleInitialUserLoad(currentUser);
      } else {
        setProfile(null);
        setBookmarksCount(0);
        setQuizzesCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch initial stats and trigger automatic cloud-sync
  const handleInitialUserLoad = async (firebaseUser: FirebaseUser) => {
    setIsSyncing(true);
    try {
      // 1. Get or Create profile
      const userProfile = await getOrCreateUserProfile(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.displayName || 'Google Scholar'
      );
      setProfile(userProfile);

      // 2. Perform automated dynamic bookmarks synchronisation
      const reconciled = await syncBookmarks(firebaseUser.uid, localBookmarks);
      
      // Update local state in the parent app
      const parentCompatibleBookmarks = reconciled.map(b => ({
        book: b.book,
        chapter: b.chapter,
        verse: b.verse,
        color: b.color,
        notes: b.notes || ''
      }));
      onSyncBookmarksFromCloud(parentCompatibleBookmarks);
      setBookmarksCount(reconciled.length);

      // 3. Fetch Quiz Score count
      const quizzes = await getUserQuizScores(firebaseUser.uid);
      setQuizzesCount(quizzes.length);
      
      setSyncStatus('success');
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncError(err.message || 'Verification / connection failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Explicit Trigger to Sync
  const handleManualSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncError(null);
    try {
      const reconciled = await syncBookmarks(user.uid, localBookmarks);
      const parentCompatibleBookmarks = reconciled.map(b => ({
        book: b.book,
        chapter: b.chapter,
        verse: b.verse,
        color: b.color,
        notes: b.notes || ''
      }));
      onSyncBookmarksFromCloud(parentCompatibleBookmarks);
      setBookmarksCount(reconciled.length);

      const quizzes = await getUserQuizScores(user.uid);
      setQuizzesCount(quizzes.length);

      setSyncStatus('success');
      playHapticTone(600, 0.1);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncError(err.message || 'Synchronisation interrupted due to security validation or storage limit');
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Log In Selector
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncError(
        err.message?.includes('popup-blocked')
          ? 'Login popup was blocked by browser. Please allow popups or open the app in a new tab!'
          : err.message || 'Google Auth Popup terminated.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Log Out Trigger
  const handleSignOut = async () => {
    setIsSyncing(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Audio utility feedback
  const playHapticTone = (freq = 440, duration = 0.08) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(freq, context.currentTime);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      osc.start();
      osc.stop(context.currentTime + duration);
    } catch (e) {
      // ignore audio context failures
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop Glass shader */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm"
          />

          {/* Sync Core Sidebar */}
          <motion.div
            id="cloud-sync-sidebar"
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150 }}
            className={`relative w-full max-w-md h-full shadow-2xl flex flex-col border-l z-50 ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-[#0a0f1d] border-cyan-950/60 text-slate-200'
            }`}
          >
            {/* Header top row */}
            <div className={`p-5 border-b flex items-center justify-between ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#060a13] border-cyan-950/40'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg ${
                  theme === 'light' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50'
                }`}>
                  <Database className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-wider uppercase">Cloud Sync Manager</h3>
                  <p className="text-[10px] font-mono text-cyan-500 tracking-wider">SECURE FIRESTORE ENGINE</p>
                </div>
              </div>
              <button
                id="cloud-sync-close-btn"
                onClick={onClose}
                className={`p-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                  theme === 'light'
                    ? 'hover:bg-slate-200 bg-slate-100 border-slate-300/60 text-slate-600'
                    : 'hover:bg-cyan-950 hover:text-cyan-400 border-cyan-900/40 text-slate-400'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Main Sync Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isAuthLoading ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                  <p className="text-xs font-mono text-slate-505 dark:text-slate-400">Pinging Security Gateways...</p>
                </div>
              ) : !user ? (
                /* GUEST / LOGOUT VIEW */
                <div className="space-y-6">
                  {/* Explanation card */}
                  <div className={`p-5 rounded-xl border leading-relaxed space-y-4 ${
                    theme === 'light'
                      ? 'bg-cyan-50/50 border-cyan-100 text-slate-700'
                      : 'bg-cyan-950/20 border-cyan-900/40 text-slate-300'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <Lock className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-500">Enable Scholar Cloud Sync</h4>
                        <p className="text-xs mt-1.5">
                          Create an account to securely persist your Bible bookmarks, custom study notes, color highlighted verses, and theology quiz scoreboards.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Invariants Highlights */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Cloud Safety Guarantees</h5>
                    <div className={`p-4 rounded-xl border text-xs gap-3 flex flex-col ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-cyan-950/30'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>**Attribute-Based Access Lock**: Only your specific account profile can read/write your bookmarks.</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>**Immutable Quizzes**: Your theological quiz results are fully preserved as tamper-proof historical logs.</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>**Zero-Trust Integration**: Fully compliant Firestore rules secure all data nodes.</span>
                      </div>
                    </div>
                  </div>

                  {/* Active authentication trigger */}
                  <div className="pt-4 space-y-3">
                    <button
                      id="cloud-sign-in-btn"
                      onClick={signInWithGoogle}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center space-x-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-550 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all duration-250 hover:shadow-lg shadow-cyan-500/25 active:scale-98 cursor-pointer border border-transparent disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cloud className="w-4 h-4" />
                      )}
                      <span>CONNECT GOOGLE SCHOLAR ACCOUNT</span>
                    </button>
                    
                    {/* Sandbox iframe warning tip */}
                    <div className="text-center p-3 border border-dashed rounded-lg border-amber-500/30 bg-amber-500/5 text-[10px] text-amber-500 leading-relaxed font-mono">
                      ⚠️ Note: Popups may be blocked in some browser sandboxes. If authentication hangs or fails, click 
                      <span className="font-bold underline cursor-pointer mx-1 flex items-center justify-center inline-flex gap-0.5" onClick={() => window.open(window.location.href, '_blank')}>
                        Open in New Tab <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                      to connect cleanly!
                    </div>
                  </div>
                </div>
              ) : (
                /* SIGNED IN PROFILE VIEW */
                <div className="space-y-6">
                  {/* Connected Status Card */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    theme === 'light' ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-950/15 border-emerald-900/30'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
                      <div className="w-3 h-3 bg-emerald-500 rounded-full z-10" />
                      <span className="text-xs font-mono font-bold text-emerald-500">LIVE CLOUD SYNCHRONISED</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 capitalize">
                      UID: {user.uid.slice(0, 6)}...
                    </div>
                  </div>

                  {/* Profile Summary Card */}
                  <div className={`p-5 rounded-2xl border flex items-center space-x-4 ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#111726] border-cyan-950/50'
                  }`}>
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Scholar'}
                        className="w-12 h-12 rounded-full border-2 border-cyan-500 shrink-0 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-900 flex items-center justify-center font-display font-medium text-lg shrink-0">
                        {user.displayName ? user.displayName[0].toUpperCase() : 'S'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-bold text-sm truncate">{user.displayName || 'Google Scholar'}</h4>
                      <p className={`text-xs truncate ${theme === 'light' ? 'text-slate-505' : 'text-slate-400'}`}>{user.email}</p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-mono text-emerald-500">Google Verified Profile</span>
                      </div>
                    </div>
                  </div>

                  {/* Synchronised Nodes & Stats Card */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Synchronised Collections</h5>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className={`p-4 rounded-xl border flex flex-col ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200/80' : 'bg-[#0f1424]/40 border-cyan-950/45'
                      }`}>
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Bookmark className="w-3.5 h-3.5 text-cyan-500" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Bookmarks</span>
                        </div>
                        <span className="text-2xl font-display font-black text-cyan-500">{bookmarksCount}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Verses Saved</span>
                      </div>

                      <div className={`p-4 rounded-xl border flex flex-col ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200/80' : 'bg-[#0f1424]/40 border-cyan-950/45'
                      }`}>
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Theology Quiz</span>
                        </div>
                        <span className="text-2xl font-display font-black text-amber-500">{quizzesCount}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">History Logs Stored</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Synchronization Action */}
                  <div className="space-y-3 pt-2">
                    <button
                      id="cloud-sync-now-btn"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className={`w-full flex items-center justify-center space-x-2 border font-mono font-bold text-xs py-3 rounded-xl transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-cyan-950/40 border-cyan-900/60 text-cyan-400 hover:bg-cyan-950/80'
                      }`}
                    >
                      {isSyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>SYNC WITH CLOUD LIBRARY NOW</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sync feedback panel */}
              {syncStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl border flex items-start space-x-2.5 ${
                    syncStatus === 'success'
                      ? (theme === 'light' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400')
                      : (theme === 'light' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-rose-950/10 border-rose-900/30 text-rose-400')
                  }`}
                >
                  {syncStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-tight">
                    <span className="text-xs font-bold font-mono">
                      {syncStatus === 'success' ? 'Synchronisation Complete' : 'Synchronisation Blocked'}
                    </span>
                    <p className="text-[11px] mt-1 text-opacity-80">
                      {syncStatus === 'success'
                        ? 'Your offline notes, annotations and quiz results are actively synced under high-contrast security policies.'
                        : syncError}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Logout bottom area */}
            {user && (
              <div className={`p-5 border-t flex justify-end ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#060a13] border-cyan-950/40'
              }`}>
                <button
                  id="cloud-sign-out-btn"
                  onClick={handleSignOut}
                  className={`flex items-center space-x-1.5 p-2 px-4 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                    theme === 'light'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-rose-950/20 border-rose-900/40 text-rose-400 hover:bg-rose-950/50'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>LOG OUT ACCOUNT</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
