import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, ShieldAlert, CheckCircle, User, Lock, KeyRound, Chrome } from 'lucide-react';
import { TaskTrackerRepository } from '../repositories/TaskTrackerRepository';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Google Registration State
  const [isCompletingGoogleAuth, setIsCompletingGoogleAuth] = useState(false);
  const [tempGoogleUser, setTempGoogleUser] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateInputs = () => {
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!isLogin) {
      if (!fullName.trim()) {
        setError('Full Name is required');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validateInputs()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const profile = await TaskTrackerRepository.loginUser(username, password);
        onAuthSuccess(profile);
      } else {
        const profile = await TaskTrackerRepository.registerUser(fullName, username, password);
        setSuccessMsg('Account created successfully! Auto-logging in...');
        setTimeout(() => {
          onAuthSuccess(profile);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('auth/operation-not-allowed')) {
        setError(
          "Email/Password authentication is not enabled on this Firebase project. " +
          "Please use the 'Sign In with Google' button below, or enable Email/Password Sign-In under Auth Providers in the Firebase Console."
        );
      } else if (err.message?.includes('auth/invalid-credential') || err.message?.includes('auth/user-not-found') || err.message?.includes('auth/wrong-password')) {
        setError('Invalid username or password');
      } else if (err.message?.includes('auth/network-request-failed')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const { profile, firebaseUser } = await TaskTrackerRepository.signInWithGoogle();
      if (profile) {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onAuthSuccess(profile);
        }, 1000);
      } else {
        // Successful sign-in but no TaskFlow profile created yet
        setTempGoogleUser(firebaseUser);
        setFullName(firebaseUser.displayName || '');
        const suggestedUsername = (firebaseUser.email || '')
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-zA-Z0-9_]/g, '');
        setUsername(suggestedUsername);
        setIsCompletingGoogleAuth(true);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('auth/popup-closed-by-user')) {
        setError('Google sign-in popup was closed before completion.');
      } else if (err.message?.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to authenticate with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (!fullName.trim()) {
      setError('Full Name is required');
      return;
    }

    setLoading(true);
    try {
      const profile = await TaskTrackerRepository.completeGoogleRegistration(
        fullName,
        username,
        tempGoogleUser
      );
      setSuccessMsg('Profile completed! Auto-logging in...');
      setTimeout(() => {
        onAuthSuccess(profile);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSandboxMode = () => {
    setError('');
    setSuccessMsg('Initializing Local Sandbox Mode...');
    setLoading(true);
    setTimeout(async () => {
      try {
        TaskTrackerRepository.setLocalMode(true);
        const localUserJson = localStorage.getItem('taskflow_local_user');
        if (localUserJson) {
          const profile = JSON.parse(localUserJson);
          onAuthSuccess(profile);
        } else {
          const profile = await TaskTrackerRepository.registerUser('Sandbox User', 'sandbox', '123456');
          onAuthSuccess(profile);
        }
      } catch (err: any) {
        console.error(err);
        try {
          const profile = await TaskTrackerRepository.loginUser('sandbox', '123456');
          onAuthSuccess(profile);
        } catch (loginErr) {
          setError('Failed to initialize local sandbox user');
        }
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans select-none">
      <div className="absolute inset-0 bg-radial from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative z-10"
        id="auth-card"
      >
        <div className="p-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-8 w-8 rounded-sm bg-indigo-500 flex items-center justify-center text-white font-sans font-bold text-md">
              T
            </div>
            <div>
              <h1 className="text-md font-bold text-slate-900 tracking-tight">TASKFLOW</h1>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Cloud Engine</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mt-6">
            {isCompletingGoogleAuth 
              ? 'Complete your profile'
              : isLogin 
                ? 'Sign in to your account' 
                : 'Create an account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isCompletingGoogleAuth
              ? 'Choose a unique username to finalize your workspace.'
              : isLogin 
                ? 'Enter your username and password below.' 
                : 'Sign up using a custom username and password.'}
          </p>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-rose-50/90 border border-rose-100 text-rose-700 rounded-xl text-xs font-medium flex flex-col gap-3 shadow-xs"
              id="auth-error"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                <div>
                  <span className="font-bold text-[13px] text-rose-800">Authentication Configuration Required</span>
                  {error.includes("Email/Password") ? (
                    <div className="mt-2 space-y-3 text-rose-700 font-normal leading-relaxed">
                      <p>
                        The <strong className="font-semibold text-rose-800">Email/Password</strong> sign-in method is currently disabled on your Firebase project.
                      </p>
                      
                      <div className="bg-white/80 border border-rose-100 rounded-lg p-3 text-[11px] text-slate-700 space-y-1.5 shadow-2xs">
                        <p className="font-bold text-slate-800 uppercase tracking-wide text-[9px] mb-1">To enable this feature (1-minute setup):</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Firebase Console</a></li>
                          <li>Open your project and navigate to <strong className="font-semibold text-slate-800">Build &gt; Authentication &gt; Sign-in method</strong></li>
                          <li>Click <strong className="font-semibold text-slate-800">Add new provider</strong> and select <strong className="font-semibold text-slate-800">Email/Password</strong></li>
                          <li>Enable the main <strong className="font-semibold text-slate-800">Email/Password</strong> toggle and click <strong className="font-semibold text-slate-800">Save</strong></li>
                        </ol>
                      </div>

                      <div className="pt-1 flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-rose-800">Or use a hassle-free, zero-config alternative instantly:</p>
                        <button
                          type="button"
                          onClick={handleLocalSandboxMode}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                          <span>Activate Local Sandbox Mode (Offline & Instant)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-rose-600 leading-normal mt-0.5">{error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2"
              id="auth-success"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {isCompletingGoogleAuth ? (
            /* Google Auth - Complete Profile Form */
            <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4">
              <div className="space-y-1.5" id="group-fullname">
                <label className="text-xs font-semibold text-slate-600" htmlFor="fullName">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5" id="group-username">
                <label className="text-xs font-semibold text-slate-600" htmlFor="username">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="auth-complete-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Complete Workspace Profile</span>
                  )}
                </button>

                <button
                  id="auth-cancel-google-btn"
                  type="button"
                  onClick={() => {
                    setIsCompletingGoogleAuth(false);
                    setTempGoogleUser(null);
                    setError('');
                  }}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 transition-all font-semibold"
                >
                  Cancel and Sign Out
                </button>
              </div>
            </form>
          ) : (
            /* Traditional Username / Password form + Google Button */
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5" id="group-fullname">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="fullName">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        id="fullName"
                        type="text"
                        required
                        placeholder="Nawaf Al-Subaie"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5" id="group-username">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="username">Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <input
                      id="username"
                      type="text"
                      required
                      placeholder="nawaf"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5" id="group-password">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="password">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-1.5" id="group-confirmpass">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isLogin ? (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Sign Up</span>
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-150"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Or</span>
                <div className="flex-grow border-t border-slate-150"></div>
              </div>

              {/* Google Auth Button - Highly recommended 1-click option */}
              <button
                id="auth-google-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <Chrome className="h-4.5 w-4.5 text-red-500" />
                <span>Continue with Google</span>
              </button>

              <button
                id="auth-sandbox-btn"
                type="button"
                onClick={handleLocalSandboxMode}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
              >
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>Enter Local Sandbox Mode (Offline)</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  id="auth-toggle-btn"
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-all cursor-pointer"
                >
                  {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
