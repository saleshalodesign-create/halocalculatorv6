import React, { useState, useEffect, memo } from 'react';
import {
  Box,
  Zap,
  Image as ImageIcon,
  Printer,
  Scissors,
  Lightbulb,
  Layers,
  Edit2,
} from 'lucide-react';

interface MacPricingCardProps {
  title: string;
  subtitle?: string;
  price: number;
  rate?: number;
  rateUnit?: string;
  iconType: 'lightbox' | 'lightboxBacklit' | 'backlit' | 'trans' | 'printed3d' | 'vinylSticker' | 'ledStrip' | 'acrylic';
  iconBg?: string;
  isSelected?: boolean;
  onClick: () => void;
  onRateChange?: (newRate: number) => void;
}

const cardThemes: Record<MacPricingCardProps['iconType'], {
  selectedDarkBg: string;
  selectedDarkBorder: string;
  selectedDarkShadow: string;
  selectedPriceText: string;
  selectedTitleText: string;
  selectedLightBg: string;
  selectedLightBorder: string;
  hoverBorder: string;
  hoverPriceText: string;
  hoverTitleText: string;
  hoverBgDark: string;
  hoverBgLight: string;
  lightBg: string;
  lightBorder: string;
  lightRateBadge: string;
}> = {
  lightbox: {
    selectedDarkBg: 'dark:bg-amber-950/40',
    selectedDarkBorder: 'dark:border-amber-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(245,158,11,0.35)]',
    selectedPriceText: 'text-amber-600 dark:text-amber-400',
    selectedTitleText: 'text-amber-700 dark:text-amber-300',
    selectedLightBg: 'bg-amber-50/95',
    selectedLightBorder: 'border-amber-400',
    hoverBorder: 'hover:border-amber-500/70 dark:hover:border-amber-400/70',
    hoverPriceText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    hoverTitleText: 'group-hover:text-amber-700 dark:group-hover:text-amber-300',
    hoverBgDark: 'dark:hover:bg-[#1f1d18]',
    hoverBgLight: 'hover:bg-amber-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-amber-100/80 border-slate-300/90 hover:border-amber-300',
  },
  lightboxBacklit: {
    selectedDarkBg: 'dark:bg-rose-950/40',
    selectedDarkBorder: 'dark:border-rose-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(244,63,94,0.35)]',
    selectedPriceText: 'text-rose-600 dark:text-rose-400',
    selectedTitleText: 'text-rose-700 dark:text-rose-300',
    selectedLightBg: 'bg-rose-50/95',
    selectedLightBorder: 'border-rose-400',
    hoverBorder: 'hover:border-rose-500/70 dark:hover:border-rose-400/70',
    hoverPriceText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    hoverTitleText: 'group-hover:text-rose-700 dark:group-hover:text-rose-300',
    hoverBgDark: 'dark:hover:bg-[#22181f]',
    hoverBgLight: 'hover:bg-rose-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-rose-100/80 border-slate-300/90 hover:border-rose-300',
  },
  backlit: {
    selectedDarkBg: 'dark:bg-blue-950/40',
    selectedDarkBorder: 'dark:border-blue-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(59,130,246,0.35)]',
    selectedPriceText: 'text-blue-600 dark:text-blue-400',
    selectedTitleText: 'text-blue-700 dark:text-blue-300',
    selectedLightBg: 'bg-blue-50/95',
    selectedLightBorder: 'border-blue-400',
    hoverBorder: 'hover:border-blue-500/70 dark:hover:border-blue-400/70',
    hoverPriceText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    hoverTitleText: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
    hoverBgDark: 'dark:hover:bg-[#151a25]',
    hoverBgLight: 'hover:bg-blue-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-blue-100/80 border-slate-300/90 hover:border-blue-300',
  },
  trans: {
    selectedDarkBg: 'dark:bg-indigo-950/40',
    selectedDarkBorder: 'dark:border-indigo-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(99,102,241,0.35)]',
    selectedPriceText: 'text-indigo-600 dark:text-indigo-400',
    selectedTitleText: 'text-indigo-700 dark:text-indigo-300',
    selectedLightBg: 'bg-indigo-50/95',
    selectedLightBorder: 'border-indigo-400',
    hoverBorder: 'hover:border-indigo-500/70 dark:hover:border-indigo-400/70',
    hoverPriceText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    hoverTitleText: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
    hoverBgDark: 'dark:hover:bg-[#1a1725]',
    hoverBgLight: 'hover:bg-indigo-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-indigo-100/80 border-slate-300/90 hover:border-indigo-300',
  },
  printed3d: {
    selectedDarkBg: 'dark:bg-orange-950/40',
    selectedDarkBorder: 'dark:border-orange-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(249,115,22,0.35)]',
    selectedPriceText: 'text-orange-600 dark:text-orange-400',
    selectedTitleText: 'text-orange-700 dark:text-orange-300',
    selectedLightBg: 'bg-orange-50/95',
    selectedLightBorder: 'border-orange-400',
    hoverBorder: 'hover:border-orange-500/70 dark:hover:border-orange-400/70',
    hoverPriceText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
    hoverTitleText: 'group-hover:text-orange-700 dark:group-hover:text-orange-300',
    hoverBgDark: 'dark:hover:bg-[#221a16]',
    hoverBgLight: 'hover:bg-orange-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-orange-100/80 border-slate-300/90 hover:border-orange-300',
  },
  vinylSticker: {
    selectedDarkBg: 'dark:bg-fuchsia-950/40',
    selectedDarkBorder: 'dark:border-fuchsia-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(217,70,239,0.35)]',
    selectedPriceText: 'text-fuchsia-600 dark:text-fuchsia-400',
    selectedTitleText: 'text-fuchsia-700 dark:text-fuchsia-300',
    selectedLightBg: 'bg-fuchsia-50/95',
    selectedLightBorder: 'border-fuchsia-400',
    hoverBorder: 'hover:border-fuchsia-500/70 dark:hover:border-fuchsia-400/70',
    hoverPriceText: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400',
    hoverTitleText: 'group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300',
    hoverBgDark: 'dark:hover:bg-[#221624]',
    hoverBgLight: 'hover:bg-fuchsia-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-fuchsia-100/80 border-slate-300/90 hover:border-fuchsia-300',
  },
  ledStrip: {
    selectedDarkBg: 'dark:bg-emerald-950/40',
    selectedDarkBorder: 'dark:border-emerald-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(16,185,129,0.35)]',
    selectedPriceText: 'text-emerald-600 dark:text-emerald-400',
    selectedTitleText: 'text-emerald-700 dark:text-emerald-300',
    selectedLightBg: 'bg-emerald-50/95',
    selectedLightBorder: 'border-emerald-400',
    hoverBorder: 'hover:border-emerald-500/70 dark:hover:border-emerald-400/70',
    hoverPriceText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    hoverTitleText: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
    hoverBgDark: 'dark:hover:bg-[#14221b]',
    hoverBgLight: 'hover:bg-emerald-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-emerald-100/80 border-slate-300/90 hover:border-emerald-300',
  },
  acrylic: {
    selectedDarkBg: 'dark:bg-teal-950/40',
    selectedDarkBorder: 'dark:border-teal-400',
    selectedDarkShadow: 'dark:shadow-[0_0_24px_rgba(20,184,166,0.35)]',
    selectedPriceText: 'text-teal-600 dark:text-teal-400',
    selectedTitleText: 'text-teal-700 dark:text-teal-300',
    selectedLightBg: 'bg-teal-50/95',
    selectedLightBorder: 'border-teal-400',
    hoverBorder: 'hover:border-teal-500/70 dark:hover:border-teal-400/70',
    hoverPriceText: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    hoverTitleText: 'group-hover:text-teal-700 dark:group-hover:text-teal-300',
    hoverBgDark: 'dark:hover:bg-[#132022]',
    hoverBgLight: 'hover:bg-teal-50/60',
    lightBg: 'bg-slate-100/95',
    lightBorder: 'border-slate-200/90',
    lightRateBadge: 'bg-slate-200/85 hover:bg-teal-100/80 border-slate-300/90 hover:border-teal-300',
  },
};

const MacPricingCardComponent: React.FC<MacPricingCardProps> = ({
  title,
  subtitle,
  price,
  rate,
  rateUnit = '/SQ FT',
  iconType,
  iconBg = "bg-gradient-to-tr from-blue-600 to-indigo-500",
  isSelected = false,
  onClick,
  onRateChange,
}) => {
  const [localRate, setLocalRate] = useState<string>(rate !== undefined ? rate.toString() : '');
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const theme = cardThemes[iconType] || cardThemes.lightbox;

  const isLit = isSelected || isClicked;

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 600);
    onClick();
  };

  useEffect(() => {
    if (rate !== undefined) {
      setLocalRate(rate.toString());
    }
  }, [rate]);

  const handleRateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalRate(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0 && onRateChange) {
      onRateChange(parsed);
    }
  };

  const getIcon = () => {
    switch (iconType) {
      case 'lightbox': return <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'lightboxBacklit': return <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'backlit': return <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'trans': return <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'printed3d': return <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'vinylSticker': return <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'ledStrip': return <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      case 'acrylic': return <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
      default: return <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />;
    }
  };

  const formattedPrice = Math.round(price).toLocaleString('en-US');

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-xl sm:rounded-2xl lg:rounded-2xl xl:rounded-3xl p-2 sm:p-3 lg:p-4.5 xl:p-5.5 2xl:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[76px] sm:min-h-[96px] lg:min-h-[148px] xl:min-h-[172px] 2xl:min-h-[192px] gpu-layer active:scale-[0.98] ${
        isLit
          ? `${theme.selectedLightBg} ${theme.selectedDarkBg} border-2 ${theme.selectedLightBorder} ${theme.selectedDarkBorder} ${theme.selectedDarkShadow} ring-2 ring-current/20 shadow-md`
          : `${theme.lightBg} ${theme.hoverBgLight} dark:bg-[#181920]/95 ${theme.hoverBgDark} backdrop-blur-md border ${theme.lightBorder} dark:border-white/10 ${theme.hoverBorder} shadow-sm hover:shadow-md hover:-translate-y-0.5`
      }`}
    >
      {/* Top Row: Icon + Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3.5 2xl:gap-4 min-w-0">
        <div
          className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-13.5 2xl:h-13.5 rounded-lg lg:rounded-xl xl:rounded-2xl ${iconBg} text-white flex items-center justify-center shadow-sm shrink-0 transition-transform ${
            isLit ? 'scale-105 shadow-md' : 'group-hover:scale-105'
          }`}
        >
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className={`font-extrabold text-[11px] sm:text-xs lg:text-[14px] xl:text-base 2xl:text-lg tracking-tight leading-snug truncate transition-colors ${
              isLit
                ? `${theme.selectedTitleText}`
                : `text-black dark:text-white ${theme.hoverTitleText}`
            }`}
          >
            {title}
          </h4>
          {subtitle && (
            <span className="text-[8.5px] sm:text-[9.5px] lg:text-xs xl:text-[13px] 2xl:text-sm font-semibold text-slate-500 dark:text-neutral-400 block truncate leading-none mt-0.5 sm:mt-1">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Rate Badge & Total Price */}
      <div className="mt-1.5 sm:mt-2 lg:mt-3 xl:mt-4 pt-1 sm:pt-1.5 lg:pt-2.5 xl:pt-3 flex items-center justify-between gap-1 flex-nowrap border-t border-black/5 dark:border-white/[0.04]">
        {/* Editable Rate Pill ($ 35 /SQ FT) */}
        {rate !== undefined ? (
          <div
            onClick={e => e.stopPropagation()}
            className={`inline-flex items-center gap-0.5 sm:gap-1 lg:gap-1.5 xl:gap-2 px-1.5 sm:px-2 lg:px-2.5 xl:px-3 2xl:px-3.5 py-0.5 lg:py-1 xl:py-1.5 rounded-md lg:rounded-lg xl:rounded-xl ${theme.lightRateBadge} dark:bg-[#0c0d0f] border dark:border-white/15 hover:border-blue-400/60 focus-within:border-blue-500 shadow-sm shrink-0 transition-colors group/rate cursor-text`}
            title="Click to edit rate"
          >
            <span className="text-[8px] sm:text-[10px] lg:text-xs xl:text-sm font-bold text-slate-800 dark:text-neutral-400 select-none">$</span>
            {onRateChange ? (
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={localRate}
                onChange={handleRateInputChange}
                onFocus={e => e.target.select()}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                style={{
                  width: `${Math.max(2, (localRate || '').length) + 0.5}ch`,
                  minWidth: '18px',
                }}
                className="text-center text-[9px] sm:text-[11px] lg:text-xs xl:text-sm 2xl:text-base font-black text-black dark:text-white bg-transparent outline-none border-b border-transparent focus:border-blue-500 hover:border-slate-400 dark:hover:border-white/30 transition-colors font-mono p-0"
                title="Edit rate"
              />
            ) : (
              <span className="text-[9px] sm:text-[11px] lg:text-xs xl:text-sm 2xl:text-base font-black text-black dark:text-white font-mono">{rate}</span>
            )}
            <span className="text-[7.5px] sm:text-[9px] lg:text-[10.5px] xl:text-xs 2xl:text-sm font-bold text-slate-700 dark:text-neutral-400 tracking-tight uppercase select-none">{rateUnit}</span>
            <Edit2 className="w-2 h-2 lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-slate-500 dark:text-neutral-500 group-hover/rate:text-blue-600 dark:group-hover/rate:text-blue-400 opacity-75 group-hover/rate:opacity-100 transition-opacity hidden sm:inline shrink-0" />
          </div>
        ) : (
          <div />
        )}

        {/* Calculated Total */}
        <span
          className={`font-black font-mono tracking-tight transition-colors whitespace-nowrap shrink-0 text-right ${
            isLit
              ? `${theme.selectedPriceText}`
              : `text-black dark:text-white ${theme.hoverPriceText}`
          } ${
            formattedPrice.length > 7
              ? 'text-xs sm:text-sm lg:text-lg xl:text-xl 2xl:text-2xl'
              : formattedPrice.length > 5
              ? 'text-xs sm:text-base lg:text-xl xl:text-2xl 2xl:text-3xl'
              : 'text-xs sm:text-lg lg:text-2xl xl:text-3xl 2xl:text-4xl'
          }`}
        >
          ${formattedPrice}
        </span>
      </div>
    </div>
  );
};

export const MacPricingCard = memo(MacPricingCardComponent);
