import React, { useState } from 'react';
import { AuthContextType } from '../hooks/useFirebaseAuth';
import { GoogleIcon } from './GoogleIcon';
import {
  CloudCheck,
  LogOut,
  Lock,
  Key,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  ShieldCheck,
  AlertCircle,
  Check,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthContextType;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  auth,
}) => {
  const {
    user,
    loading,
    accounts,
    cloudQuotes,
    signInWithCredentials,
    changeAccountPassword,
    signOut,
  } = auth;

  // View state: 'login' | 'switch' | 'new_account' | 'change_password' | 'profile'
  const [selectedEmail, setSelectedEmail] = useState<string>(
    user?.email || (accounts.length > 0 ? accounts[0].email : 'sales.halodesign@gmail.com')
  );
  const [customEmail, setCustomEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isNewAccountMode, setIsNewAccountMode] = useState<boolean>(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState<boolean>(false);

  // Password Change state
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleLogin = async (emailToUse: string) => {
    setErrorMessage('');
    if (!emailToUse.trim()) {
      setErrorMessage('Please provide a Google Account email.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your authorization password.');
      return;
    }

    const res = await signInWithCredentials(emailToUse, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Authentication failed. Please check your password.');
    } else {
      setPassword('');
      setIsSwitchingAccount(false);
      setIsNewAccountMode(false);
    }
  };

  const handlePasswordUpdate = () => {
    setErrorMessage('');
    setPasswordSuccessMessage('');
    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    const ok = changeAccountPassword(newPassword);
    if (ok) {
      setPasswordSuccessMessage('Authorization password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccessMessage('');
      }, 1500);
    } else {
      setErrorMessage('Failed to update password. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#181920] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* macOS Window Top Bar */}
        <div className="h-10 px-4 bg-slate-100/90 dark:bg-[#141518] border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 flex items-center justify-center text-black/60 transition-transform active:scale-90"
              title="Close"
            ></button>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F]"></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-200">
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Google Account Authorization & Security</span>
          </div>
          <div className="w-12"></div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto mac-scrollbar flex-1">
          {user && !isSwitchingAccount ? (
            /* Logged In Profile View */
            <div className="space-y-4">
              {/* Account Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10">
                <div className="relative">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full border-2 border-blue-500 shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {user.displayName?.[0]?.toUpperCase() || 'H'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-neutral-800 p-0.5 shadow border border-black/5 dark:border-white/10 flex items-center justify-center">
                    <GoogleIcon className="w-full h-full" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {user.displayName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wide flex items-center gap-1 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Authorized
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Live Cloud Sync Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                    Account Quotes
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                    {cloudQuotes.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                    Security Level
                  </span>
                  <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Password Protected
                  </div>
                </div>
              </div>

              {/* Password Change Dropdown */}
              {!isChangingPassword ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                        Account Password
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Authorization password required for logging into this account
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsChangingPassword(true);
                      setErrorMessage('');
                      setPasswordSuccessMessage('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-100/90 dark:bg-[#202128] border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-500" /> Set New Authorization Password
                    </span>
                    <button
                      onClick={() => setIsChangingPassword(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                    >
                      Cancel
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {passwordSuccessMessage && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordSuccessMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#121316] border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#121316] border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handlePasswordUpdate}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors"
                  >
                    Save New Password
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsSwitchingAccount(true);
                      setPassword('');
                      setErrorMessage('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-white/10 shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" /> Switch Google Account
                  </button>

                  <button
                    onClick={() => {
                      signOut();
                      setIsSwitchingAccount(true);
                      setPassword('');
                      setErrorMessage('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Login & Password Authorization Form */
            <div className="space-y-4">
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#202128] shadow-lg border border-slate-200 dark:border-white/10 flex items-center justify-center">
                  <GoogleIcon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Google Account Authorization
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Select or enter your Google Account email and authorize with your password to access your cloud quotes and custom rate formulas.
                </p>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Account Selection / Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-neutral-300">
                    {isNewAccountMode ? 'Enter Google Email' : 'Choose Account'}
                  </span>
                  <button
                    onClick={() => {
                      setIsNewAccountMode(!isNewAccountMode);
                      setErrorMessage('');
                      setPassword('');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    {isNewAccountMode ? (
                      <>
                        <Users className="w-3 h-3" /> Select Saved Account
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" /> + Add Another Account
                      </>
                    )}
                  </button>
                </div>

                {!isNewAccountMode ? (
                  /* Saved Accounts List */
                  <div className="space-y-2 max-h-48 overflow-y-auto mac-scrollbar">
                    {accounts.map(acc => {
                      const isSelected = selectedEmail === acc.email;
                      return (
                        <div
                          key={acc.email}
                          onClick={() => {
                            setSelectedEmail(acc.email);
                            setErrorMessage('');
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                              {acc.displayName[0] || 'G'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {acc.displayName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono block truncate">
                                {acc.email}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {acc.passwordHash && (
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono hidden sm:inline">
                                protected
                              </span>
                            )}
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500 text-white'
                                  : 'border-slate-300 dark:border-white/20'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Custom Google Email Input */
                  <div>
                    <input
                      type="email"
                      placeholder="e.g. employee@halodesign.com or client@gmail.com"
                      value={customEmail}
                      onChange={e => {
                        setCustomEmail(e.target.value);
                        setErrorMessage('');
                      }}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Password Input (Mandatory for Authorisation) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Authorization Password</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-400">
                      Default: <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">halo123</code> or <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">admin123</code>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account authorization password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setErrorMessage('');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleLogin(isNewAccountMode ? customEmail : selectedEmail);
                        }
                      }}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <div className="pt-2 space-y-2">
                <button
                  disabled={loading}
                  onClick={() => handleLogin(isNewAccountMode ? customEmail : selectedEmail)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Authorizing Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Authorize & Sign In
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </button>

                {user && (
                  <button
                    onClick={() => {
                      setIsSwitchingAccount(false);
                      setErrorMessage('');
                    }}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors"
                  >
                    Cancel & Return to Current Session ({user.email})
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Each Google Account keeps its own private quotation history, customer records, and custom multiplier formulas stored safely.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
