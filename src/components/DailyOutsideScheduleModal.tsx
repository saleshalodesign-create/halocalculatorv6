import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  RotateCcw,
  Calendar,
  Building,
  MapPin,
  FileText,
  Sparkles,
  X,
  FileSpreadsheet,
  Check,
  Eye,
  Edit3,
  Columns,
  Maximize2,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  Type,
  Layers,
} from 'lucide-react';
import { HaloLogo } from './HaloLogo';
import { useLanguage } from '../context/LanguageContext';
import {
  generateDailyOutsideSchedulePDF,
  DailyScheduleEntry,
} from '../utils/pdfGenerator';
import { QuoteItem } from '../types';

interface DailyOutsideScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteItems?: QuoteItem[];
  currentCustomerName?: string;
  currentCustomerAddress?: string;
}

type ViewMode = 'sheet' | 'editor' | 'split';

export const DailyOutsideScheduleModal: React.FC<DailyOutsideScheduleModalProps> = ({
  isOpen,
  onClose,
  quoteItems = [],
  currentCustomerName = '',
  currentCustomerAddress = '',
}) => {
  const { language, t } = useLanguage();
  const ds = t.dailySchedule;

  // Format today's date in Singapore/standard DD/MM/YYYY
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getTomorrowFormatted = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Determine Day of Week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) from date string
  const getDayOfWeekName = (dateStr: string): string => {
    if (!dateStr || !dateStr.trim()) return '';
    const clean = dateStr.trim();

    // Check DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    const parts = clean.split(/[\/\-\.]/);
    let parsedDate: Date | null = null;

    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 1000) {
        parsedDate = new Date(p0, p1 - 1, p2);
      } else {
        parsedDate = new Date(p2, p1 - 1, p0);
      }
    } else {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return daysEn[parsedDate.getDay()] || '';
    }

    return '';
  };

  const [date, setDate] = useState<string>(getTodayFormatted);
  const [dayOverride, setDayOverride] = useState<string>('');

  const autoDay = getDayOfWeekName(date);
  const currentDay = dayOverride || autoDay;

  // Slot Count: user can select how many slots on schedule (1 to 8, default 5)
  const [slotCount, setSlotCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('halo_schedule_slot_count');
      if (saved) {
        const val = Number(saved);
        if (val >= 1 && val <= 8) return val;
      }
    } catch {
      // ignore
    }
    return 5;
  });

  useEffect(() => {
    try {
      localStorage.setItem('halo_schedule_slot_count', String(slotCount));
    } catch {
      // ignore
    }
  }, [slotCount]);

  const [entries, setEntries] = useState<DailyScheduleEntry[]>(() => {
    try {
      const saved = localStorage.getItem('halo_daily_outside_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = [...parsed];
          while (list.length < 8) {
            list.push({ companyName: '', address: '', descriptions: '' });
          }
          return list.slice(0, 8);
        }
      }
    } catch {
      // ignore
    }
    return Array.from({ length: 8 }, () => ({
      companyName: '',
      address: '',
      descriptions: '',
    }));
  });

  // Default view is 'sheet' so the user sees the full official form immediately
  const [viewMode, setViewMode] = useState<ViewMode>('sheet');
  const [activeSlot, setActiveSlot] = useState<number>(0);

  // Keep activeSlot within current slotCount bounds
  useEffect(() => {
    if (activeSlot >= slotCount) {
      setActiveSlot(Math.max(0, slotCount - 1));
    }
  }, [slotCount, activeSlot]);
  const [justCopied, setJustCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Zoom & Auto-Fit scaling for the paper sheet preview
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [scaleFactor, setScaleFactor] = useState<number>(0.85);

  // Font Size Scale: 85% (compact), 100% (standard), 115% (large), 130% (extra-large)
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('halo_schedule_font_scale');
      if (saved) {
        const val = Number(saved);
        if (val >= 75 && val <= 180) return val;
      }
    } catch {
      // ignore
    }
    return 100;
  });

  useEffect(() => {
    try {
      localStorage.setItem('halo_schedule_font_scale', String(fontScale));
    } catch {
      // ignore
    }
  }, [fontScale]);

  const increaseFontScale = () => setFontScale(prev => Math.min(180, prev + 10));
  const decreaseFontScale = () => setFontScale(prev => Math.max(75, prev - 10));

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('halo_daily_outside_schedule', JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

  // Recalculate zoom scale when in 'fit' mode
  useEffect(() => {
    if (!isOpen) return;

    const recalculateScale = () => {
      if (!previewContainerRef.current) return;
      const containerH = previewContainerRef.current.clientHeight;
      const containerW = previewContainerRef.current.clientWidth;

      if (containerH <= 0 || containerW <= 0) return;

      if (zoomMode === 'fit') {
        const sheetTargetH = 520 + slotCount * 80; // dynamic height of A4 rendered sheet based on slot count
        const sheetTargetW = 640; // base width
        const padding = 32;

        const scaleH = (containerH - padding) / sheetTargetH;
        const scaleW = (containerW - padding) / sheetTargetW;

        const optimal = Math.min(scaleH, scaleW, 1.05);
        setScaleFactor(Math.max(0.42, optimal));
      } else {
        setScaleFactor(zoomMode / 100);
      }
    };

    // Calculate immediately and on next tick
    recalculateScale();
    const timer = setTimeout(recalculateScale, 100);
    window.addEventListener('resize', recalculateScale);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', recalculateScale);
    };
  }, [isOpen, zoomMode, viewMode, slotCount]);

  if (!isOpen) return null;

  const updateEntry = (index: number, field: keyof DailyScheduleEntry, val: string) => {
    setEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleClearAll = () => {
    if (window.confirm(language === 'zh' ? '确定要清空表单的所有输入吗？' : 'Clear all schedule fields?')) {
      setEntries(Array.from({ length: 8 }, () => ({
        companyName: '',
        address: '',
        descriptions: '',
      })));
    }
  };

  // Quick fill from currently loaded quotation in app
  const handleImportActiveQuote = (slotIdx: number = 0) => {
    const descriptionsList = quoteItems
      .map(item => {
        const dim = item.originalWidth > 0 ? ` (${item.originalWidth}×${item.originalHeight} ${item.unit})` : '';
        return `${item.title}${dim} x${item.quantity}`;
      })
      .join('\n');

    setEntries(prev => {
      const next = [...prev];
      next[slotIdx] = {
        companyName: currentCustomerName || next[slotIdx].companyName || 'Halo Customer',
        address: currentCustomerAddress || next[slotIdx].address || '',
        descriptions: descriptionsList || next[slotIdx].descriptions || '',
      };
      return next;
    });
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  // Print Form
  const handlePrint = (isBlank: boolean = false) => {
    setIsPrinting(true);
    showToast(
      language === 'zh'
        ? '正在准备打印排程单...'
        : 'Preparing A4 schedule for print...'
    );

    // 1. If running in top-level window without sandbox restriction, attempt window.print()
    let nativePrintTriggered = false;
    try {
      if (window.self === window.top) {
        window.print();
        nativePrintTriggered = true;
      }
    } catch (e) {
      console.warn('Native window.print() not available in this context:', e);
    }

    // 2. Always trigger the PDF print engine (auto-print iframe + popup + download fallback)
    try {
      const activeEntries = isBlank
        ? Array.from({ length: slotCount }, () => ({ companyName: '', address: '', descriptions: '' }))
        : entries.slice(0, slotCount);

      generateDailyOutsideSchedulePDF(
        {
          date: isBlank ? '' : date,
          dayOfWeek: isBlank ? undefined : (currentDay || undefined),
          entries: activeEntries,
          slotCount,
          fontSizeScale: fontScale / 100,
        },
        'print'
      );

      if (!nativePrintTriggered) {
        showToast(
          language === 'zh'
            ? '已生成打印排程单！若打印窗口未自动弹出，可直接打印已下载的 PDF。'
            : 'Print document ready! If print dialog does not pop up, print the downloaded PDF.'
        );
      }
    } catch (err) {
      console.error('PDF print generation error:', err);
      handleDownloadPDF(isBlank);
    } finally {
      setTimeout(() => setIsPrinting(false), 1000);
    }
  };

  // Download PDF
  const handleDownloadPDF = (isBlank: boolean = false) => {
    try {
      const activeEntries = isBlank
        ? Array.from({ length: slotCount }, () => ({ companyName: '', address: '', descriptions: '' }))
        : entries.slice(0, slotCount);

      generateDailyOutsideSchedulePDF(
        {
          date: isBlank ? '' : date,
          dayOfWeek: isBlank ? undefined : (currentDay || undefined),
          entries: activeEntries,
          slotCount,
          fontSizeScale: fontScale / 100,
        },
        'save'
      );
      showToast(
        language === 'zh' ? 'PDF 排程表已下载！' : 'Schedule PDF downloaded!'
      );
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  const handleZoomChange = (newVal: 'fit' | number) => {
    setZoomMode(newVal);
  };

  const zoomIn = () => {
    const current = zoomMode === 'fit' ? Math.round(scaleFactor * 100) : zoomMode;
    const next = Math.min(150, current + 15);
    setZoomMode(next);
  };

  const zoomOut = () => {
    const current = zoomMode === 'fit' ? Math.round(scaleFactor * 100) : zoomMode;
    const next = Math.max(45, current - 15);
    setZoomMode(next);
  };

  return (
    <>
      {/* 1. Modal Dialog for App Screen */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 print:hidden overflow-hidden">
        <div className="relative w-full max-w-6xl h-[94vh] sm:h-[90vh] bg-white dark:bg-[#15161a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Floating Toast Notification */}
          {toastMessage && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top macOS Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-100 dark:bg-[#1d1e24] border-b border-slate-200 dark:border-white/10 select-none shrink-0">
            {/* Left: Window Dots & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 traffic-group">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center text-black/60 traffic-btn"
                  title="Close"
                >
                  <X className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center text-black/60 traffic-btn"
                  title="Clear All"
                />
                <button
                  type="button"
                  onClick={() => setViewMode(prev => (prev === 'sheet' ? 'editor' : 'sheet'))}
                  className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center text-black/60 traffic-btn"
                  title="Toggle Mode"
                />
              </div>

              <div className="flex items-center gap-1.5 ml-1 font-bold text-xs sm:text-sm text-slate-800 dark:text-neutral-100">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{ds.title}</span>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono hidden md:inline">
                  (Daily Outside Works Schedule)
                </span>
              </div>
            </div>

            {/* Center: View Switcher Tabs */}
            <div className="flex items-center bg-slate-200/90 dark:bg-black/40 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('sheet')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'sheet'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="View full A4 printable sheet"
              >
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>{ds.fullSheet || 'Full Sheet (A4)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'editor'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Edit field by field"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{ds.formEditor || 'Form Fields'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden lg:flex px-3 py-1 rounded-md transition-all items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Side by side view"
              >
                <Columns className="w-3.5 h-3.5 text-purple-500" />
                <span>{ds.splitView || 'Side-by-Side'}</span>
              </button>
            </div>

            {/* Right: Actions (Print, PDF, Close) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handlePrint(false)}
                disabled={isPrinting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 rounded-lg shadow-sm transition-all"
                title="Print on standard A4 paper"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPrinting ? (language === 'zh' ? '正在准备...' : 'Printing...') : ds.print}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPDF(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-neutral-200 bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 rounded-lg transition-all"
                title="Download Vector PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint(true)}
                disabled={isPrinting}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-60 rounded-lg transition-all"
                title="Print blank template for clipboard handwriting"
              >
                {ds.printBlank}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Date, Font Size, Zoom controls & Quick actions */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50/80 dark:bg-[#18191f] border-b border-slate-200/70 dark:border-white/5 text-xs shrink-0 flex-wrap gap-2">
            {/* Date Quick Selector & Day */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-semibold text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">{ds.date}:</span>
              </span>
              <input
                type="text"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  setDayOverride('');
                }}
                placeholder="DD/MM/YYYY"
                className="w-24 sm:w-28 px-2 py-0.5 text-xs font-mono font-bold rounded bg-white dark:bg-[#101114] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* Day of Week Selector */}
              <select
                value={currentDay}
                onChange={e => setDayOverride(e.target.value)}
                className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 outline-none cursor-pointer transition-colors"
                title="Day of week (Monday, Tuesday, Wednesday...)"
              >
                <option value="">-- Day --</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setDate(getTodayFormatted());
                  setDayOverride('');
                }}
                className="px-1.5 py-0.5 text-[11px] rounded bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                {ds.today}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate(getTomorrowFormatted());
                  setDayOverride('');
                }}
                className="px-1.5 py-0.5 text-[11px] rounded bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                {ds.tomorrow}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate('');
                  setDayOverride('');
                }}
                className="px-1.5 py-0.5 text-[11px] rounded bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors"
              >
                {ds.blankDate}
              </button>
            </div>

            {/* Right side controls: Slot Count + Font Size + Zoom + Import */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Slot Count Selector */}
              <div
                className="flex items-center gap-1 bg-slate-200/70 dark:bg-black/30 px-1.5 py-0.5 rounded-lg"
                title={ds.slotsTooltip}
              >
                <span className="text-[11px] font-bold text-slate-600 dark:text-neutral-300 flex items-center gap-1 pl-0.5 select-none">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden xl:inline">{ds.slotsCount || 'Slots'}:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSlotCount(prev => Math.max(1, prev - 1))}
                  disabled={slotCount <= 1}
                  className="px-1.5 py-0.5 rounded font-bold text-[11px] text-slate-600 dark:text-neutral-300 hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Fewer slots (-)"
                >
                  -
                </button>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSlotCount(num)}
                      className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded transition-all ${
                        slotCount === num
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={`${num} Slots`}
                    >
                      {num}
                    </button>
                  ))}
                  {slotCount > 6 && (
                    <button
                      type="button"
                      onClick={() => setSlotCount(slotCount)}
                      className="px-1.5 h-5 flex items-center justify-center text-[10px] font-bold rounded bg-blue-600 text-white shadow-xs"
                      title={`${slotCount} Slots`}
                    >
                      {slotCount}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSlotCount(prev => Math.min(8, prev + 1))}
                  disabled={slotCount >= 8}
                  className="px-1.5 py-0.5 rounded font-bold text-[11px] text-slate-600 dark:text-neutral-300 hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="More slots (+)"
                >
                  +
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div
                className="flex items-center gap-1 bg-slate-200/70 dark:bg-black/30 px-1.5 py-0.5 rounded-lg"
                title={ds.fontSizeTooltip}
              >
                <span className="text-[11px] font-bold text-slate-600 dark:text-neutral-300 flex items-center gap-1 pl-0.5 select-none">
                  <Type className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden xl:inline">{ds.fontSize}:</span>
                </span>

                <button
                  type="button"
                  onClick={decreaseFontScale}
                  disabled={fontScale <= 75}
                  className="px-1.5 py-0.5 rounded font-bold text-[11px] text-slate-600 dark:text-neutral-300 hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Smaller font size (A-)"
                >
                  A-
                </button>

                <div className="flex items-center gap-0.5">
                  {[85, 100, 120, 140, 160].map(scale => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setFontScale(scale)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                        fontScale === scale
                          ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={`${scale}%`}
                    >
                      {scale}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={increaseFontScale}
                  disabled={fontScale >= 180}
                  className="px-1.5 py-0.5 rounded font-bold text-[11px] text-slate-600 dark:text-neutral-300 hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Larger font size (A+)"
                >
                  A+
                </button>
              </div>

              {/* Zoom Controls (Active in 'sheet' and 'split' modes) */}
              {(viewMode === 'sheet' || viewMode === 'split') && (
                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-black/30 px-1.5 py-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleZoomChange('fit')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                      zoomMode === 'fit'
                        ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Fit whole A4 sheet onto screen without scrolling"
                  >
                    <Maximize2 className="w-3 h-3 inline mr-1" />
                    {ds.fitPage || 'Fit Page'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleZoomChange(100)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                      zoomMode === 100
                        ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="100% Actual Print Size"
                  >
                    100%
                  </button>

                  <button
                    type="button"
                    onClick={zoomOut}
                    className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>

                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-neutral-400 min-w-[32px] text-center">
                    {Math.round(scaleFactor * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={zoomIn}
                    className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Import Active Quote Button */}
              {(currentCustomerName || quoteItems.length > 0) && (
                <button
                  type="button"
                  onClick={() => handleImportActiveQuote(activeSlot)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                  title="Fill active quotation details into Slot 1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{justCopied ? (language === 'zh' ? '已填入 Slot 1！' : 'Filled Slot 1!') : ds.importActive}</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative flex">
            {/* MODE 1: FULL SHEET VIEW (Paper preview centered with auto-fit scale) */}
            {(viewMode === 'sheet' || viewMode === 'split') && (
              <div
                ref={previewContainerRef}
                className={`flex-1 h-full bg-slate-300/60 dark:bg-[#0c0d0f] overflow-auto flex flex-col items-center justify-start p-3 sm:p-6 ${
                  viewMode === 'split' ? 'lg:w-1/2 lg:border-r lg:border-slate-200 dark:lg:border-white/10' : 'w-full'
                }`}
              >
                {/* Direct Editing Hint Pill */}
                <div className="mb-2 px-3 py-1 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-full shadow-xs text-[11px] text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 shrink-0 select-none">
                  <span>💡</span>
                  <span>{ds.directEditHint || 'You can type directly into the table cells below, or switch to "Form Fields"'}</span>
                </div>

                {/* Scaled A4 Sheet Container */}
                <div
                  style={{
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top center',
                    marginBottom: `${Math.max(0, (scaleFactor - 1) * 920)}px`,
                  }}
                  className="transition-transform duration-100 ease-out"
                >
                  {/* Paper Page (A4 Portrait proportions) */}
                  <div
                    id="schedule-screen-preview"
                    className="w-[620px] bg-white text-black p-8 rounded-xs shadow-2xl border border-slate-300 font-sans select-text relative"
                    style={{ minHeight: '880px' }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b-0">
                      {/* Left: Logo + Title (Single Row) */}
                      <div className="flex items-center gap-4 shrink min-w-0">
                        <div className="flex flex-col shrink-0 select-none">
                          <div className="flex items-center">
                            <span className="text-[26px] font-black tracking-tight text-black font-sans leading-none">
                              hal
                            </span>
                            <div className="w-6 h-6 ml-0.5 relative inline-flex items-center justify-center">
                              <HaloLogo className="w-6 h-6" />
                            </div>
                          </div>
                          <span className="text-[7.5px] font-bold tracking-wider text-black font-sans mt-0.5 leading-none">
                            DESIGN PTE LTD
                          </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-serif font-bold text-black tracking-tight leading-none whitespace-nowrap select-none">
                          Daily Outside Works Schedule
                        </h1>
                      </div>

                      {/* Right: Day (Top) & Date (Bottom) */}
                      <div className="text-right pt-0.5 shrink-0 flex flex-col items-end gap-1">
                        {/* Day of Week Display & Selector on Top */}
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentDay}
                            onChange={e => setDayOverride(e.target.value)}
                            className="appearance-none text-sm font-serif font-bold text-blue-900 bg-blue-50/70 hover:bg-blue-100/90 border border-blue-300 rounded px-2 py-0.5 outline-none cursor-pointer pr-4 transition-colors"
                            title="Click to select or change day of week (Monday, Tuesday, Wednesday...)"
                          >
                            <option value="">(Select Day)</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                          </select>
                          <span className="pointer-events-none absolute right-1 text-[9px] text-blue-700 font-bold select-none">▾</span>
                        </div>

                        {/* Date below Day */}
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-serif font-bold text-black select-none">
                            Date:
                          </span>
                          <input
                            type="text"
                            value={date}
                            onChange={e => {
                              setDate(e.target.value);
                              setDayOverride('');
                            }}
                            placeholder="___________________"
                            className="w-28 text-sm font-serif font-bold text-black bg-transparent border-b border-black/60 focus:border-black outline-none px-1 text-left"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Schedule Slots (Dynamic count) */}
                    <div className={`flex flex-col ${slotCount <= 3 ? 'gap-5' : slotCount === 4 ? 'gap-3.5' : slotCount === 5 ? 'gap-2.5' : 'gap-1.5'} mt-2.5`}>
                      {entries.slice(0, slotCount).map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 group">
                          {/* Slot Number: 1 to N (Fixed template size) */}
                          <div
                            className="w-5 font-bold text-black font-serif text-base pt-1 shrink-0 text-center select-none flex flex-col items-center"
                          >
                            <span>{idx + 1}</span>
                            {(entry.companyName || entry.address || entry.descriptions) && (
                              <span
                                onClick={() => {
                                  updateEntry(idx, 'companyName', '');
                                  updateEntry(idx, 'address', '');
                                  updateEntry(idx, 'descriptions', '');
                                }}
                                className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:underline cursor-pointer mt-1"
                                title="Clear this slot"
                              >
                                ✕
                              </span>
                            )}
                          </div>

                          <div className="flex-1">
                            {/* Table Box */}
                            <div className="border border-black border-collapse w-full bg-white">
                              {/* Row 1: Company Name */}
                              <div className="flex border-b border-black">
                                <div
                                  className="w-36 px-2.5 py-1 font-serif font-bold text-[13px] text-black border-r border-black shrink-0 select-none bg-slate-50/40"
                                >
                                  Company Name:
                                </div>
                                <div className="flex-1 px-2 py-0.5 min-h-[26px] flex items-center">
                                  {/* Input font size scaled by fontScale */}
                                  <input
                                    type="text"
                                    value={entry.companyName}
                                    onChange={e => updateEntry(idx, 'companyName', e.target.value)}
                                    placeholder="Enter client / company name..."
                                    style={{ fontSize: `${1.05 * (fontScale / 100)}rem` }}
                                    className="w-full font-sans font-bold text-black bg-transparent outline-none placeholder:text-slate-300"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Add: */}
                              <div className="flex">
                                <div
                                  className="w-36 px-2.5 py-1 font-serif font-bold text-[13px] text-black border-r border-black shrink-0 select-none bg-slate-50/40"
                                >
                                  Add:
                                </div>
                                <div className="flex-1 px-2 py-0.5 min-h-[26px] flex items-center">
                                  {/* Input font size scaled by fontScale */}
                                  <input
                                    type="text"
                                    value={entry.address}
                                    onChange={e => updateEntry(idx, 'address', e.target.value)}
                                    placeholder="Enter site installation address..."
                                    style={{ fontSize: `${0.95 * (fontScale / 100)}rem` }}
                                    className="w-full font-sans text-black bg-transparent outline-none placeholder:text-slate-300"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Row 3: Descriptions */}
                            <div className="mt-1">
                              <div
                                className="font-serif font-bold text-[13px] text-black select-none"
                              >
                                Descriptions:
                              </div>
                              {/* Input textarea font size scaled by fontScale */}
                              <textarea
                                rows={slotCount <= 2 ? 4 : slotCount <= 4 ? 3 : 2}
                                value={entry.descriptions}
                                onChange={e => updateEntry(idx, 'descriptions', e.target.value)}
                                placeholder="Sign dimensions, installation requirements, contact person, or leave blank for handwriting..."
                                style={{
                                  fontSize: `${0.95 * (fontScale / 100)}rem`,
                                  lineHeight: `${1.45 * (fontScale / 100)}rem`,
                                }}
                                className="w-full font-sans text-slate-800 bg-transparent outline-none pt-0.5 px-1 resize-none placeholder:text-slate-300 leading-relaxed border-b border-transparent focus:border-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paper Footer watermark */}
                    <div className="mt-6 pt-3 border-t border-slate-200 text-center select-none">
                      <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        Halo Design Pte Ltd • Daily Outside Works Schedule Form
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: FORM EDITOR VIEW (Structured field by field) */}
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div
                className={`flex-1 h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-[#15161a] ${
                  viewMode === 'split' ? 'lg:w-1/2' : 'w-full max-w-3xl mx-auto'
                }`}
              >
                <div className="flex flex-col gap-5 max-w-2xl mx-auto">
                  {/* Slot selector tabs */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                      {ds.jobSlot} (1 - {slotCount})
                    </span>
                    {(currentCustomerName || quoteItems.length > 0) && (
                      <button
                        type="button"
                        onClick={() => handleImportActiveQuote(activeSlot)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {justCopied ? (language === 'zh' ? '已导入！' : 'Imported!') : ds.importActive}
                      </button>
                    )}
                  </div>

                  <div
                    className="grid gap-1.5 sm:gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(slotCount, slotCount <= 4 ? slotCount : 5)}, minmax(0, 1fr))`
                    }}
                  >
                    {Array.from({ length: slotCount }, (_, idx) => idx).map(idx => {
                      const hasData =
                        Boolean(entries[idx]?.companyName) ||
                        Boolean(entries[idx]?.address) ||
                        Boolean(entries[idx]?.descriptions);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSlot(idx)}
                          className={`px-2 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center relative ${
                            activeSlot === idx
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-[#1e1f26] text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span>Slot {idx + 1}</span>
                          {hasData && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                activeSlot === idx ? 'bg-white' : 'bg-emerald-500'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Slot Form Box */}
                  <div className="bg-white dark:bg-[#1a1b22] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                          Task #{activeSlot + 1}
                        </span>
                        {entries[activeSlot].companyName && (
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium truncate max-w-[200px]">
                            — {entries[activeSlot].companyName}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateEntry(activeSlot, 'companyName', '');
                          updateEntry(activeSlot, 'address', '');
                          updateEntry(activeSlot, 'descriptions', '');
                        }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear Slot
                      </button>
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-500" />
                        {ds.companyName}
                      </label>
                      <input
                        type="text"
                        value={entries[activeSlot].companyName}
                        onChange={e => updateEntry(activeSlot, 'companyName', e.target.value)}
                        placeholder="e.g. ABC Pte Ltd / John Tan"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Address (Add:) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        {ds.address}
                      </label>
                      <textarea
                        rows={2}
                        value={entries[activeSlot].address}
                        onChange={e => updateEntry(activeSlot, 'address', e.target.value)}
                        placeholder="e.g. 10 Ubi Crescent, #01-20 Singapore 408564"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>

                    {/* Descriptions: */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500" />
                        {ds.descriptions}
                      </label>
                      <textarea
                        rows={4}
                        value={entries[activeSlot].descriptions}
                        onChange={e => updateEntry(activeSlot, 'descriptions', e.target.value)}
                        placeholder="Installation specs, sign sizes, contact person, or leave empty for physical handwriting"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* All Slots Overview List */}
                  <div className="bg-white dark:bg-[#1a1b22] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                      All {slotCount} Slots Status
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {entries.slice(0, slotCount).map((ent, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveSlot(i)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            activeSlot === i
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                              : 'border-slate-200 dark:border-white/5 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-slate-800 dark:text-neutral-200 flex items-center justify-between">
                            <span>#{i + 1} {ent.companyName || '(Empty slot)'}</span>
                            {ent.companyName && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                            {ent.address || 'No address set'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons inside form editor */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrint(false)}
                      disabled={isPrinting}
                      className="flex-1 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      {isPrinting ? (language === 'zh' ? '正在准备打印...' : 'Preparing Print...') : ds.print}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('sheet')}
                      className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-neutral-200 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{ds.fullSheet || 'View Sheet'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. PURE PRINT DEDICATED CONTAINER (Used ONLY during window.print(), never on screen) */}
      <div
        id="printable-daily-schedule"
        className="hidden print:block w-full bg-white text-black p-0 m-0 font-sans"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3">
          <div className="flex items-center gap-6">
            <div className="flex flex-col shrink-0">
              <div className="flex items-center">
                <span className="text-[28px] font-black tracking-tight text-black font-sans leading-none">
                  hal
                </span>
                <div className="w-6 h-6 ml-0.5 relative inline-flex items-center justify-center">
                  <HaloLogo className="w-6 h-6" />
                </div>
              </div>
              <span className="text-[7.5px] font-bold tracking-wider text-black font-sans mt-0.5 leading-none">
                DESIGN PTE LTD
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-bold text-black tracking-normal whitespace-nowrap">
              Daily Outside Works Schedule
            </h1>
          </div>

          <div className="text-right pt-0.5 shrink-0 flex flex-col items-end">
            {currentDay && (
              <span className="text-sm font-serif font-bold text-black pb-0.5">
                {currentDay}
              </span>
            )}
            <span className="text-sm font-serif font-bold text-black">
              Date: {date || '___________________'}
            </span>
          </div>
        </div>

        {/* Schedule Entries */}
        <div className={`flex flex-col ${slotCount <= 3 ? 'gap-6' : slotCount === 4 ? 'gap-5' : slotCount === 5 ? 'gap-4' : 'gap-2.5'} mt-2.5`}>
          {entries.slice(0, slotCount).map((entry, idx) => (
            <div key={idx} className="flex items-start gap-3">
              {/* Number 1 to N (Fixed template size) */}
              <span
                className="w-5 font-bold text-black font-serif text-base pt-1 shrink-0 text-center"
              >
                {idx + 1}
              </span>

              <div className="flex-1">
                {/* Box */}
                <div className="border border-black border-collapse w-full">
                  <div className="flex border-b border-black">
                    <div
                      className="w-36 px-2.5 py-1 font-serif font-bold text-black border-r border-black shrink-0 text-[13px]"
                    >
                      Company Name:
                    </div>
                    <div
                      className="flex-1 px-3 py-1 font-sans font-bold text-black min-h-[26px]"
                      style={{ fontSize: `${1.05 * (fontScale / 100)}rem` }}
                    >
                      {entry.companyName}
                    </div>
                  </div>

                  <div className="flex">
                    <div
                      className="w-36 px-2.5 py-1 font-serif font-bold text-black border-r border-black shrink-0 text-[13px]"
                    >
                      Add:
                    </div>
                    <div
                      className="flex-1 px-3 py-1 font-sans text-black min-h-[26px]"
                      style={{ fontSize: `${0.95 * (fontScale / 100)}rem` }}
                    >
                      {entry.address}
                    </div>
                  </div>
                </div>

                <div className="mt-1">
                  <div
                    className="font-serif font-bold text-black text-[13px]"
                  >
                    Descriptions:
                  </div>
                  <div
                    className="font-sans text-slate-800 min-h-[50px] pt-1 px-0.5 whitespace-pre-wrap"
                    style={{
                      fontSize: `${0.95 * (fontScale / 100)}rem`,
                      lineHeight: `${1.45 * (fontScale / 100)}rem`,
                    }}
                  >
                    {entry.descriptions}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
