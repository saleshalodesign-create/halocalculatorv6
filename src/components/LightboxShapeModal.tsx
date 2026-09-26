import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeftRight,
  Sun,
  Moon,
  Lightbulb,
  User,
  Maximize2,
} from 'lucide-react';
import { UnitType, Unit } from '../types';
import { convertToInches } from '../utils/calculator';
import { useLanguage } from '../context/LanguageContext';

interface LightboxShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  width: string;
  height: string;
  unit: UnitType;
  onUpdateWidth: (w: string) => void;
  onUpdateHeight: (h: string) => void;
  onUpdateUnit?: (u: UnitType) => void;
}

export const LightboxShapeModal: React.FC<LightboxShapeModalProps> = ({
  isOpen,
  onClose,
  width,
  height,
  unit,
  onUpdateWidth,
  onUpdateHeight,
  onUpdateUnit,
}) => {
  const { language } = useLanguage();
  const [lightingMode, setLightingMode] = useState<'on' | 'off' | 'night'>('on');
  const [showHumanScale, setShowHumanScale] = useState(false);

  const numWidth = parseFloat(width) || 0;
  const numHeight = parseFloat(height) || 0;

  // Real world dimensions normalized to inches and meters
  const widthInches = useMemo(() => convertToInches(numWidth, unit), [numWidth, unit]);
  const heightInches = useMemo(() => convertToInches(numHeight, unit), [numHeight, unit]);
  const widthFeet = widthInches / 12;
  const heightFeet = heightInches / 12;
  const widthCm = widthInches * 2.54;

  // Shape classification
  const shapeInfo = useMemo(() => {
    if (numWidth <= 0 || numHeight <= 0) {
      return {
        type: 'invalid' as const,
        ratioStr: '—',
        ratioValue: 1,
      };
    }

    const diffPct = Math.abs(widthInches - heightInches) / Math.max(widthInches, heightInches);

    if (diffPct < 0.015) {
      // Within 1.5% is treated as Square
      return {
        type: 'square' as const,
        ratioStr: '1 : 1',
        ratioValue: 1,
      };
    }

    if (widthInches > heightInches) {
      const r = widthInches / heightInches;
      return {
        type: 'horizontal' as const,
        ratioStr: `${r.toFixed(2)} : 1`,
        ratioValue: r,
      };
    }

    const r = heightInches / widthInches;
    return {
      type: 'vertical' as const,
      ratioStr: `1 : ${r.toFixed(2)}`,
      ratioValue: 1 / r,
    };
  }, [widthInches, heightInches, numWidth, numHeight]);

  // Responsive Stage Container measurement with frame optimization
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 420, height: 260 });

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

  // Scaled canvas dimensions to fit viewport safely across all mobile & desktop screen sizes
  const { boxW, boxH, scaleFactor } = useMemo(() => {
    // Stage clearance allocations:
    // Width: left height ruler (~36px) + gap (~12px) + human scale if enabled (~36px) + stage padding (~24px)
    const requiredNonBoxW = showHumanScale ? 108 : 72;
    // Height: top width ruler (~34px) + stage vertical padding (~24px)
    const requiredNonBoxH = 58;

    const maxW = Math.max(40, stageSize.width - requiredNonBoxW);
    const maxH = Math.max(30, stageSize.height - requiredNonBoxH);

    if (numWidth <= 0 || numHeight <= 0) {
      const defaultDim = Math.min(maxW, maxH, 120);
      return { boxW: defaultDim, boxH: defaultDim, scaleFactor: 1 };
    }

    const aspect = widthInches / heightInches;
    let w = maxW;
    let h = w / aspect;

    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }

    // Safety clamps
    w = Math.max(26, Math.min(maxW, Math.round(w)));
    h = Math.max(20, Math.min(maxH, Math.round(h)));

    return {
      boxW: w,
      boxH: h,
      scaleFactor: h / (heightInches || 1),
    };
  }, [widthInches, heightInches, numWidth, numHeight, stageSize, showHumanScale]);

  // Human scale height relative to the box (human average 1.75m / 68.9 inches)
  const humanHeightPx = useMemo(() => {
    if (numWidth <= 0 || numHeight <= 0) return 70;
    const humanInches = 68.9; // ~175cm
    const targetH = humanInches * scaleFactor;
    return Math.max(20, Math.min(stageSize.height - 50, Math.round(targetH)));
  }, [scaleFactor, numWidth, numHeight, stageSize.height]);

  const handleSwapDimensions = () => {
    const temp = width;
    onUpdateWidth(height);
    onUpdateHeight(temp);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-[#0a0f24] border border-slate-200 dark:border-indigo-500/25 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh]"
        >
          {/* Ambient Cyber Neon Crown Accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90 shrink-0"></div>

          {/* macOS Title Bar */}
          <div className="h-10 px-3 sm:px-4 bg-slate-100/95 dark:bg-[#0c122c] border-b border-slate-200 dark:border-indigo-500/20 flex items-center justify-between select-none shrink-0 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
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
              <span className="truncate">Lightbox Shape & Aspect Ratio Inspector</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-2.5 sm:p-4 space-y-3.5 overflow-y-auto mac-scrollbar">
            {/* Quick Sizing & Rotation Bar */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-100/90 dark:bg-[#0d1433] border border-slate-200 dark:border-indigo-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
              {/* Sizes Inputs */}
              <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider text-[11px] shrink-0">
                  Sizes ({unit.toUpperCase()}):
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-white dark:bg-[#050817] rounded-lg px-2 py-1 border border-slate-300 dark:border-indigo-500/25 shadow-inner">
                    <span className="text-slate-400 dark:text-neutral-500 font-bold text-[10px] mr-1">W:</span>
                    <input
                      type="number"
                      step="any"
                      value={width}
                      onChange={e => onUpdateWidth(e.target.value)}
                      className="w-14 sm:w-16 font-mono font-bold text-center bg-transparent outline-none text-slate-900 dark:text-white"
                      placeholder="W"
                    />
                  </div>
                  <span className="text-slate-400 font-bold px-0.5">×</span>
                  <div className="flex items-center bg-white dark:bg-[#121316] rounded-lg px-2 py-1 border border-slate-300 dark:border-white/15 shadow-inner">
                    <span className="text-slate-400 dark:text-neutral-500 font-bold text-[10px] mr-1">H:</span>
                    <input
                      type="number"
                      step="any"
                      value={height}
                      onChange={e => onUpdateHeight(e.target.value)}
                      className="w-14 sm:w-16 font-mono font-bold text-center bg-transparent outline-none text-slate-900 dark:text-white"
                      placeholder="H"
                    />
                  </div>
                </div>
              </div>

              {/* Units & Swap Button directly beside each other */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                {onUpdateUnit && (
                  <div className="flex p-0.5 rounded-lg bg-white dark:bg-[#121316] border border-slate-300 dark:border-white/10 shadow-sm shrink-0">
                    {[Unit.IN, Unit.FT, Unit.CM, Unit.MM, Unit.M].map(u => (
                      <button
                        key={u}
                        onClick={() => onUpdateUnit(u)}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
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

                {/* Swap Dimensions Button */}
                <button
                  onClick={handleSwapDimensions}
                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 transition-all active:scale-95 shadow-sm shrink-0 flex items-center justify-center"
                  title="Swap Width and Height (Flip Orientation)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Visualizer Canvas */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900 text-white overflow-hidden relative shadow-inner">
              {/* Canvas Controls Header */}
              <div className="px-2.5 sm:px-3 py-2 bg-slate-950/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium select-none">
                <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-semibold text-slate-300">Visualizer</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Lighting Mode Selector */}
                  <div className="flex items-center bg-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => setLightingMode('on')}
                      className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        lightingMode === 'on'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                      title="Illuminated LED Frontlight"
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>Lit</span>
                    </button>
                    <button
                      onClick={() => setLightingMode('off')}
                      className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        lightingMode === 'off'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                      title="Daylight Off State"
                    >
                      <Sun className="w-3 h-3" />
                      <span>Day</span>
                    </button>
                    <button
                      onClick={() => setLightingMode('night')}
                      className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        lightingMode === 'night'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                      title="Night Ambient Backlit Glow"
                    >
                      <Moon className="w-3 h-3" />
                      <span>Night</span>
                    </button>
                  </div>

                  {/* Human Silhouette Comparison Toggle */}
                  <button
                    onClick={() => setShowHumanScale(prev => !prev)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all ${
                      showHumanScale
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                    }`}
                    title="Toggle 1.75m Human Scale Reference"
                  >
                    <User className="w-3 h-3" />
                    <span>Scale</span>
                  </button>
                </div>
              </div>

              {/* Preview Area Stage */}
              <div
                ref={stageRef}
                className={`w-full h-64 sm:h-72 flex items-center justify-center relative p-3 sm:p-4 transition-colors duration-200 overflow-hidden ${
                  lightingMode === 'night'
                    ? 'bg-[#06080e]'
                    : lightingMode === 'off'
                    ? 'bg-[#181a20]'
                    : 'bg-gradient-to-b from-[#0f1118] to-[#161822]'
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

                {/* Visualizer Row Layout: Left Height Ruler + Center Box & Top Ruler + Right Human Scale */}
                <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 max-w-full max-h-full">
                  {/* Left Height Dimension Line */}
                  <div
                    className="flex flex-col items-center justify-between select-none shrink-0 py-0.5"
                    style={{ height: `${boxH}px` }}
                  >
                    <span className="text-[8px] font-mono text-amber-400 font-bold leading-none select-none">▲</span>
                    <div className="my-auto py-1 flex items-center justify-center">
                      <span className="inline-block bg-black/85 px-1 py-0.5 rounded border border-amber-400/40 text-amber-300 whitespace-nowrap text-[8px] sm:text-[9px] font-mono font-bold -rotate-90 origin-center select-none shadow-xs">
                        {numHeight} {unit.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-amber-400 font-bold leading-none select-none">▼</span>
                  </div>

                  {/* Center Column: Top Width Dimension + Lightbox Box */}
                  <div className="flex flex-col items-center shrink-0">
                    {/* Top Width Dimension Line */}
                    <div
                      className="flex flex-col items-center select-none pb-1.5"
                      style={{ width: `${boxW}px` }}
                    >
                      <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-mono text-cyan-400 font-bold px-0.5 mb-1 gap-1">
                        <span className="leading-none select-none">◀</span>
                        <div className="flex-1 flex justify-center min-w-0">
                          <span className="bg-black/85 px-1.5 py-0.5 rounded border border-cyan-400/40 text-cyan-300 whitespace-nowrap text-[8px] sm:text-[9px] font-mono font-bold shadow-xs truncate max-w-full select-none">
                            {numWidth} {unit.toUpperCase()} ({widthFeet.toFixed(1)}')
                          </span>
                        </div>
                        <span className="leading-none select-none">▶</span>
                      </div>
                      <div className="w-full h-px bg-cyan-400/50 border-t border-dashed border-cyan-400" />
                    </div>

                    {/* Scaled Proportional Lightbox Box - GPU accelerated CSS transitions without lag */}
                    <div
                      style={{
                        width: `${boxW}px`,
                        height: `${boxH}px`,
                      }}
                      className={`relative rounded-lg flex items-center justify-center transition-all duration-150 ease-out will-change-[width,height] ${
                        lightingMode === 'on'
                          ? 'border-2 border-amber-300/80 shadow-[0_0_35px_rgba(251,191,36,0.55),inset_0_0_20px_rgba(255,255,255,0.8)] bg-gradient-to-tr from-amber-100 via-amber-50 to-white'
                          : lightingMode === 'night'
                          ? 'border-2 border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.7),0_0_15px_rgba(255,255,255,0.9)] bg-gradient-to-tr from-cyan-100 via-white to-amber-50'
                          : 'border-2 border-slate-400/80 bg-slate-200/90 shadow-md'
                      }`}
                    >
                      {/* Aluminum Edge Bezel / Extrusion Simulation */}
                      <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/40 shadow-inner" />

                      {/* Corner Mounting Screws/Accents */}
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-500/60" />
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-500/60" />
                      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-500/60" />
                      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-500/60" />

                      {/* Content inside lightbox */}
                      <div className="p-1 sm:p-2 flex flex-col items-center justify-center text-center select-none overflow-hidden max-w-full">
                        <span
                          className={`font-black tracking-widest uppercase transition-all ${
                            lightingMode === 'off'
                              ? 'text-slate-700'
                              : 'text-slate-900 drop-shadow-sm'
                          } ${boxW < 80 || boxH < 50 ? 'text-[8px]' : 'text-xs sm:text-sm'}`}
                        >
                          HALO
                        </span>
                        {boxH > 60 && boxW > 90 && (
                          <span className="text-[9px] font-bold text-slate-600/80 tracking-tight mt-0.5">
                            LIGHTBOX
                          </span>
                        )}
                        {boxH > 80 && boxW > 120 && (
                          <span className="text-[8px] font-mono text-slate-500 mt-1 px-1.5 py-0.5 rounded bg-black/5 font-semibold">
                            {shapeInfo.ratioStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Human Silhouette Reference */}
                  {showHumanScale && (
                    <div
                      className="flex flex-col items-center justify-end shrink-0 select-none self-end pb-1"
                      style={{ height: `${humanHeightPx}px` }}
                    >
                      {/* Human Head */}
                      <div className="w-3 h-3 rounded-full bg-purple-400/90 mb-0.5" />
                      {/* Human Body */}
                      <div className="w-3.5 flex-1 bg-purple-400/80 rounded-t-sm" />
                      {/* Human Legs */}
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

              {/* Bottom Canvas Footer Info */}
              <div className="px-2.5 sm:px-3 py-2 bg-slate-950/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
                <span>
                  Orientation: <strong className="text-white capitalize">{shapeInfo.type}</strong>
                </span>
                <span>
                  Aspect Ratio: <strong className="text-cyan-400">{shapeInfo.ratioStr}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#121316] border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500 dark:text-neutral-400 hidden sm:inline">
              Changes update calculator pricing in real time
            </span>
            <button
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
