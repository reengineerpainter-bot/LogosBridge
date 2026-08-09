import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Lock, Mail, User, Chrome, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface AuthViewProps {
  onSuccess: () => void;
}

export default function AuthView({ onSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const saveUserToFirestore = async (user: any, displayName: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: displayName || user.displayName || 'New User',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
      } else {
        await setDoc(userRef, {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin && password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(cred.user, cred.user.displayName || '');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(cred.user, name);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await saveUserToFirestore(cred.user, cred.user.displayName || '');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 flex items-center justify-center p-6 selection:bg-amber-500/30 selection:text-amber-100 font-sans relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] bg-yellow-500/5 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-stone-700/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-6 border border-amber-300/30">
            <Lock className="w-8 h-8 text-slate-950" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-300">
            {isForgotPassword ? 'Reset Password' : 'Sign-in or create an account'}
          </h2>
          <p className="text-amber-200/60 font-medium text-sm md:text-base px-4">
            {isForgotPassword ? 'Enter your email to receive a password reset link.' : 'continue your spiritual walk and journey.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#18181b]/80 backdrop-blur-xl border border-amber-900/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle gold accent line at top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 opacity-50" />

          {resetSent && isForgotPassword ? (
            <div className="text-center p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-green-400 font-bold mb-2">Check your email</h3>
              <p className="text-green-400/80 text-sm">We've sent a password reset link to {email}.</p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                }}
                className="mt-4 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Back to Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={isForgotPassword ? handleResetPassword : handleEmailAuth} className="space-y-5">
              
              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin && !isForgotPassword}
                      className="w-full bg-[#09090b]/80 border border-amber-900/30 text-slate-100 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#09090b]/80 border border-amber-900/30 text-slate-100 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-slate-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-[#09090b]/80 border border-amber-900/30 text-slate-100 rounded-2xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setError('');
                          }}
                          className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-slate-500" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          autoComplete="new-password"
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full bg-[#09090b]/80 border border-amber-900/30 text-slate-100 rounded-2xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
                  <div className="mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-red-400 text-sm font-medium">
                    {error}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    {isForgotPassword ? (
                      <Mail className="w-5 h-5" />
                    ) : isLogin ? (
                      <LogIn className="w-5 h-5" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                    {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
          )}


        </div>

        {/* Toggle Mode */}
        {!isForgotPassword && (
          <div className="text-center mt-8">
            <p className="text-slate-400 text-sm font-medium">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => { 
                  setIsLogin(!isLogin); 
                  setError(''); 
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
