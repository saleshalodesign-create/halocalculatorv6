import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Apple, Share2 } from 'lucide-react';

interface MobileInstallBannerProps {
  onInstall: () => void;
  onOpenDetails: () => void;
  isStandalone: boolean;
  deferredPrompt: any;
}

export const MobileInstallBanner: React.FC<MobileInstallBannerProps> = ({
  onInstall,
  onOpenDetails,
  isStandalone,
  deferredPrompt,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
    }
  }, []);

  if (isStandalone || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 shadow-md flex items-center justify-between gap-2 z-40 border-b border-white/20">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          {isIOS ? <Apple className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" /> : <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-bold leading-tight truncate">
            {isIOS ? 'Install on iPhone / iPad' : 'Install Halo Design App'}
          </p>
          <p className="text-[9px] sm:text-[10px] text-blue-100 leading-tight truncate">
            {isIOS ? 'Tap Share → "Add to Home Screen"' : 'Fast full-screen & offline quote tool'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onInstall}
          className="px-2.5 sm:px-3 py-1 rounded-lg bg-white text-slate-900 font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
        >
          {isIOS ? <Share2 className="w-3 h-3 text-blue-600" /> : <Download className="w-3 h-3 text-emerald-600" />}
          <span>{isIOS ? 'Install Guide' : (deferredPrompt ? '1-Tap Install' : 'Add to Phone')}</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
