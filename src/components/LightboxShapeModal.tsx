import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeftRight,
  Lightbulb,
  User,
  Maximize2,
  Copy,
  Check,
  Layers,
  Sparkles,
  Info,
  Image as ImageIcon,
  Upload,
  Trash2,
  Palette,
} from 'lucide-react';
import { UnitType, Unit } from '../types';
import { convertToInches } from '../utils/calculator';

interface LightboxShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  width: string;
  height: string;
  unit: UnitType;
  onUpdateWidth: (w: string) => void;
  onUpdateHeight: (h: string) => void;
  onUpdateUnit?: (u: UnitType) => void;
  onApplyBaseToCalculator?: (w: string, h: string) => void;
}

// Popular Base / Backing Architectural Colors
const POPULAR_BASE_COLORS = [
  { name: 'Matte Charcoal ACP', hex: '#181a20' },
  { name: 'Pure White ACP', hex: '#ffffff' },
  { name: 'Jet Black ACP', hex: '#0a0a0c' },
  { name: 'Brushed Silver / Aluminum', hex: '#94a3b8' },
  { name: 'Slate Grey', hex: '#475569' },
  { name: 'Navy Blue ACP', hex: '#0f172a' },
  { name: 'Warm Timber Wood', hex: '#3e271a' },
  { name: 'Coffee Brown', hex: '#26170f' },
  { name: 'Burgundy / Crimson Red', hex: '#7f1d1d' },
  { name: 'Royal Gold / Brass', hex: '#b45309' },
  { name: 'Emerald Green', hex: '#064e3b' },
  { name: 'Vibrant Yellow', hex: '#eab308' },
];

// Built-in sample presets for quick preview
const SAMPLE_BASE_PRESETS = [
  {
    id: 'brick',
    name: 'Architectural Brick',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><rect width="80" height="40" fill="%231f232b"/><path d="M0 0h80v1H0zm0 20h80v1H0zM40 0v20M0 20v20M80 20v20" stroke="%23353b47" stroke-width="2"/><rect x="4" y="3" width="32" height="14" rx="1" fill="%23282c37"/><rect x="44" y="3" width="32" height="14" rx="1" fill="%23262a34"/><rect x="4" y="23" width="72" height="14" rx="1" fill="%23252933"/></svg>',
  },
  {
    id: 'wood',
    name: 'Timber Slat Wall',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="%232b1b12"/><rect x="0" y="2" width="60" height="10" fill="%233e281b"/><rect x="0" y="16" width="60" height="10" fill="%23482f20"/><rect x="0" y="30" width="60" height="10" fill="%23382417"/><rect x="0" y="44" width="60" height="10" fill="%23432b1d"/><line x1="0" y1="13" x2="60" y2="13" stroke="%23170e0a" stroke-width="3"/><line x1="0" y1="27" x2="60" y2="27" stroke="%23170e0a" stroke-width="3"/><line x1="0" y1="41" x2="60" y2="41" stroke="%23170e0a" stroke-width="3"/><line x1="0" y1="55" x2="60" y2="55" stroke="%23170e0a" stroke-width="3"/></svg>',
  },
  {
    id: 'concrete',
    name: 'Industrial Concrete',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%232d3038"/><circle cx="20" cy="20" r="2.5" fill="%231a1c22"/><circle cx="100" cy="20" r="2.5" fill="%231a1c22"/><circle cx="20" cy="100" r="2.5" fill="%231a1c22"/><circle cx="100" cy="100" r="2.5" fill="%231a1c22"/><path d="M0 60h120M60 0v120" stroke="%2324272f" stroke-width="1.5" stroke-dasharray="2 4"/></svg>',
  },
];

const SAMPLE_LIGHTBOX_PRESETS = [
  {
    id: 'halo',
    name: 'Halo Sign Lab',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"><rect width="400" height="150" fill="%230c1022"/><polygon points="200,25 240,65 200,105 160,65" fill="none" stroke="%2338bdf8" stroke-width="4"/><polygon points="200,38 228,65 200,92 172,65" fill="%2338bdf8" fill-opacity="0.3"/><text x="200" y="132" fill="%23ffffff" font-size="20" font-family="sans-serif" font-weight="900" letter-spacing="6" text-anchor="middle">HALO SIGN LAB</text></svg>',
  },
  {
    id: 'coffee',
    name: 'Artisan Cafe',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"><rect width="400" height="150" fill="%23181008"/><circle cx="200" cy="55" r="30" fill="none" stroke="%23f59e0b" stroke-width="3.5"/><path d="M185 62c0 8 7 15 15 15s15-7 15-15h-30z" fill="%23f59e0b"/><path d="M215 63h5a4 4 0 0 0 0-8h-5v8z" stroke="%23f59e0b" stroke-width="2" fill="none"/><path d="M194 48c-2-4 2-8 0-12m6 12c-2-4 2-8 0-12m6 12c-2-4 2-8 0-12" stroke="%23f59e0b" stroke-width="2" fill="none" stroke-linecap="round"/><text x="200" y="118" fill="%23fbbf24" font-size="18" font-family="sans-serif" font-weight="800" letter-spacing="4" text-anchor="middle">ROAST &amp; COFFEE</text><text x="200" y="136" fill="%23d97706" font-size="10" font-family="sans-serif" font-weight="600" letter-spacing="3" text-anchor="middle">FINE BEANS &amp; BAKERY</text></svg>',
  },
];

export const LightboxShapeModal: React.FC<LightboxShapeModalProps> = ({
  isOpen,
  onClose,
  width,
  height,
  unit,
  onUpdateWidth,
  onUpdateHeight,
  onUpdateUnit,
  onApplyBaseToCalculator,
}) => {
  // Simplified ON / OFF lighting state
  const [isLightOn, setIsLightOn] = useState<boolean>(true);
  const [showHumanScale, setShowHumanScale] = useState(false);
  const [baseColor, setBaseColor] = useState<string>(() => {
    return localStorage.getItem('halo_shape_base_color') || '#181a20';
  });
  const [alignment, setAlignment] = useState<'center' | 'top' | 'bottom'>('center');
  const [copied, setCopied] = useState(false);
  const [appliedBaseToast, setAppliedBaseToast] = useState(false);

  useEffect(() => {
    if (baseColor) localStorage.setItem('halo_shape_base_color', baseColor);
  }, [baseColor]);

  // Custom inserted images state (Base Image & Lightbox Artwork)
  const [baseImage, setBaseImage] = useState<string | null>(() => {
    return localStorage.getItem('halo_shape_base_img') || null;
  });
  const [baseImageFit, setBaseImageFit] = useState<'cover' | 'fill' | 'tile'>('cover');

  const [lightboxImage, setLightboxImage] = useState<string | null>(() => {
    return localStorage.getItem('halo_shape_lightbox_img') || null;
  });
  const [lightboxImageFit, setLightboxImageFit] = useState<'fill' | 'cover' | 'contain'>('fill');

  const [showPresetsMenu, setShowPresetsMenu] = useState<'none' | 'base' | 'lightbox'>('none');

  // Hidden File input refs
  const baseFileInputRef = useRef<HTMLInputElement>(null);
  const lightboxFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox dimensions
  const numWidth = parseFloat(width) || 0;
  const numHeight = parseFloat(height) || 0;

  // Base Sizes (Backing Panel / Signboard Base)
  const defaultMarginInCurrentUnit = useMemo(() => {
    switch (unit) {
      case Unit.FT: return 0.5; // 0.5 ft = 6"
      case Unit.CM: return 15; // 15 cm
      case Unit.MM: return 150; // 150 mm
      case Unit.M: return 0.15; // 0.15 m
      case Unit.IN:
      default: return 6; // 6 in
    }
  }, [unit]);

  const [baseWidth, setBaseWidth] = useState<string>(() => {
    const saved = localStorage.getItem('halo_shape_base_w');
    if (saved && !isNaN(parseFloat(saved))) return saved;
    const initialW = numWidth > 0 ? numWidth + defaultMarginInCurrentUnit * 2 : 132;
    return initialW.toString();
  });

  const [baseHeight, setBaseHeight] = useState<string>(() => {
    const saved = localStorage.getItem('halo_shape_base_h');
    if (saved && !isNaN(parseFloat(saved))) return saved;
    const initialH = numHeight > 0 ? numHeight + defaultMarginInCurrentUnit * 2 : 48;
    return initialH.toString();
  });

  // Sync Base W & H to localStorage
  useEffect(() => {
    if (baseWidth) localStorage.setItem('halo_shape_base_w', baseWidth);
    if (baseHeight) localStorage.setItem('halo_shape_base_h', baseHeight);
  }, [baseWidth, baseHeight]);

  const numBaseWidth = parseFloat(baseWidth) || 0;
  const numBaseHeight = parseFloat(baseHeight) || 0;

  // Real world dimensions normalized to inches
  const lightboxWidthInches = useMemo(() => convertToInches(numWidth, unit), [numWidth, unit]);
  const lightboxHeightInches = useMemo(() => convertToInches(numHeight, unit), [numHeight, unit]);
  const baseWidthInches = useMemo(() => convertToInches(numBaseWidth, unit), [numBaseWidth, unit]);
  const baseHeightInches = useMemo(() => convertToInches(numBaseHeight, unit), [numBaseHeight, unit]);

  // Feet & Areas
  const lightboxAreaSqFt = (lightboxWidthInches * lightboxHeightInches) / 144;
  const baseAreaSqFt = (baseWidthInches * baseHeightInches) / 144;
  const lightboxFeetW = lightboxWidthInches / 12;
  const baseFeetW = baseWidthInches / 12;

  // Calculated Margins / Clearances (Base vs Lightbox)
  const leftRightMargin = useMemo(() => {
    if (numBaseWidth <= 0 || numWidth <= 0) return 0;
    return Math.max(0, (numBaseWidth - numWidth) / 2);
  }, [numBaseWidth, numWidth]);

  const topBottomMargin = useMemo(() => {
    if (numBaseHeight <= 0 || numHeight <= 0) return 0;
    if (alignment === 'top') return 0;
    return Math.max(0, (numBaseHeight - numHeight) / 2);
  }, [numBaseHeight, numHeight, alignment]);

  const isLightboxExceedingBase = numWidth > numBaseWidth || numHeight > numBaseHeight;

  // Shape classification of Lightbox
  const shapeInfo = useMemo(() => {
    if (numWidth <= 0 || numHeight <= 0) {
      return { type: 'invalid' as const, ratioStr: '—', ratioValue: 1 };
    }
    const diffPct = Math.abs(lightboxWidthInches - lightboxHeightInches) / Math.max(lightboxWidthInches, lightboxHeightInches);
    if (diffPct < 0.015) {
      return { type: 'square' as const, ratioStr: '1 : 1', ratioValue: 1 };
    }
    if (lightboxWidthInches > lightboxHeightInches) {
      const r = lightboxWidthInches / lightboxHeightInches;
      return { type: 'horizontal' as const, ratioStr: `${r.toFixed(2)} : 1`, ratioValue: r };
    }
    const r = lightboxHeightInches / lightboxWidthInches;
    return { type: 'vertical' as const, ratioStr: `1 : ${r.toFixed(2)}`, ratioValue: 1 / r };
  }, [lightboxWidthInches, lightboxHeightInches, numWidth, numHeight]);

  // Responsive Stage Container measurement
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 480, height: 300 });

  useEffect(() => {
    if (!isOpen) return;
    let animFrame: number;

    const updateSize = () => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setStageSize(prev => {
            if (Math.abs(prev.width - rect.width) < 2 && Math.abs(prev.height - rect.height) < 2) {
              return prev;
            }
            return { width: Math.round(rect.width), height: Math.round(rect.height) };
          });
        }
      }
    };

    animFrame = requestAnimationFrame(updateSize);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          const w = Math.round(entry.contentRect.width);
          const h = Math.round(entry.contentRect.height);
          setStageSize(prev => {
            if (Math.abs(prev.width - w) < 2 && Math.abs(prev.height - h) < 2) {
              return prev;
            }
            return { width: w, height: h };
          });
        }
      }
    });

    if (stageRef.current) {
      ro.observe(stageRef.current);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);

  // Scaling math: Fit the outer bounding box into canvas stage
  const {
    baseBoxW,
    baseBoxH,
    lightboxBoxW,
    lightboxBoxH,
    scaleFactor,
  } = useMemo(() => {
    const requiredNonBoxW = showHumanScale ? 116 : 80;
    const requiredNonBoxH = 68;

    const maxAvailW = Math.max(40, stageSize.width - requiredNonBoxW);
    const maxAvailH = Math.max(30, stageSize.height - requiredNonBoxH);

    const effectiveBaseW_in = baseWidthInches > 0 ? baseWidthInches : lightboxWidthInches || 120;
    const effectiveBaseH_in = baseHeightInches > 0 ? baseHeightInches : lightboxHeightInches || 36;
    const effectiveLightW_in = lightboxWidthInches > 0 ? lightboxWidthInches : 120;
    const effectiveLightH_in = lightboxHeightInches > 0 ? lightboxHeightInches : 36;

    const boundingW_in = Math.max(effectiveBaseW_in, effectiveLightW_in);
    const boundingH_in = Math.max(effectiveBaseH_in, effectiveLightH_in);

    const scale = Math.min(maxAvailW / (boundingW_in || 1), maxAvailH / (boundingH_in || 1));

    const bBoxW = Math.max(32, Math.min(maxAvailW, Math.round(effectiveBaseW_in * scale)));
    const bBoxH = Math.max(24, Math.min(maxAvailH, Math.round(effectiveBaseH_in * scale)));

    const lBoxW = Math.max(24, Math.min(maxAvailW, Math.round(effectiveLightW_in * scale)));
    const lBoxH = Math.max(18, Math.min(maxAvailH, Math.round(effectiveLightH_in * scale)));

    return {
      baseBoxW: bBoxW,
      baseBoxH: bBoxH,
      lightboxBoxW: lBoxW,
      lightboxBoxH: lBoxH,
      scaleFactor: scale,
    };
  }, [
    baseWidthInches,
    baseHeightInches,
    lightboxWidthInches,
    lightboxHeightInches,
    stageSize,
    showHumanScale,
  ]);

  // Human scale height (1.75m / 68.9 inches)
  const humanHeightPx = useMemo(() => {
    const humanInches = 68.9;
    const targetH = humanInches * scaleFactor;
    return Math.max(22, Math.min(stageSize.height - 40, Math.round(targetH)));
  }, [scaleFactor, stageSize.height]);

  // Preset Margins Handler
  const handleApplyPresetMargin = (marginVal: number) => {
    const newBaseW = (numWidth + marginVal * 2).toFixed(2).replace(/\.00$/, '');
    const newBaseH = (numHeight + marginVal * 2).toFixed(2).replace(/\.00$/, '');
    setBaseWidth(newBaseW);
    setBaseHeight(newBaseH);
  };

  // File Upload Handlers
  const handleBaseImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setBaseImage(result);
      try {
        localStorage.setItem('halo_shape_base_img', result);
      } catch (err) {
        console.warn('Base image size exceeds localStorage limit', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLightboxImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setLightboxImage(result);
      try {
        localStorage.setItem('halo_shape_lightbox_img', result);
      } catch (err) {
        console.warn('Lightbox image size exceeds localStorage limit', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearBaseImage = () => {
    setBaseImage(null);
    localStorage.removeItem('halo_shape_base_img');
  };

  const handleClearLightboxImage = () => {
    setLightboxImage(null);
    localStorage.removeItem('halo_shape_lightbox_img');
  };

  // Swap Lightbox W & H
  const handleSwapLightbox = () => {
    const temp = width;
    onUpdateWidth(height);
    onUpdateHeight(temp);
  };

  // Swap Base W & H
  const handleSwapBase = () => {
    const temp = baseWidth;
    setBaseWidth(baseHeight);
    setBaseHeight(temp);
  };

  // Copy specs to clipboard
  const handleCopySpecs = () => {
    const text = `HALO SIGN SPECS:
BASE SIZES: ${numBaseWidth} × ${numBaseHeight} ${unit.toUpperCase()} (${baseAreaSqFt.toFixed(1)} sq ft)
LIGHTBOX SIZES: ${numWidth} × ${numHeight} ${unit.toUpperCase()} (${lightboxAreaSqFt.toFixed(1)} sq ft)
CLEARANCES: Left/Right Margin: ${leftRightMargin.toFixed(1)} ${unit.toUpperCase()} | Top/Bottom Margin: ${topBottomMargin.toFixed(1)} ${unit.toUpperCase()}
ASPECT RATIO: ${shapeInfo.ratioStr}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply Base size to Main Calculator
  const handleApplyBaseToCalc = () => {
    if (onApplyBaseToCalculator && numBaseWidth > 0 && numBaseHeight > 0) {
      onApplyBaseToCalculator(baseWidth, baseHeight);
      setAppliedBaseToast(true);
      setTimeout(() => setAppliedBaseToast(false), 2200);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-3xl bg-white dark:bg-[#0a0f24] border border-slate-200 dark:border-indigo-500/25 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95dvh]"
        >
          {/* Ambient Cyber Neon Top Accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90 shrink-0"></div>

          {/* Hidden file inputs for image upload */}
          <input
            ref={baseFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBaseImageFileChange}
          />
          <input
            ref={lightboxFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLightboxImageFileChange}
          />

          {/* macOS Title Bar */}
          <div className="h-10 px-3 sm:px-4 bg-slate-100/95 dark:bg-[#0c122c] border-b border-slate-200 dark:border-indigo-500/20 flex items-center justify-between select-none shrink-0 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/15 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center text-[8px] text-black/70 font-bold"
                title="Close"
              >
                ×
              </button>
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/15 opacity-60"></span>
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/15 opacity-60"></span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-800 dark:text-cyan-300 min-w-0 truncate">
              <Maximize2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate font-mono font-bold tracking-tight">
                BASE SIZES & Lightbox sizes View
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopySpecs}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-cyan-300 bg-white/80 dark:bg-white/10 rounded-lg transition-all"
                title="Copy Base Sizes & Lightbox Specs to Clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Specs'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-3.5 overflow-y-auto mac-scrollbar">

            {/* Sizing Control Cards: BASE SIZES on left, LIGHTBOX SIZES on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
              
              {/* Card 1: BASE SIZES Panel (Outer Frame) */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c132c] border border-slate-300 dark:border-indigo-500/25 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700 dark:bg-neutral-300 border border-black/40"></span>
                      <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                        BASE SIZES
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-cyan-400">
                      {baseAreaSqFt > 0 ? `${baseAreaSqFt.toFixed(1)} sq ft` : '—'}
                    </span>
                  </div>

                  {/* Base W & H Inputs */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-white dark:bg-[#050817] rounded-lg px-2 py-1.5 border border-slate-300 dark:border-indigo-500/30 shadow-inner">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold text-[10px] mr-1.5 shrink-0">
                        W:
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={baseWidth}
                        onChange={e => setBaseWidth(e.target.value)}
                        className="w-full font-mono font-bold text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white"
                        placeholder="Base W"
                      />
                      <span className="text-[10px] font-semibold text-slate-400 ml-1 select-none">
                        {unit.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-slate-400 font-bold">×</span>

                    <div className="flex-1 flex items-center bg-white dark:bg-[#050817] rounded-lg px-2 py-1.5 border border-slate-300 dark:border-indigo-500/30 shadow-inner">
                      <span className="text-slate-500 dark:text-neutral-400 font-bold text-[10px] mr-1.5 shrink-0">
                        H:
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={baseHeight}
                        onChange={e => setBaseHeight(e.target.value)}
                        className="w-full font-mono font-bold text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white"
                        placeholder="Base H"
                      />
                      <span className="text-[10px] font-semibold text-slate-400 ml-1 select-none">
                        {unit.toUpperCase()}
                      </span>
                    </div>

                    {/* Swap Base Dimensions */}
                    <button
                      type="button"
                      onClick={handleSwapBase}
                      className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-neutral-200 transition-all active:scale-95 shrink-0"
                      title="Swap Base Width & Height"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Base Image Insert Toolbar & Quick Margins */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-2 text-[10px]">
                  {/* Base Color Selection Strip */}
                  <div className="flex items-center justify-between gap-1.5 bg-white/70 dark:bg-black/30 p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-neutral-200 text-[10px]">
                        Base Color:
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {POPULAR_BASE_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBaseColor(c.hex)}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform active:scale-90 ${
                            baseColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'ring-2 ring-blue-500 scale-125 border-white z-10'
                              : 'border-black/25 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}

                      {/* Native HTML5 Color Picker */}
                      <label
                        className="cursor-pointer relative flex items-center justify-center p-0.5 rounded border border-slate-300 dark:border-white/20 hover:border-blue-400 bg-white dark:bg-black/50"
                        title="Pick Custom Color"
                      >
                        <input
                          type="color"
                          value={baseColor}
                          onChange={e => setBaseColor(e.target.value)}
                          className="w-4 h-4 cursor-pointer p-0 border-0 bg-transparent opacity-0 absolute inset-0"
                        />
                        <div
                          className="w-3.5 h-3.5 rounded"
                          style={{ backgroundColor: baseColor }}
                        />
                      </label>

                      <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-cyan-400 uppercase select-none">
                        {baseColor}
                      </span>
                    </div>
                  </div>

                  {/* Image on Base Control Strip */}
                  <div className="flex items-center justify-between gap-1.5 bg-white/70 dark:bg-black/30 p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => baseFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-xs active:scale-95"
                        title="Upload Custom Image or Wall Texture for Base Board"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Insert Base Image</span>
                      </button>

                      {/* Sample Presets Dropdown */}
                      <button
                        type="button"
                        onClick={() => setShowPresetsMenu(prev => prev === 'base' ? 'none' : 'base')}
                        className="px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-neutral-300 font-semibold"
                        title="Choose Sample Base Texture"
                      >
                        Presets
                      </button>
                    </div>

                    {baseImage ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Active
                        </span>
                        {/* Fit mode */}
                        <select
                          value={baseImageFit}
                          onChange={e => setBaseImageFit(e.target.value as any)}
                          className="bg-white dark:bg-slate-800 text-[10px] font-bold rounded px-1 py-0.5 border border-slate-300 dark:border-white/10 outline-none"
                        >
                          <option value="cover">Cover</option>
                          <option value="fill">Fill</option>
                          <option value="tile">Tile</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleClearBaseImage}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Remove Base Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-neutral-500 text-[9px] italic">
                        No base image
                      </span>
                    )}
                  </div>

                  {/* Base Sample Presets Selector Popover */}
                  {showPresetsMenu === 'base' && (
                    <div className="p-1.5 bg-slate-200/90 dark:bg-slate-800 rounded-lg flex items-center gap-1 flex-wrap border border-slate-300 dark:border-white/10">
                      <span className="font-bold text-slate-600 dark:text-neutral-300 mr-1">Textures:</span>
                      {SAMPLE_BASE_PRESETS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setBaseImage(p.dataUrl);
                            setShowPresetsMenu('none');
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 dark:bg-white/10 dark:hover:bg-blue-500/20 text-slate-800 dark:text-white font-bold"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Margins */}
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                    <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                      Quick Margins:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { label: '+2"', val: unit === Unit.CM ? 5 : unit === Unit.MM ? 50 : unit === Unit.FT ? 0.16 : 2 },
                        { label: '+4"', val: unit === Unit.CM ? 10 : unit === Unit.MM ? 100 : unit === Unit.FT ? 0.33 : 4 },
                        { label: '+6"', val: unit === Unit.CM ? 15 : unit === Unit.MM ? 150 : unit === Unit.FT ? 0.5 : 6 },
                        { label: '+12"', val: unit === Unit.CM ? 30 : unit === Unit.MM ? 300 : unit === Unit.FT ? 1 : 12 },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleApplyPresetMargin(p.val)}
                          className="px-1.5 py-0.5 rounded bg-white hover:bg-blue-50 dark:bg-white/10 dark:hover:bg-blue-500/20 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-white/10 font-mono font-bold transition-all active:scale-95"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: LIGHTBOX SIZES Panel (Inner Sign) */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c132c] border border-blue-300 dark:border-cyan-500/30 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-600 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <span className="font-black text-blue-700 dark:text-cyan-300 text-xs uppercase tracking-wider">
                        Lightbox sizes
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      {lightboxAreaSqFt > 0 ? `${lightboxAreaSqFt.toFixed(1)} sq ft` : '—'}
                    </span>
                  </div>

                  {/* Lightbox W & H Inputs */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-white dark:bg-[#050817] rounded-lg px-2 py-1.5 border border-blue-300 dark:border-cyan-500/30 shadow-inner">
                      <span className="text-blue-500 font-bold text-[10px] mr-1.5 shrink-0">
                        W:
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={width}
                        onChange={e => onUpdateWidth(e.target.value)}
                        className="w-full font-mono font-bold text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white"
                        placeholder="Light W"
                      />
                      <span className="text-[10px] font-semibold text-slate-400 ml-1 select-none">
                        {unit.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-slate-400 font-bold">×</span>

                    <div className="flex-1 flex items-center bg-white dark:bg-[#050817] rounded-lg px-2 py-1.5 border border-blue-300 dark:border-cyan-500/30 shadow-inner">
                      <span className="text-blue-500 font-bold text-[10px] mr-1.5 shrink-0">
                        H:
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={height}
                        onChange={e => onUpdateHeight(e.target.value)}
                        className="w-full font-mono font-bold text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white"
                        placeholder="Light H"
                      />
                      <span className="text-[10px] font-semibold text-slate-400 ml-1 select-none">
                        {unit.toUpperCase()}
                      </span>
                    </div>

                    {/* Swap Lightbox Dimensions */}
                    <button
                      type="button"
                      onClick={handleSwapLightbox}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-cyan-400 border border-blue-500/25 transition-all active:scale-95 shrink-0"
                      title="Swap Lightbox Width & Height"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lightbox Image Insert Toolbar & Unit Switcher */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-2 text-[10px]">
                  {/* Image on Lightbox Control Strip */}
                  <div className="flex items-center justify-between gap-1.5 bg-white/70 dark:bg-black/30 p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => lightboxFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-xs active:scale-95"
                        title="Upload Logo, Artwork or Sign Graphic for Lightbox (Full Bleed)"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Insert Lightbox Image</span>
                      </button>

                      {/* Sample Presets Dropdown */}
                      <button
                        type="button"
                        onClick={() => setShowPresetsMenu(prev => prev === 'lightbox' ? 'none' : 'lightbox')}
                        className="px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-neutral-300 font-semibold"
                        title="Choose Sample Lightbox Artwork"
                      >
                        Presets
                      </button>
                    </div>

                    {lightboxImage ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Active
                        </span>
                        {/* Fit mode */}
                        <select
                          value={lightboxImageFit}
                          onChange={e => setLightboxImageFit(e.target.value as any)}
                          className="bg-white dark:bg-slate-800 text-[10px] font-bold rounded px-1 py-0.5 border border-slate-300 dark:border-white/10 outline-none"
                        >
                          <option value="fill">Fill (Full Bleed)</option>
                          <option value="cover">Cover</option>
                          <option value="contain">Fit</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleClearLightboxImage}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Remove Lightbox Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-neutral-500 text-[9px] italic">
                        No custom graphic
                      </span>
                    )}
                  </div>

                  {/* Lightbox Sample Presets Selector Popover */}
                  {showPresetsMenu === 'lightbox' && (
                    <div className="p-1.5 bg-slate-200/90 dark:bg-slate-800 rounded-lg flex items-center gap-1 flex-wrap border border-slate-300 dark:border-white/10">
                      <span className="font-bold text-slate-600 dark:text-neutral-300 mr-1">Logos:</span>
                      {SAMPLE_LIGHTBOX_PRESETS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setLightboxImage(p.dataUrl);
                            setShowPresetsMenu('none');
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 dark:bg-white/10 dark:hover:bg-amber-500/20 text-slate-800 dark:text-white font-bold"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Unit Switcher & Ratio */}
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                    <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                      Ratio: <strong className="text-blue-600 dark:text-cyan-400">{shapeInfo.ratioStr}</strong>
                    </span>
                    {onUpdateUnit && (
                      <div className="flex p-0.5 rounded-md bg-white dark:bg-[#050817] border border-slate-300 dark:border-white/15">
                        {[Unit.IN, Unit.FT, Unit.CM, Unit.MM, Unit.M].map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => onUpdateUnit(u)}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase transition-all ${
                              unit === u
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Margin Clearances Banner */}
            <div className="px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-2 flex-wrap text-[11px]">
              <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-medium">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  Clearance Margins:{' '}
                  <strong>Left/Right: {leftRightMargin.toFixed(1)} {unit}</strong> |{' '}
                  <strong>Top/Bottom: {topBottomMargin.toFixed(1)} {unit}</strong>
                </span>
              </div>

              {isLightboxExceedingBase && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/30 text-[10px] animate-pulse">
                  ⚠️ Lightbox size exceeds Base sizes!
                </span>
              )}

              {/* Alignment Selector */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-semibold">Align:</span>
                <div className="flex bg-white dark:bg-black/40 rounded-lg p-0.5 border border-slate-200 dark:border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAlignment('center')}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                      alignment === 'center'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment('top')}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                      alignment === 'top'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment('bottom')}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                      alignment === 'bottom'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    Bottom
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Visualizer Canvas */}
            <div className="rounded-2xl border border-slate-300 dark:border-white/15 bg-slate-900 text-white overflow-hidden relative shadow-2xl">
              {/* Canvas Controls Header: Scale Preview + Base Backer + Simplified Light: ON / OFF Switch */}
              <div className="px-3 py-2 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="font-bold text-slate-200">Scale Preview</span>
                  </div>

                  {/* Base Color & Swatches in Header */}
                  {!baseImage && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-0.5 text-[10px]">
                      <span className="text-neutral-300 font-semibold flex items-center gap-1">
                        <Palette className="w-3 h-3 text-cyan-400" />
                        <span>Base Color:</span>
                      </span>
                      {POPULAR_BASE_COLORS.slice(0, 6).map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBaseColor(c.hex)}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform active:scale-90 ${
                            baseColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'ring-2 ring-cyan-400 scale-125 border-white z-10'
                              : 'border-black/30 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                      <label
                        className="cursor-pointer relative flex items-center justify-center p-0.5 rounded border border-white/20 hover:border-cyan-400 bg-black/40"
                        title="Pick Custom Base Color"
                      >
                        <input
                          type="color"
                          value={baseColor}
                          onChange={e => setBaseColor(e.target.value)}
                          className="w-3.5 h-3.5 cursor-pointer p-0 border-0 bg-transparent opacity-0 absolute inset-0"
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: baseColor }}
                        />
                      </label>
                    </div>
                  )}

                  {baseImage && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      <ImageIcon className="w-3 h-3" /> Custom Base Image
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Simplified Light: ON / OFF Control Switch */}
                  <div className="flex items-center gap-1 bg-white/10 dark:bg-black/50 rounded-lg p-0.5 border border-white/15">
                    <span className="text-[10px] font-bold text-neutral-300 px-1.5 flex items-center gap-1 select-none">
                      <Lightbulb className={`w-3.5 h-3.5 ${isLightOn ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
                      <span>Light:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLightOn(true)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black transition-all ${
                        isLightOn
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Turn Lightbox Illumination ON"
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLightOn(false)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black transition-all ${
                        !isLightOn
                          ? 'bg-slate-200 text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Turn Lightbox Illumination OFF"
                    >
                      OFF
                    </button>
                  </div>

                  {/* Human Scale Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowHumanScale(prev => !prev)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                      showHumanScale
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                    }`}
                    title="Toggle 1.75m Human Scale Reference"
                  >
                    <User className="w-3 h-3" />
                    <span>1.75m</span>
                  </button>
                </div>
              </div>

              {/* Preview Stage - Renders BASE SIZES Outer Box & Lightbox sizes Inner Box */}
              <div
                ref={stageRef}
                className={`w-full h-72 sm:h-80 flex items-center justify-center relative p-3 sm:p-5 transition-colors duration-200 overflow-hidden ${
                  isLightOn
                    ? 'bg-gradient-to-b from-[#0a0d17] via-[#0e1220] to-[#121629]'
                    : 'bg-[#181a24]'
                }`}
              >
                {/* Background Wall Texture Grid */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Main Visualizer Container */}
                <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 max-w-full max-h-full">
                  
                  {/* Left Height Dimension Lines for BASE SIZES */}
                  <div
                    className="flex flex-col items-center justify-between select-none shrink-0 py-0.5"
                    style={{ height: `${baseBoxH}px` }}
                  >
                    <span className="text-[8px] font-mono text-cyan-400 font-bold leading-none select-none">▲</span>
                    <div className="my-auto py-1 flex items-center justify-center">
                      <span className="inline-block bg-black/90 px-1 py-0.5 rounded border border-cyan-400/50 text-cyan-300 whitespace-nowrap text-[8px] sm:text-[9px] font-mono font-bold -rotate-90 origin-center select-none shadow-xs">
                        {numBaseHeight} {unit.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-cyan-400 font-bold leading-none select-none">▼</span>
                  </div>

                  {/* Center Column: Outer BASE SIZES Container with Nested Lightbox sizes Box */}
                  <div className="flex flex-col items-center shrink-0">
                    
                    {/* Top Width Dimension for BASE SIZES */}
                    <div
                      className="flex flex-col items-center select-none pb-1"
                      style={{ width: `${baseBoxW}px` }}
                    >
                      <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-mono text-cyan-400 font-bold px-0.5 mb-1 gap-1">
                        <span className="leading-none select-none">◀</span>
                        <div className="flex-1 flex justify-center min-w-0">
                          <span className="bg-black/90 px-1.5 py-0.5 rounded border border-cyan-400/50 text-cyan-300 whitespace-nowrap text-[8px] sm:text-[9px] font-mono font-bold shadow-xs truncate max-w-full select-none">
                            BASE: {numBaseWidth} {unit.toUpperCase()} ({baseFeetW.toFixed(1)}')
                          </span>
                        </div>
                        <span className="leading-none select-none">▶</span>
                      </div>
                      <div className="w-full h-px bg-cyan-400/50 border-t border-dashed border-cyan-400" />
                    </div>

                    {/* Outer Box: BASE SIZES Frame */}
                    <div
                      style={{
                        width: `${baseBoxW}px`,
                        height: `${baseBoxH}px`,
                        backgroundColor: baseColor,
                      }}
                      className={`relative rounded-xl overflow-hidden flex transition-all duration-150 ease-out will-change-[width,height] shadow-2xl border border-black/40 ring-1 ring-white/10 ${
                        alignment === 'top'
                          ? 'items-start justify-center pt-2 sm:pt-3'
                          : alignment === 'bottom'
                          ? 'items-end justify-center pb-2 sm:pb-3'
                          : 'items-center justify-center'
                      }`}
                    >
                      {/* Inserted Base Custom Image Layer (Full bleed) */}
                      {baseImage && (
                        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                          {baseImageFit === 'tile' ? (
                            <div
                              className="w-full h-full"
                              style={{
                                backgroundImage: `url(${baseImage})`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: '80px auto',
                              }}
                            />
                          ) : (
                            <img
                              src={baseImage}
                              alt="Base Background"
                              className={`w-full h-full block ${
                                baseImageFit === 'fill' ? 'object-fill' : 'object-cover'
                              }`}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                        </div>
                      )}

                      {/* Prominent "BASE SIZES" Label on top left of outer frame */}
                      <div className="absolute top-1 left-2 sm:top-1.5 sm:left-2.5 z-20 pointer-events-none flex items-center gap-1 select-none">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-200 dark:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/50 px-1.5 py-0.5 rounded">
                          BASE SIZES
                        </span>
                      </div>

                      {/* INNER BOX: Lightbox sizes (Clean, FULL BLEED, WITHOUT ANY WHITE LINE OR INNER BEZEL) */}
                      <div
                        style={{
                          width: `${lightboxBoxW}px`,
                          height: `${lightboxBoxH}px`,
                        }}
                        className={`relative rounded-md flex items-center justify-center transition-all duration-150 ease-out will-change-[width,height] z-10 overflow-hidden ${
                          lightboxImage
                            ? isLightOn
                              ? 'shadow-[0_0_35px_rgba(251,191,36,0.6),0_0_15px_rgba(255,255,255,0.7)] ring-1 ring-black/40'
                              : 'shadow-md ring-1 ring-black/30'
                            : isLightOn
                            ? 'border-2 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.7),inset_0_0_20px_rgba(255,255,255,0.9)] bg-gradient-to-tr from-amber-100 via-amber-50 to-white text-slate-900'
                            : 'border-2 border-slate-400 bg-slate-200 text-slate-800 shadow-md'
                        }`}
                      >
                        {/* Custom Uploaded Lightbox Image: 100% FULL BLEED, NO PADDING, NO WHITE BORDER */}
                        {lightboxImage ? (
                          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                            <img
                              src={lightboxImage}
                              alt="Lightbox Artwork"
                              className={`w-full h-full block transition-all duration-200 ${
                                lightboxImageFit === 'cover'
                                  ? 'object-cover'
                                  : lightboxImageFit === 'contain'
                                  ? 'object-contain'
                                  : 'object-fill'
                              } ${
                                isLightOn
                                  ? 'brightness-110 contrast-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                  : 'brightness-95 contrast-100'
                              }`}
                            />
                            {/* Soft warm diffusion glow ONLY when light is ON */}
                            {isLightOn && (
                              <div className="absolute inset-0 bg-amber-300/10 mix-blend-overlay pointer-events-none" />
                            )}
                          </div>
                        ) : (
                          /* Default Text Inside Lightbox if no image */
                          <div className="p-1 sm:p-2 flex flex-col items-center justify-center text-center select-none overflow-hidden max-w-full z-0">
                            <span
                              className={`font-black tracking-wide uppercase transition-all ${
                                isLightOn ? 'text-slate-900' : 'text-slate-800'
                              } ${lightboxBoxW < 90 || lightboxBoxH < 45 ? 'text-[8px]' : 'text-xs sm:text-sm'}`}
                            >
                              Lightbox sizes
                            </span>

                            {lightboxBoxH > 55 && lightboxBoxW > 110 && (
                              <span className="text-[9px] font-mono font-bold text-slate-700/80 mt-0.5">
                                {numWidth} × {numHeight} {unit.toUpperCase()}
                              </span>
                            )}

                            {lightboxBoxH > 75 && lightboxBoxW > 130 && (
                              <span className="text-[8px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-black/5 mt-0.5">
                                HALO SIGN ({shapeInfo.ratioStr})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Margin Clearance Markers */}
                      {leftRightMargin > 0 && baseBoxW - lightboxBoxW > 30 && (
                        <div className="absolute bottom-1 right-2 pointer-events-none text-[8px] font-mono font-bold text-cyan-300 bg-black/70 px-1 rounded z-20">
                          Margin: {leftRightMargin.toFixed(1)} {unit}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Human Silhouette Reference */}
                  {showHumanScale && (
                    <div
                      className="flex flex-col items-center justify-end shrink-0 select-none self-end pb-1"
                      style={{ height: `${humanHeightPx}px` }}
                    >
                      <div className="w-3 h-3 rounded-full bg-purple-400/90 mb-0.5" />
                      <div className="w-3.5 flex-1 bg-purple-400/80 rounded-t-sm" />
                      <div className="w-3 h-1/2 flex gap-0.5 mt-0.5">
                        <div className="flex-1 bg-purple-400/80 rounded-b-sm" />
                        <div className="flex-1 bg-purple-400/80 rounded-b-sm" />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-purple-300 mt-0.5 whitespace-nowrap">
                        1.75m
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Canvas Specs Summary */}
              <div className="px-3 py-2 bg-slate-950/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-300">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    <strong className="text-white">BASE SIZES:</strong> {numBaseWidth} × {numBaseHeight} {unit} ({baseAreaSqFt.toFixed(1)} sq ft)
                  </span>
                  <span className="text-neutral-500">|</span>
                  <span>
                    <strong className="text-amber-400">Lightbox sizes:</strong> {numWidth} × {numHeight} {unit} ({lightboxAreaSqFt.toFixed(1)} sq ft)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">
                    Light: <span className={isLightOn ? 'text-amber-300' : 'text-neutral-400'}>{isLightOn ? 'ON' : 'OFF'}</span> | Orientation: <span className="capitalize">{shapeInfo.type}</span> ({shapeInfo.ratioStr})
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer with Actions */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#0c122c] border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Apply Base Size to Calculator */}
              {onApplyBaseToCalculator && (
                <button
                  type="button"
                  onClick={handleApplyBaseToCalc}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-neutral-200 font-bold text-xs transition-all active:scale-95"
                  title="Update main calculator width and height to Base Sizes"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>{appliedBaseToast ? 'Applied to Calculator!' : 'Apply Base Size to Calculator'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopySpecs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-neutral-200 font-bold text-xs transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Specs!' : 'Copy Specs'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/30 ml-auto"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
