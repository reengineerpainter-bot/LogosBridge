import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import appLogo from '../assets/images/logo_logosbridge.png';
import { supabase } from '../supabase';
import { getOrCreateUserProfile, updateUserProfile } from '../utils/supabaseSync';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  X, 
  ShieldCheck,
  Check,
  Edit2,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';

export interface LogosUser {
  uid: string;
  id?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  user_metadata?: Record<string, any>;
}

interface AuthViewProps {
  currentUser?: LogosUser | null;
  onSuccess?: () => void;
  onClose?: () => void;
  onAvatarChange?: (avatarUrl: string) => void;
}

const AVATAR_PRESETS = [
  { label: 'Scriptures', emoji: '📖' },
  { label: 'Dove', emoji: '🕊️' },
  { label: 'Cross', emoji: '✝️' },
  { label: 'Light', emoji: '✨' },
  { label: 'Olive', emoji: '🌿' },
  { label: 'Heart', emoji: '❤️' },
];

export default function AuthView({ currentUser, onSuccess, onClose, onAvatarChange }: AuthViewProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Custom Profile Picture State
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(() => {
    try {
      const active = localStorage.getItem('logosbridge_active_avatar');
      if (active) return active;
      const uid = currentUser?.uid || currentUser?.id;
      if (uid) {
        const uidCached = localStorage.getItem(`logosbridge_avatar_${uid}`);
        if (uidCached) return uidCached;
      }
      return currentUser?.photoURL || null;
    } catch (e) {
      return currentUser?.photoURL || null;
    }
  });
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      try {
        const active = localStorage.getItem('logosbridge_active_avatar');
        const uid = currentUser.uid || currentUser.id;
        const cached = uid ? localStorage.getItem(`logosbridge_avatar_${uid}`) : null;
        const effective = active || cached || currentUser.photoURL;
        if (effective) {
          setCurrentPhoto(effective);
        }
      } catch (e) {
        if (currentUser.photoURL) setCurrentPhoto(currentUser.photoURL);
      }
    }
  }, [currentUser]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              display_name: displayName.trim() || 'Reader',
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await getOrCreateUserProfile(data.user.id, data.user.email || '', displayName.trim() || 'Reader');
        }
        if (data.user && !data.session) {
          // Supabase has email confirmation enabled
          setVerificationSent(true);
          setLoading(false);
          return;
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          await getOrCreateUserProfile(
            data.user.id, 
            data.user.email || '', 
            data.user.user_metadata?.display_name || ''
          );
        }
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('User already registered')) {
        msg = 'An account with this email already exists.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        }
      });
      if (googleError) throw googleError;
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to receive reset instructions.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign out.');
    }
  };

  // Process & Upload Profile Picture (Supports both signed-in and guest users)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      return;
    }

    setIsUpdatingPhoto(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = async () => {
        // Compress & resize to 160x160 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 160;
        canvas.width = size;
        canvas.height = size;

        // Crop center square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        if (ctx) {
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          
          // 1. Immediately persist to localStorage
          try {
            localStorage.setItem('logosbridge_active_avatar', compressedDataUrl);
            if (currentUser) {
              const uid = currentUser.uid || currentUser.id;
              if (uid) {
                localStorage.setItem(`logosbridge_avatar_${uid}`, compressedDataUrl);
              }
            }
          } catch (storageErr) {
            console.warn('Local avatar storage warning:', storageErr);
          }
          
          // 2. Update local state immediately
          setCurrentPhoto(compressedDataUrl);

          // 3. Immediately notify parent app to show the uploaded photo
          if (onAvatarChange) {
            onAvatarChange(compressedDataUrl);
          }

          // Clear file input so the same image can be re-selected if desired
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          if (currentUser) {
            const uid = currentUser.uid || currentUser.id;
            if (uid) {
              try {
                await updateUserProfile(uid, { photoURL: compressedDataUrl });
                await supabase.auth.updateUser({
                  data: { avatar_url: compressedDataUrl }
                });
              } catch (profileErr: any) {
                console.warn('Supabase profile sync note:', profileErr);
              }
            }
          }

          if (onSuccess) {
            onSuccess();
          }
          setIsUpdatingPhoto(false);
        }
      };
      img.onerror = () => {
        setError('Failed to process selected image file.');
        setIsUpdatingPhoto(false);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      setIsUpdatingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  // Select Emoji / SVG Avatar Preset (Supports both signed-in and guest users)
  const handleSelectPreset = async (emoji: string) => {
    setIsUpdatingPhoto(true);
    setError('');
    try {
      // Generate svg data uri for the emoji (~200 chars)
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#0f766e"/><text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-size="64">${emoji}</text></svg>`;
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      
      // 1. Immediately persist to localStorage
      try {
        localStorage.setItem('logosbridge_active_avatar', dataUri);
        if (currentUser) {
          const uid = currentUser.uid || currentUser.id;
          if (uid) {
            localStorage.setItem(`logosbridge_avatar_${uid}`, dataUri);
          }
        }
      } catch (storageErr) {
        console.warn('Local avatar storage warning:', storageErr);
      }

      // 2. Update local state immediately
      setCurrentPhoto(dataUri);

      // 3. Immediately notify parent app
      if (onAvatarChange) {
        onAvatarChange(dataUri);
      }

      if (currentUser) {
        const uid = currentUser.uid || currentUser.id;
        if (uid) {
          try {
            await updateUserProfile(uid, { photoURL: dataUri });
            await supabase.auth.updateUser({
              data: { avatar_url: dataUri }
            });
          } catch (profileErr: any) {
            console.warn('Supabase sync note:', profileErr);
          }
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      let msg = err?.message || 'Failed to set avatar.';
      setError(msg);
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!currentUser || !newDisplayName.trim()) return;
    const uid = currentUser.uid || currentUser.id;
    try {
      const trimmedName = newDisplayName.trim();
      await supabase.auth.updateUser({
        data: { display_name: trimmedName }
      });
      if (uid) {
        await updateUserProfile(uid, { displayName: trimmedName });
      }
      setIsEditingName(false);
      setError('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.warn('Name update notice:', err);
      setIsEditingName(false);
      if (onSuccess) onSuccess();
    }
  };

  // IF ALREADY SIGNED IN: Display Google Material 3 Account Profile Card with Interactive Avatar
  if (currentUser) {
    const cachedPhoto = currentUser ? localStorage.getItem(`logosbridge_avatar_${currentUser.uid}`) : null;
    const photoToShow = currentPhoto || cachedPhoto || currentUser.photoURL;
    return (
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 font-sans">
        {/* Hidden File Input for Image Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        <div className="relative bg-white dark:bg-[#1e1f20] border border-slate-200/80 dark:border-zinc-800 rounded-[28px] shadow-2xl p-6 sm:p-8 overflow-hidden">
          
          {/* Top Tonal Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              
              {/* Interactive Profile Picture with Camera Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingPhoto}
                  className="relative group rounded-2xl cursor-pointer block focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Click to upload or change profile photo"
                >
                  {photoToShow ? (
                    <img 
                      src={photoToShow} 
                      alt="Avatar" 
                      className="w-14 h-14 rounded-2xl border-2 border-emerald-500 shadow-md object-cover group-hover:opacity-85 transition-opacity" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xl border border-emerald-300 dark:border-emerald-700 shadow-sm group-hover:opacity-85 transition-opacity">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}

                  {/* Camera overlay badge */}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-lg shadow-sm border border-white dark:border-zinc-900 group-hover:scale-110 transition-transform">
                    {isUpdatingPhoto ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </div>
                </button>
              </div>

              <div className="flex flex-col flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="text-sm font-bold bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-xl border border-amber-400 focus:outline-none w-36"
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={handleSaveDisplayName}
                      className="p-1 rounded-lg bg-amber-500 text-slate-950"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 leading-tight">
                      {currentUser.displayName || 'LogosBridge Reader'}
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[200px]">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Avatar Presets & Custom Photo Selector */}
          <div className="mt-5 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Profile Photo & Avatar
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingPhoto}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Upload Custom</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {/* Direct Upload Tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingPhoto}
                className="h-10 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                title="Upload image from device"
              >
                {isUpdatingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Upload</span>
              </button>

              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset.emoji)}
                  disabled={isUpdatingPhoto}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-base transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  title={preset.label}
                >
                  {preset.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Error Alert if any */}
          {error && (
            <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cloud Synchronization Status Badge */}
          <div className="my-5 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                Cloud Sync Active
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                Your notes, highlights, and reading positions sync seamlessly to your account.
              </span>
            </div>
          </div>

          {/* Continue to Scripture Study Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full mb-3 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Continue to Scripture Study</span>
            </button>
          )}

          {/* Sign Out Button (Material 3 Tonal Button) */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  // SIGN IN / SIGN UP MATERIAL 3 FORM
  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 font-sans">
      <div className="relative bg-white dark:bg-[#1e1f20] border border-slate-200/80 dark:border-zinc-800 rounded-[32px] shadow-2xl p-6 sm:p-8 overflow-hidden transition-all">

        {/* Email Verification Sent Notice */}
        {verificationSent && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-left text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1 text-sm">
                Account Created Successfully!
              </span>
              <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed mb-2">
                A verification link was sent to <span className="font-semibold underline">{email}</span>. Please click the link to confirm your account and sign in.
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 italic">
                Tip: You can also disable "Confirm email" in your Supabase dashboard under Authentication &gt; Providers &gt; Email for instant sign-ins without email links.
              </p>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-amber-500/10 p-2">
            <img src={appLogo} alt="LogosBridge" className="w-full h-full object-contain drop-shadow" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            {isForgotPassword ? 'Reset Password' : tab === 'signin' ? 'Welcome to LogosBridge' : 'Create an Account'}
          </h2>
          <p className="text-xs sm:text-sm font-serif italic text-amber-600 dark:text-amber-400 font-semibold mt-1 tracking-wide">
            “Bridging the gap between evidence and assurance”
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link' 
              : 'Sign in to sync your study notes and highlights across all devices'}
          </p>
        </div>

        {/* Google Material 3 Segmented Switcher */}
        {!isForgotPassword && (
          <div className="flex p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl mb-6 border border-slate-200/50 dark:border-zinc-700/50">
            <button
              type="button"
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                tab === 'signin'
                  ? 'bg-white dark:bg-[#2b2c2e] text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                tab === 'signup'
                  ? 'bg-white dark:bg-[#2b2c2e] text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Google Sign-In Button (Disabled on mobile native to prevent localhost redirect errors) */}
        {!isForgotPassword && !Capacitor.isNativePlatform() && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-[#282a2c] hover:bg-slate-50 dark:hover:bg-[#313336] text-slate-700 dark:text-zinc-200 font-bold text-sm border border-slate-300 dark:border-zinc-700 flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{tab === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>

            {/* M3 Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-xs uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">or with email</span>
              <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Reset Alert */}
        {resetSent && isForgotPassword && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Reset Email Sent</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Check your inbox at <strong>{email}</strong> for instructions.
            </p>
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
              className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isForgotPassword ? handleResetPassword : handleEmailAuth} className="space-y-4">
          
          {/* Full Name field (Sign Up only) */}
          {tab === 'signup' && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 pl-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Johnathan"
                  required
                  className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Address field */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 pl-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1.5 pl-1">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                  Password
                </label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(''); }}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 rounded-2xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password field (Sign Up only) */}
          {tab === 'signup' && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 pl-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </span>
            ) : isForgotPassword ? (
              <span>Send Reset Instructions</span>
            ) : tab === 'signin' ? (
              <span>Sign In with Email</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          {/* Back button for Forgot Password */}
          {isForgotPassword && (
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(''); }}
              className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          )}

          {/* Guest Dismiss Option */}
          {onClose && !isForgotPassword && (
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Skip & Continue as Guest
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
