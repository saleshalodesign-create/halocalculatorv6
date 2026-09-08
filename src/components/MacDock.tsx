import React from 'react';
import { Theme, ThemeType, UserProfile } from '../types';
import { GoogleIcon } from './GoogleIcon';
import {
  FileText,
  Sparkles,
  Sun,
  Moon,
  Calculator,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MacDockProps {
  quoteCount: number;
  onOpenQuoteList: () => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  wallpaper: string;
  setWallpaper: (wp: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenMobileApp?: () => void;
  onOpenMathCalc: () => void;
  onOpenShapeModal?: () => void;
  shapeType?: 'horizontal' | 'vertical' | 'square' | 'invalid';
  shapeLabel?: string;
}

export const MacDock: React.FC<MacDockProps> = ({
  quoteCount,
  onOpenQuoteList,
  theme,
  setTheme,
  wallpaper,
  setWallpaper,
  user,
  onOpenAuth,
  onOpenMobileApp,
  onOpenMathCalc,
  onOpenShapeModal,
  shapeType = 'horizontal',
  shapeLabel = 'Horizontal',
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const wallpapersList = ['sequoia', 'sonoma', 'dark', 'silver'];

  const nextWallpaper = () => {
    const idx = wallpapersList.indexOf(wallpaper);
    const next = wallpapersList[(idx + 1) % wallpapersList.length];
    setWallpaper(next);
  };

  const cycleTheme = () => {
    if (theme === Theme.DARK) {
      setTheme(Theme.LIGHT);
    } else {
      setTheme(Theme.DARK);
    }
  };

  const getThemeButtonDetails = () => {
    if (theme === Theme.LIGHT) {
      return {
        icon: <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-900" />,
        label: t.nav.light,
        bg: 'bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 shadow-amber-400/40',
        title: `${t.nav.themeTitle}: ${t.nav.light}`,
      };
    }
    return {
      icon: <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-200" />,
      label: t.nav.dark,
      bg: 'bg-gradient-to-tr from-indigo-950 via-indigo-900 to-purple-800 shadow-indigo-900/40',
      title: `${t.nav.themeTitle}: ${t.nav.dark}`,
    };
  };

  const themeDetails = getThemeButtonDetails();

  return (
    <div className="fixed bottom-safe left-1/2 -translate-x-1/2 z-40 pointer-events-none pb-1 sm:pb-2 gpu-layer">
      <div className="flex items-center gap-1 sm:gap-2.5 px-2 sm:px-3.5 py-1 sm:py-1.5 bg-white/80 dark:bg-black/70 backdrop-blur-md border border-white/60 dark:border-white/15 rounded-2xl sm:rounded-[22px] shadow-lg shadow-black/20 transition-all duration-200 pointer-events-auto max-w-[96vw]">
        {/* Quotations & Invoices Tab */}
        <button
          onClick={onOpenQuoteList}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={t.dock.quotes}
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/30 border border-white/30 relative">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            {quoteCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.2 min-w-[15px] sm:min-w-[18px] h-[15px] sm:h-[18px] bg-red-500 text-white font-bold text-[9px] sm:text-[10px] rounded-full flex items-center justify-center border-1.5 sm:border-2 border-white shadow-md">
                {quoteCount}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {t.dock.quotes} ({quoteCount})
          </span>
        </button>

        <div className="w-px h-6 sm:h-8 bg-black/10 dark:bg-white/20 my-auto mx-0.5 sm:mx-1"></div>

        {/* Google Cloud Account Button */}
        <button
          onClick={onOpenAuth}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={user ? `Google Account: ${user.email}` : t.nav.signInGoogle}
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white dark:bg-[#202028] flex items-center justify-center shadow-md shadow-black/10 border border-slate-200 dark:border-white/20 relative">
            <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            {user && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#202028] absolute -top-0.5 -right-0.5 shadow"></span>
            )}
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {user ? t.dock.cloud : t.dock.login}
          </span>
        </button>

        {/* iOS Calculator Button */}
        <button
          onClick={onOpenMathCalc}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={t.dock.calc}
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#1c1c1e] border border-white/25 flex items-center justify-center shadow-lg shadow-black/40 relative overflow-hidden">
            <div className="grid grid-cols-2 gap-0.5 sm:gap-1 p-1 sm:p-1.5 w-full h-full">
              <span className="bg-[#a5a5a5] text-black text-[7px] sm:text-[9px] font-bold rounded-full flex items-center justify-center">±</span>
              <span className="bg-[#ff9f0a] text-white text-[7px] sm:text-[9px] font-bold rounded-full flex items-center justify-center">÷</span>
              <span className="bg-[#333333] text-white text-[7px] sm:text-[9px] font-bold rounded-full flex items-center justify-center">7</span>
              <span className="bg-[#ff9f0a] text-white text-[7px] sm:text-[9px] font-bold rounded-full flex items-center justify-center">=</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {t.dock.calc}
          </span>
        </button>

        {/* Lightbox Shape Visualizer Button - RIGHT BESIDE CALCULATOR */}
        {onOpenShapeModal && (
          <button
            onClick={onOpenShapeModal}
            className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
            title={`${t.dock.shape} (${shapeLabel})`}
          >
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 border border-white/30 relative overflow-hidden">
              {shapeType === 'horizontal' ? (
                <RectangleHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : shapeType === 'vertical' ? (
                <RectangleVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Square className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              {/* Orientation indicator badge */}
              <span className="absolute bottom-0.5 text-[7px] font-bold uppercase tracking-tighter opacity-80 hidden sm:block">
                {shapeType === 'horizontal' ? 'HORIZ' : shapeType === 'vertical' ? 'VERT' : 'SQR'}
              </span>
            </div>
            <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
              {t.dock.shape}
            </span>
          </button>
        )}

        {/* Wallpaper Switcher */}
        <button
          onClick={nextWallpaper}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={`Change Wallpaper (Current: ${wallpaper})`}
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30 border border-white/30">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {t.dock.wallpaper}
          </span>
        </button>

        {/* Dark / Warm / Light Mode */}
        <button
          onClick={cycleTheme}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={themeDetails.title}
        >
          <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${themeDetails.bg} flex items-center justify-center text-white shadow-md border border-white/30 transition-all`}>
            {themeDetails.icon}
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {themeDetails.label}
          </span>
        </button>

        {/* Language Switcher in Dock */}
        <button
          onClick={toggleLanguage}
          className="group relative flex flex-col items-center p-1 sm:p-1.5 transition-transform duration-150 hover:-translate-y-1.5 hover:scale-105 active:scale-95"
          title={t.nav.switchLanguage}
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 border border-white/30">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[10px] text-slate-800 dark:text-white font-semibold mt-1 hidden sm:block">
            {t.dock.langCode}
          </span>
        </button>
      </div>
    </div>
  );
};
