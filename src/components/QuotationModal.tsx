import React, { useState, useEffect } from 'react';
import { QuoteItem, RatesConfig, LanguageType } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { Check, Plus, Copy } from 'lucide-react';
import { getTranslation } from '../data/translations';

interface QuotationModalProps {
  isOpen: boolean;
  data: QuoteItem | null;
  onClose: () => void;
  onAddToQuote: (item?: QuoteItem) => void;
  rates?: RatesConfig;
  language?: LanguageType;
}

const itemColorMap: Record<string, { badge: string; border: string }> = {
  lightbox: { badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', border: 'border-amber-500/30' },
  lightboxBacklit: { badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', border: 'border-rose-500/30' },
  backlit: { badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', border: 'border-blue-500/30' },
  trans: { badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', border: 'border-indigo-500/30' },
  printed3d: { badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', border: 'border-orange-500/30' },
  vinylSticker: { badge: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30', border: 'border-fuchsia-500/30' },
  ledStrip: { badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', border: 'border-emerald-500/30' },
  acrylic: { badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30', border: 'border-teal-500/30' },
};

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  data,
  onClose,
  onAddToQuote,
  rates,
  language = 'en',
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [editedPrice, setEditedPrice] = useState<string>('');
  const [editedTitle, setEditedTitle] = useState<string>('');
  const t = getTranslation(language);

  useEffect(() => {
    if (data) {
      setEditedPrice(data.totalPrice.toString());
      setEditedTitle(data.title);
      setShowFormula(false);
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const itemColor = data.priceKey ? itemColorMap[data.priceKey] : null;

  const currentPrice = parseFloat(editedPrice);
  const finalPrice = isNaN(currentPrice) ? 0 : currentPrice;
  const finalItem: QuoteItem = {
    ...data,
    title: editedTitle.trim() || data.title,
    totalPrice: finalPrice,
  };

  // Detailed Math Calculation Breakdown
  const isLedStrip =
    (data.title || '').toUpperCase().includes('LED STRIP') || data.priceKey === 'ledStrip';
  const widthInches = data.widthInches || 0;
  const heightInches = data.heightInches || 0;
  const widthFeet = widthInches / 12;
  const heightFeet = heightInches / 12;
  const areaSqFt = widthFeet * heightFeet;

  // Resolve rate
  let resolvedRate = data.rate;
  if (resolvedRate === undefined && rates) {
    if (isLedStrip) resolvedRate = rates.LED_STRIP ?? 17;
    else if (data.priceKey && rates[data.priceKey.toUpperCase()]) {
      resolvedRate = rates[data.priceKey.toUpperCase()];
    } else if (data.title.includes('LIGHTBOX W BACKLIT')) resolvedRate = rates.LIGHTBOX_W_BACKLIT ?? 85;
    else if (data.title.includes('LIGHTBOX')) resolvedRate = rates.LIGHTBOX ?? 50;
    else if (data.title.includes('BACKLIT')) resolvedRate = rates.BACKLIT ?? 35;
    else if (data.title.includes('TRANS')) resolvedRate = rates.TRANS ?? 45;
    else if (data.title.includes('PRINTED')) resolvedRate = rates.PRINTED_3D ?? 120;
    else if (data.title.includes('STICKER')) resolvedRate = rates.VINYL_STICKER ?? 20;
    else if (data.title.includes('ACRYLIC')) resolvedRate = rates.ACRYLIC ?? 15;
  }
  if (resolvedRate === undefined) {
    resolvedRate = areaSqFt > 0 ? Math.round(data.totalPrice / areaSqFt) : 50;
  }

  const rateUnit = data.rateUnit || (isLedStrip ? '/FT' : '/SQ FT');

  // LED Strip specific calculations
  const ledWUnits = widthInches / 39;
  const ledHUnits = heightInches / 5;
  const ledTotalUnits = ledWUnits * ledHUnits;
  const calculatedBasePrice = isLedStrip ? ledTotalUnits * resolvedRate : areaSqFt * resolvedRate;

  // Formatted Formula String for copying
  const formulaString = isLedStrip
    ? `[${finalItem.title}] (${data.originalWidth}×${data.originalHeight} ${data.unit}): (${widthInches.toFixed(1)}" ÷ 39) × (${heightInches.toFixed(1)}" ÷ 5) = ${ledTotalUnits.toFixed(2)} units × $${resolvedRate} = $${calculatedBasePrice.toFixed(2)}`
    : `[${finalItem.title}] (${data.originalWidth}×${data.originalHeight} ${data.unit}): ${widthFeet.toFixed(2)}' × ${heightFeet.toFixed(2)}' = ${areaSqFt.toFixed(2)} sq ft × $${resolvedRate}/sq ft = $${calculatedBasePrice.toFixed(2)}`;

  const handleCopyFormula = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(formulaString);
    if (success) {
      setCopiedFormula(true);
      setTimeout(() => setCopiedFormula(false), 2000);
    }
  };

  const handleAdd = () => {
    setIsAdded(true);
    setTimeout(() => {
      onAddToQuote(finalItem);
      setIsAdded(false);
    }, 400);
  };

  const handleShare = async () => {
    const textToCopy = `*Halo Design Hub — Item Quote*\nItem: ${finalItem.title}\nDimensions: ${finalItem.originalWidth} (w) x ${finalItem.originalHeight} (h) ${finalItem.unit}\nPrice: $${finalItem.totalPrice.toFixed(2)}\nFormula: ${formulaString}\nPayNow UEN: 201826136D (Halo Design Hub)`;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg bg-white dark:bg-[#222226] rounded-2xl shadow-2xl border ${
          itemColor ? itemColor.border : 'border-slate-200/90 dark:border-white/10'
        } overflow-hidden flex flex-col max-h-[90dvh] transition-all`}
      >
        {/* macOS Modal Titlebar */}
        <div className="h-9 sm:h-10 px-3 sm:px-4 bg-slate-50 dark:bg-[#1a1a1c] border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onClose}
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F56] hover:brightness-90 flex items-center justify-center text-black/60"
              title="Close"
            ></button>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27C93F]"></span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-neutral-300">
              {t.modalSpecTitle}
            </span>
            {itemColor && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${itemColor.badge}`}>
                {data.title}
              </span>
            )}
          </div>
          <div className="w-8 sm:w-12"></div>
        </div>

        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 overflow-y-auto mac-scrollbar">
          {/* Interactive Signage Spec Box (Clicking column toggles Formula Breakdown) */}
          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 overflow-hidden transition-all shadow-sm">
            <div
              onClick={() => setShowFormula(prev => !prev)}
              className="p-2.5 sm:p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors select-none group"
            >
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-neutral-200">
                {t.modalSignageSpec}
              </span>
            </div>

            <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
              <input
                type="text"
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                className="w-full text-sm sm:text-base font-bold text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-blue-500 py-0.5"
                placeholder="Signage item title"
              />
            </div>

            {/* Formula Calculation Breakdown Display */}
            {showFormula && (
              <div className="border-t border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-[#121316] p-3 sm:p-3.5 space-y-2.5 text-xs animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="font-bold text-[11px] text-slate-800 dark:text-neutral-200">
                      {t.modalMathFormula}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFormula}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-neutral-700 transition"
                  >
                    {copiedFormula ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">{t.modalCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t.modalCopyFormula}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mathematical Formula Rule */}
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 font-mono text-[11px] leading-relaxed">
                  {isLedStrip ? (
                    <div>
                      <span className="font-bold">{language === 'zh' ? 'LED灯带计算公式:' : 'LED Strip Rule:'}</span> (Width in ÷ 39) × (Height in ÷ 5) × Rate ($/ft)
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold">{language === 'zh' ? '标准面积计算公式:' : 'Standard Area Rule:'}</span> Width (ft) × Height (ft) × Rate ($/sq ft)
                    </div>
                  )}
                </div>

                {/* Step by step Calculation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {/* Step 1 */}
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900/80 border border-slate-200/80 dark:border-white/5">
                    <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-neutral-400 mb-0.5">
                      {t.modalStep1Conversion}
                    </div>
                    <div className="text-slate-800 dark:text-neutral-200">
                      {t.modalStep1Input}: <span className="font-bold">{data.originalWidth} × {data.originalHeight} {data.unit.toUpperCase()}</span>
                    </div>
                    <div className="text-slate-600 dark:text-neutral-400 text-[10px] mt-0.5">
                      = {widthInches.toFixed(1)}" × {heightInches.toFixed(1)}" in ({widthFeet.toFixed(2)}' × {heightFeet.toFixed(2)}' ft)
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900/80 border border-slate-200/80 dark:border-white/5">
                    <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-neutral-400 mb-0.5">
                      {isLedStrip ? t.modalStep2Multiplier : t.modalStep2Area}
                    </div>
                    {isLedStrip ? (
                      <div>
                        <div className="text-slate-800 dark:text-neutral-200">
                          ({widthInches.toFixed(1)}" ÷ 39) × ({heightInches.toFixed(1)}" ÷ 5)
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] mt-0.5">
                          = {ledTotalUnits.toFixed(3)} units
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-800 dark:text-neutral-200">
                          {widthFeet.toFixed(2)} ft × {heightFeet.toFixed(2)} ft
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] mt-0.5">
                          = {areaSqFt.toFixed(2)} sq ft ({((widthInches * heightInches) / 144).toFixed(3)} exact)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 & 4 Combined Equation Result */}
                <div className="p-2.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 text-emerald-900 dark:text-emerald-300 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {t.modalFinalEquation}
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {t.modalRateLabel}: ${resolvedRate} {rateUnit}
                    </span>
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-200">
                    {isLedStrip ? (
                      <>
                        {ledTotalUnits.toFixed(2)} units × ${resolvedRate} ={' '}
                        <span className="underline decoration-emerald-500 decoration-2 font-mono">
                          ${calculatedBasePrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>
                        {areaSqFt.toFixed(2)} sq ft × ${resolvedRate} ={' '}
                        <span className="underline decoration-emerald-500 decoration-2 font-mono">
                          ${calculatedBasePrice.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dimensions & Area Quick Bar */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                {t.modalDimensions}
              </span>
              <p className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-neutral-200 mt-0.5">
                {data.originalWidth} × {data.originalHeight} {data.unit.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                {t.modalCalculatedArea}
              </span>
              <p className="text-xs sm:text-sm font-mono text-slate-600 dark:text-neutral-400 font-semibold">
                {((data.widthInches * data.heightInches) / 144).toFixed(2)} sq ft
              </p>
            </div>
          </div>

          {/* Unit Price Input */}
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-300">{t.modalUnitPrice}</span>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400">{t.modalEditableHint}</p>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-[#18181c] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-blue-300/80 dark:border-white/10 shadow-sm">
              <span className="text-base sm:text-lg font-bold font-mono text-blue-600 dark:text-blue-500">$</span>
              <input
                type="number"
                step="any"
                min="0"
                value={editedPrice}
                onChange={e => setEditedPrice(e.target.value)}
                className="w-20 sm:w-24 text-base sm:text-xl font-black font-mono text-blue-600 dark:text-blue-500 bg-transparent outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 sm:pt-2 shrink-0">
            <button
              onClick={handleAdd}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                isAdded ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/25'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.modalAdded}
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.modalAddToQuote}
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 active:scale-95 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" /> {t.modalCopiedText}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.modalCopyText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
