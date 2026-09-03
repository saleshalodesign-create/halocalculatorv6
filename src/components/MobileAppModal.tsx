import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  X,
  Share2,
  PlusSquare,
  Layers,
  Apple,
  Chrome,
  Compass,
} from 'lucide-react';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'capacitor'>('ios');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Detect platform automatically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isAndroid = /android/.test(ua);
      if (isIOS) {
        setActiveTab('ios');
      } else if (isAndroid) {
        setActiveTab('android');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  const downloadCapacitorConfig = () => {
    const config = {
      appId: 'com.halodesignhub.calculator',
      appName: 'Halo Design Hub',
      webDir: 'dist',
      bundledWebRuntime: false,
      server: {
        androidScheme: 'https',
      },
      android: {
        allowMixedContent: true,
        backgroundColor: '#0c0d0f',
      },
      ios: {
        scheme: 'Halo Design Hub',
      },
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacitor.config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-[#181920]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-lg text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                Install Mobile App
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  iPhone & Android
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400">
                Install on iOS Safari, Android Chrome, or export native package
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-3 sm:px-5 pt-2 sm:pt-3 flex gap-1 sm:gap-2 border-b border-slate-200/80 dark:border-white/10 overflow-x-auto mac-scrollbar">
          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ios'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Apple className="w-4 h-4" /> iPhone & iPad
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'android'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Chrome className="w-4 h-4" /> Android
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'capacitor'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Native APK / Xcode
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto mac-scrollbar space-y-3.5 text-xs sm:text-sm">
          {/* Standalone Status Banner */}
          {isStandalone && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>Halo Design Hub is currently running in standalone Native App mode!</span>
            </div>
          )}

          {/* TAB 1: IPHONE & IPAD */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 text-white shadow-lg border border-blue-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                      <Apple className="w-4 h-4 text-white" />
                      Install on iPhone / iPad
                    </h4>
                    <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5">
                      iOS Safari requires adding to Home Screen via the Share menu.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Visual Step-by-Step for iPhone */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Follow these 3 simple steps in Safari:
                </h5>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 dark:text-neutral-200 font-semibold">
                        Open in Safari
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400">
                        Make sure you are viewing this page in <strong>Safari</strong> (not Chrome/Firefox on iOS, as Apple restricts PWA installs to Safari).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 dark:text-neutral-200 font-semibold flex items-center gap-1.5">
                        Tap the Share Button <Share2 className="w-3.5 h-3.5 text-blue-500" />
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400">
                        Tap the square icon with an upward arrow at the bottom center (or top toolbar on iPad).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 dark:text-neutral-200 font-semibold flex items-center gap-1.5">
                        Tap "Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 text-blue-500" />
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400">
                        Scroll down the menu, tap <strong>"Add to Home Screen"</strong>, then tap <strong>"Add"</strong> in the top right corner.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* iPhone Benefits Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Offline Pricing</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Full Notch / Island Support</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base">Instant Android Installation</h4>
                    <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
                      Adds full-screen launcher icon with offline calculations and fast start.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                </div>

                <button
                  onClick={onTriggerInstall}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-white text-emerald-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  {deferredPrompt ? 'Tap Here to Install App' : '1-Tap Add to Home Screen'}
                </button>

                {!deferredPrompt && (
                  <div className="mt-2 text-[10px] text-emerald-100/90 bg-emerald-700/40 p-2 rounded-lg border border-emerald-400/20">
                    💡 If the native prompt doesn't pop up immediately, tap the Chrome menu <strong>(⋮)</strong> and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                )}
              </div>

              {/* Instructions steps for Android */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  How to install via Android Chrome / Samsung Browser:
                </h5>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-700 dark:text-neutral-300">
                      Open this URL in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-700 dark:text-neutral-300">
                      Tap the top-right menu <strong>(⋮)</strong> or the browser install icon in the URL bar.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-700 dark:text-neutral-300">
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAPACITOR / NATIVE APK & XCODE */}
          {activeTab === 'capacitor' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-slate-600 dark:text-neutral-300 leading-relaxed text-xs">
                To build standalone app store packages (<strong>.apk</strong> / <strong>.aab</strong> for Google Play, or <strong>Xcode iOS IPA</strong> for Apple App Store) with Capacitor:
              </p>

              <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] sm:text-xs space-y-1.5 overflow-x-auto select-text">
                <div className="text-slate-400"># 1. Install Capacitor in project:</div>
                <div>npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios</div>
                <div className="text-slate-400 mt-2"># 2. Build & sync platforms:</div>
                <div>npm run build</div>
                <div>npx cap add android</div>
                <div>npx cap add ios</div>
                <div>npx cap open android   # opens in Android Studio</div>
                <div>npx cap open ios       # opens in Xcode</div>
              </div>

              <div className="pt-1">
                <button
                  onClick={downloadCapacitorConfig}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  {downloadSuccess ? 'capacitor.config.json Downloaded!' : 'Download capacitor.config.json'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold text-xs hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
