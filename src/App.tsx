import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Unit, UnitType, Theme, ThemeType, QuoteItem, QuoteRecord, RatesConfig } from './types';
import { DEFAULT_RATES } from './data/presets';
import { calculatePrices } from './utils/calculator';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useLanguage } from './context/LanguageContext';
import { MacMenuBar } from './components/MacMenuBar';
import { MacDock } from './components/MacDock';
import { MacPricingCard } from './components/MacPricingCard';
import { QuotationModal } from './components/QuotationModal';
import { QuotationListModal } from './components/QuotationListModal';
import { GoogleAccountModal } from './components/GoogleAccountModal';
import { MobileAppModal } from './components/MobileAppModal';
import { MobileInstallBanner } from './components/MobileInstallBanner';
import { MathCalculatorModal } from './components/MathCalculatorModal';
import { HaloLogo } from './components/HaloLogo';
import { LightboxShapeModal } from './components/LightboxShapeModal';
import { DailyOutsideScheduleModal } from './components/DailyOutsideScheduleModal';
import { RotateCcw, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';

export default function App() {
  const { language, t } = useLanguage();
  const [theme, setTheme] = useState<ThemeType>(Theme.DARK);
  const [wallpaper, setWallpaper] = useState<string>(() => {
    return localStorage.getItem('halo_wallpaper') || 'cyber-midnight';
  });

  useEffect(() => {
    localStorage.setItem('halo_wallpaper', wallpaper);
  }, [wallpaper]);

  // Firebase Auth & Cloud Sync
  const auth = useFirebaseAuth();

  // Dimensions & Calculator State
  const [unit, setUnit] = useState<UnitType>(Unit.IN);
  const [width, setWidth] = useState('120');
  const [height, setHeight] = useState('36');
  const [rates, setRates] = useState<RatesConfig>(() => {
    const saved = localStorage.getItem('halo_custom_rates');
    if (saved) {
      try {
        return { ...DEFAULT_RATES, ...JSON.parse(saved) };
      } catch (e) {
        return { ...DEFAULT_RATES };
      }
    }
    return { ...DEFAULT_RATES };
  });

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<QuoteItem | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('halo_sign_quote_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('halo_sign_quote_items', JSON.stringify(quoteItems));
    } catch (e) {
      console.warn('Failed to save quote items to localStorage', e);
    }
  }, [quoteItems]);
  const [quoteListOpen, setQuoteListOpen] = useState(false);
  const [dailyScheduleOpen, setDailyScheduleOpen] = useState(false);
  const [scheduleCustomerName, setScheduleCustomerName] = useState('');
  const [scheduleCustomerAddress, setScheduleCustomerAddress] = useState('');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mathCalcOpen, setMathCalcOpen] = useState(false);
  const [shapeModalOpen, setShapeModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const handleOpenDailySchedule = (customerName?: string, customerAddress?: string) => {
    if (customerName !== undefined) setScheduleCustomerName(customerName);
    if (customerAddress !== undefined) setScheduleCustomerAddress(customerAddress);
    setDailyScheduleOpen(true);
  };

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install choice error:', err);
      }
    }
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('halo_theme') as ThemeType) || Theme.DARK;
    setTheme(savedTheme);
    applyThemeClass(savedTheme);
  }, []);

  const applyThemeClass = (currentTheme: ThemeType) => {
    document.documentElement.classList.remove('dark', 'light');
    if (currentTheme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  };

  const handleSetTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    if (newTheme === Theme.LIGHT) {
      setWallpaper('silver');
    } else if (newTheme === Theme.DARK) {
      setWallpaper('cyber-midnight');
    }
  };

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem('halo_theme', theme);
  }, [theme]);

  // Sync user's cloud rates if available
  useEffect(() => {
    if (auth.cloudRates && Object.keys(auth.cloudRates).length > 0) {
      setRates(prev => ({ ...prev, ...auth.cloudRates }));
    }
  }, [auth.cloudRates]);

  const handleRateChange = (rateKey: keyof RatesConfig, newRate: number) => {
    if (isNaN(newRate) || newRate < 0) return;
    setRates(prev => {
      const updated = { ...prev, [rateKey]: newRate };
      localStorage.setItem('halo_custom_rates', JSON.stringify(updated));
      if (auth.user) {
        auth.saveRatesToCloud(updated);
      }
      return updated;
    });
  };

  const handleResetRates = () => {
    setRates({ ...DEFAULT_RATES });
    localStorage.setItem('halo_custom_rates', JSON.stringify(DEFAULT_RATES));
    if (auth.user) {
      auth.saveRatesToCloud(DEFAULT_RATES);
    }
  };

  const isCustomRatesActive = useMemo(() => {
    return Object.keys(DEFAULT_RATES).some(
      key => rates[key as keyof RatesConfig] !== DEFAULT_RATES[key as keyof RatesConfig]
    );
  }, [rates]);

  const calculations = useMemo(() => {
    return calculatePrices(parseFloat(width) || 0, parseFloat(height) || 0, unit, rates);
  }, [width, height, unit, rates]);

  const { prices, dimensions } = calculations;

  const shapeInfo = useMemo(() => {
    const wVal = parseFloat(width) || 0;
    const hVal = parseFloat(height) || 0;
    if (wVal <= 0 || hVal <= 0) {
      return { type: 'invalid' as const, label: 'Custom', ratioText: '—' };
    }
    const w_in = dimensions.w_in;
    const h_in = dimensions.h_in;
    const diffPct = Math.abs(w_in - h_in) / Math.max(w_in, h_in);
    if (diffPct < 0.015) {
      return { type: 'square' as const, label: 'Square', ratioText: '1:1' };
    }
    if (w_in > h_in) {
      const r = (w_in / h_in).toFixed(2);
      return { type: 'horizontal' as const, label: 'Horizontal', ratioText: `${r}:1` };
    }
    const r = (h_in / w_in).toFixed(2);
    return { type: 'vertical' as const, label: 'Vertical', ratioText: `1:${r}` };
  }, [width, height, dimensions]);

  const handleCardClick = (title: string, priceKey: keyof typeof prices) => {
    const wVal = parseFloat(width) || 0;
    const hVal = parseFloat(height) || 0;
    if (wVal <= 0 || hVal <= 0) return;

    const rateMap: Record<string, { rate: number; unit: string }> = {
      lightbox: { rate: rates.LIGHTBOX ?? 50, unit: t.products.lightbox.unit },
      lightboxBacklit: { rate: rates.LIGHTBOX_W_BACKLIT ?? 85, unit: t.products.lightboxBacklit.unit },
      backlit: { rate: rates.BACKLIT ?? 35, unit: t.products.backlit.unit },
      trans: { rate: rates.TRANS ?? 45, unit: t.products.trans.unit },
      printed3d: { rate: rates.PRINTED_3D ?? 120, unit: t.products.printed3d.unit },
      vinylSticker: { rate: rates.VINYL_STICKER ?? 20, unit: t.products.vinylSticker.unit },
      ledStrip: { rate: rates.LED_STRIP ?? 17, unit: t.products.ledStrip.unit },
      acrylic: { rate: rates.ACRYLIC ?? 15, unit: t.products.acrylic.unit },
    };
    const rateInfo = rateMap[String(priceKey)] || { rate: 50, unit: '/SQ FT' };

    const prodInfo = t.products[priceKey as keyof typeof t.products] as any;
    const itemTitle = language === 'zh' && prodInfo?.title
      ? `${prodInfo.title} (${prodInfo.enTitle || title})`
      : title;

    setModalData({
      id: Date.now().toString(),
      title: itemTitle,
      totalPrice: prices[priceKey] || 0,
      widthInches: dimensions.w_in,
      heightInches: dimensions.h_in,
      unit,
      originalWidth: wVal,
      originalHeight: hVal,
      quantity: 1,
      rate: rateInfo.rate,
      rateUnit: rateInfo.unit,
      priceKey: priceKey as string,
    });
    setModalOpen(true);
  };

  const handleAddToQuote = (itemOverride?: QuoteItem) => {
    const itemToAdd = itemOverride || modalData;
    if (!itemToAdd) return;
    setQuoteItems(prev => [...prev, { ...itemToAdd, id: Date.now().toString() }]);
    setModalOpen(false);
    setQuoteListOpen(true);
  };

  const handleLoadQuoteRecord = (record: QuoteRecord) => {
    if (record && Array.isArray(record.items)) {
      setQuoteItems(record.items);
    }
  };

  const getWallpaperClass = () => {
    switch (wallpaper) {
      case 'cyber-midnight':
        return 'wallpaper-cyber-midnight';
      case 'sequoia':
        return 'wallpaper-sequoia';
      case 'sonoma':
        return 'wallpaper-sonoma';
      case 'warm':
        return 'wallpaper-warm';
      case 'silver':
        return 'wallpaper-silver';
      default:
        return 'wallpaper-cyber-midnight';
    }
  };

  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col relative transition-all duration-500 overflow-y-auto overflow-x-hidden ${getWallpaperClass()}`}
    >
      {/* Top macOS Menu Bar */}
      <MacMenuBar
        quoteCount={quoteItems.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenQuoteList={() => setQuoteListOpen(true)}
        theme={theme}
        setTheme={handleSetTheme}
        user={auth.user}
        onOpenAuth={() => auth.setAuthModalOpen(true)}
        onOpenMobileApp={() => setMobileModalOpen(true)}
        onOpenMathCalc={() => setMathCalcOpen(true)}
        onOpenShapeModal={() => setShapeModalOpen(true)}
        onOpenDailySchedule={() => handleOpenDailySchedule()}
        shapeType={shapeInfo.type}
        shapeLabel={shapeInfo.label}
      />

      {/* Top Mobile Quick Install Strip */}
      <div className="pt-7 sm:pt-8 w-full z-40">
        <MobileInstallBanner
          onInstall={() => {
            if (deferredPrompt) {
              handleTriggerInstall();
            } else {
              setMobileModalOpen(true);
            }
          }}
          onOpenDetails={() => setMobileModalOpen(true)}
          isStandalone={typeof window !== 'undefined' && (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            (window.navigator as any).standalone === true
          )}
          deferredPrompt={deferredPrompt}
        />
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 pt-3 sm:pt-6 pb-28 sm:pb-32 px-2 sm:px-4 md:px-6 flex items-center justify-center w-full relative gpu-layer">
        {/* MacBook Main Application Window Frame */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mac-main-window w-full max-w-5xl xl:max-w-6xl rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-lg border border-slate-200/90 dark:border-indigo-500/25 shadow-xl z-10 my-auto relative"
        >
          {/* Ambient Cyber Neon Crown Accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90"></div>

          {/* Window Titlebar with Traffic Lights */}
          <div className="h-8 sm:h-10 px-2.5 sm:px-4 bg-slate-100/95 dark:bg-[#0c122c]/95 border-b border-slate-200/90 dark:border-indigo-500/20 flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 sm:gap-2 traffic-group">
              <button
                className="traffic-btn w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F56] border border-black/10 flex items-center justify-center"
                title="Close"
              >
                <span className="traffic-glyph text-[8px] opacity-0 text-black/60 font-bold leading-none">
                  ×
                </span>
              </button>
              <button
                className="traffic-btn w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E] border border-black/10 flex items-center justify-center"
                title="Minimize"
              >
                <span className="traffic-glyph text-[8px] opacity-0 text-black/60 font-bold leading-none">
                  -
                </span>
              </button>
              <button
                className="traffic-btn w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27C93F] border border-black/10 flex items-center justify-center"
                title="Maximize"
              >
                <span className="traffic-glyph text-[8px] opacity-0 text-black/60 font-bold leading-none">
                  +
                </span>
              </button>
            </div>

            {/* macOS Window Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-none min-w-0 truncate">
              <HaloLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4 shadow-sm shrink-0" />
              <span className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-800 dark:text-neutral-100 tracking-tight truncate">
                {language === 'zh' ? 'Halo 招牌设计中心' : 'Halo Design Hub'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {t.nav.calculator}
              </span>

              {/* Lightbox Shape Icon beside Calculator */}
              <button
                onClick={() => setShapeModalOpen(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-200/80 hover:bg-blue-500/15 dark:bg-white/10 dark:hover:bg-blue-500/20 text-slate-800 hover:text-blue-600 dark:text-neutral-200 dark:hover:text-blue-400 border border-slate-300/80 dark:border-white/15 hover:border-blue-500/30 transition-all active:scale-95 shadow-xs"
                title={`Lightbox Shape: ${shapeInfo.label} (${shapeInfo.ratioText}) - Click to inspect`}
              >
                {shapeInfo.type === 'horizontal' ? (
                  <RectangleHorizontal className="w-3.5 h-3.5 text-blue-500" />
                ) : shapeInfo.type === 'vertical' ? (
                  <RectangleVertical className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>
            </div>
          </div>

          {/* Window Content */}
          <div className="p-2 sm:p-4 md:p-6 space-y-2.5 sm:space-y-4 md:space-y-5">
            {/* Dimensions Input Panel (Native macOS Toolbar Style) */}
            <div className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#0c122c]/75 border border-slate-200/90 dark:border-indigo-500/20 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-2.5 sm:gap-4">
              {/* Center/Main Dimension & Unit Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full lg:w-auto">
                {/* Long Centered Dimension Input */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-300 select-none shrink-0">
                    {t.toolbar.dim}
                  </span>
                  <div className="flex items-center justify-center gap-1 sm:gap-2 bg-slate-100 dark:bg-[#050817] px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-slate-200/90 dark:border-indigo-500/25 shadow-inner focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all w-full sm:w-auto">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      autoComplete="off"
                      value={width}
                      onChange={e => setWidth(e.target.value)}
                      onFocus={e => e.target.select()}
                      placeholder={t.toolbar.width}
                      className="w-full sm:w-24 md:w-32 text-center font-mono font-bold text-xs sm:text-sm md:text-base bg-transparent focus:bg-transparent outline-none text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 min-w-[60px]"
                      title={t.toolbar.width}
                    />
                    <span className="text-slate-500 dark:text-cyan-500/70 font-light text-sm sm:text-base px-0.5 select-none">×</span>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      autoComplete="off"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      onFocus={e => e.target.select()}
                      placeholder={t.toolbar.height}
                      className="w-full sm:w-24 md:w-32 text-center font-mono font-bold text-xs sm:text-sm md:text-base bg-transparent focus:bg-transparent outline-none text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 min-w-[60px]"
                      title={t.toolbar.height}
                    />
                  </div>
                </div>

                {/* Centered Unit Switcher & Reset Rates */}
                <div className="flex items-center justify-center gap-1.5 shrink-0 flex-wrap">
                  <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#050817] border border-slate-200/90 dark:border-indigo-500/25 shadow-sm">
                    {[
                      { key: Unit.IN, label: 'IN' },
                      { key: Unit.FT, label: 'FT' },
                      { key: Unit.CM, label: 'CM' },
                      { key: Unit.MM, label: 'MM' },
                      { key: Unit.M, label: 'M' },
                    ].map(u => (
                      <button
                        key={u.key}
                        onClick={() => setUnit(u.key)}
                        className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all ${
                          unit === u.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-800 hover:text-black hover:bg-slate-200/70 dark:text-neutral-400 dark:hover:text-white'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>

                  {/* Reset Rates Button */}
                  {isCustomRatesActive && (
                    <button
                      onClick={handleResetRates}
                      className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                      title={t.toolbar.resetRatesTitle}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.toolbar.resetRates}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dimension Conversion Badges (Static Non-moving Display) */}
              <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 text-[9px] sm:text-xs font-mono flex-wrap py-0.5">
                {unit !== Unit.IN && (
                  <div className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 font-bold whitespace-nowrap shrink-0">
                    {dimensions.w_in.toFixed(1)}" × {dimensions.h_in.toFixed(1)}" in
                  </div>
                )}
                {unit !== Unit.FT && (
                  <div className="px-2 py-0.5 sm:py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25 font-bold whitespace-nowrap shrink-0">
                    {dimensions.w_ft.toFixed(2)}' × {dimensions.h_ft.toFixed(2)}' ft
                  </div>
                )}
                {unit !== Unit.CM && (
                  <div className="px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-bold whitespace-nowrap shrink-0">
                    {dimensions.w_cm % 1 === 0 ? dimensions.w_cm.toFixed(0) : dimensions.w_cm.toFixed(1)} × {dimensions.h_cm % 1 === 0 ? dimensions.h_cm.toFixed(0) : dimensions.h_cm.toFixed(1)} cm
                  </div>
                )}
                {unit !== Unit.MM && (
                  <div className="px-2 py-0.5 sm:py-1 rounded-lg bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-500/25 font-bold whitespace-nowrap shrink-0">
                    {dimensions.w_mm % 1 === 0 ? dimensions.w_mm.toFixed(0) : dimensions.w_mm.toFixed(1)} × {dimensions.h_mm % 1 === 0 ? dimensions.h_mm.toFixed(0) : dimensions.h_mm.toFixed(1)} mm
                  </div>
                )}
                {unit !== Unit.M && (
                  <div className="px-2 py-0.5 sm:py-1 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/25 font-bold whitespace-nowrap shrink-0">
                    {dimensions.w_m.toFixed(2)} × {dimensions.h_m.toFixed(2)} m
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Grid - 8 Items (2 cols on mobile, 3 on tablet, 4 on desktop) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {/* 1. LIGHTBOX */}
              <MacPricingCard
                title={t.products.lightbox.title}
                subtitle={language === 'zh' ? t.products.lightbox.enTitle : undefined}
                price={prices.lightbox}
                rate={rates.LIGHTBOX}
                rateUnit={t.products.lightbox.unit}
                iconType="lightbox"
                iconBg="bg-gradient-to-tr from-amber-600 to-yellow-500"
                isSelected={modalOpen && modalData?.priceKey === 'lightbox'}
                onClick={() => handleCardClick(t.products.lightbox.title, 'lightbox')}
                onRateChange={(val) => handleRateChange('LIGHTBOX', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 2. LIGHTBOX W BACKLIT */}
              <MacPricingCard
                title={t.products.lightboxBacklit.title}
                subtitle={language === 'zh' ? t.products.lightboxBacklit.enTitle : undefined}
                price={prices.lightboxBacklit}
                rate={rates.LIGHTBOX_W_BACKLIT}
                rateUnit={t.products.lightboxBacklit.unit}
                iconType="lightboxBacklit"
                iconBg="bg-gradient-to-tr from-rose-600 to-pink-500"
                isSelected={modalOpen && modalData?.priceKey === 'lightboxBacklit'}
                onClick={() => handleCardClick(t.products.lightboxBacklit.title, 'lightboxBacklit')}
                onRateChange={(val) => handleRateChange('LIGHTBOX_W_BACKLIT', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 3. BACKLIT */}
              <MacPricingCard
                title={t.products.backlit.title}
                subtitle={language === 'zh' ? t.products.backlit.enTitle : undefined}
                price={prices.backlit}
                rate={rates.BACKLIT}
                rateUnit={t.products.backlit.unit}
                iconType="backlit"
                iconBg="bg-gradient-to-tr from-blue-600 to-cyan-500"
                isSelected={modalOpen && modalData?.priceKey === 'backlit'}
                onClick={() => handleCardClick(t.products.backlit.title, 'backlit')}
                onRateChange={(val) => handleRateChange('BACKLIT', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 4. TRANS */}
              <MacPricingCard
                title={t.products.trans.title}
                subtitle={language === 'zh' ? t.products.trans.enTitle : undefined}
                price={prices.trans}
                rate={rates.TRANS}
                rateUnit={t.products.trans.unit}
                iconType="trans"
                iconBg="bg-gradient-to-tr from-indigo-600 to-violet-500"
                isSelected={modalOpen && modalData?.priceKey === 'trans'}
                onClick={() => handleCardClick(t.products.trans.title, 'trans')}
                onRateChange={(val) => handleRateChange('TRANS', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 5. 3D PRINTED */}
              <MacPricingCard
                title={t.products.printed3d.title}
                subtitle={language === 'zh' ? t.products.printed3d.enTitle : undefined}
                price={prices.printed3d}
                rate={rates.PRINTED_3D}
                rateUnit={t.products.printed3d.unit}
                iconType="printed3d"
                iconBg="bg-gradient-to-tr from-orange-600 to-amber-500"
                isSelected={modalOpen && modalData?.priceKey === 'printed3d'}
                onClick={() => handleCardClick(t.products.printed3d.title, 'printed3d')}
                onRateChange={(val) => handleRateChange('PRINTED_3D', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 6. VINYL STICKER */}
              <MacPricingCard
                title={t.products.vinylSticker.title}
                subtitle={language === 'zh' ? t.products.vinylSticker.enTitle : undefined}
                price={prices.vinylSticker}
                rate={rates.VINYL_STICKER}
                rateUnit={t.products.vinylSticker.unit}
                iconType="vinylSticker"
                iconBg="bg-gradient-to-tr from-purple-600 to-fuchsia-500"
                isSelected={modalOpen && modalData?.priceKey === 'vinylSticker'}
                onClick={() => handleCardClick(t.products.vinylSticker.title, 'vinylSticker')}
                onRateChange={(val) => handleRateChange('VINYL_STICKER', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 7. LED STRIP */}
              <MacPricingCard
                title={t.products.ledStrip.title}
                subtitle={language === 'zh' ? t.products.ledStrip.enTitle : undefined}
                price={prices.ledStrip}
                rate={rates.LED_STRIP}
                rateUnit={t.products.ledStrip.unit}
                iconType="ledStrip"
                iconBg="bg-gradient-to-tr from-emerald-600 to-teal-500"
                isSelected={modalOpen && modalData?.priceKey === 'ledStrip'}
                onClick={() => handleCardClick(t.products.ledStrip.title, 'ledStrip')}
                onRateChange={(val) => handleRateChange('LED_STRIP', val)}
                editTooltip={t.products.clickToEdit}
              />

              {/* 8. ACRYLIC */}
              <MacPricingCard
                title={t.products.acrylic.title}
                subtitle={language === 'zh' ? t.products.acrylic.enTitle : undefined}
                price={prices.acrylic}
                rate={rates.ACRYLIC}
                rateUnit={t.products.acrylic.unit}
                iconType="acrylic"
                iconBg="bg-gradient-to-tr from-teal-600 to-cyan-500"
                isSelected={modalOpen && modalData?.priceKey === 'acrylic'}
                onClick={() => handleCardClick(t.products.acrylic.title, 'acrylic')}
                onRateChange={(val) => handleRateChange('ACRYLIC', val)}
                editTooltip={t.products.clickToEdit}
              />
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bottom macOS Dock */}
      <MacDock
        quoteCount={quoteItems.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenQuoteList={() => setQuoteListOpen(true)}
        theme={theme}
        setTheme={handleSetTheme}
        wallpaper={wallpaper}
        setWallpaper={setWallpaper}
        user={auth.user}
        onOpenAuth={() => auth.setAuthModalOpen(true)}
        onOpenMobileApp={() => setMobileModalOpen(true)}
        onOpenMathCalc={() => setMathCalcOpen(true)}
        onOpenShapeModal={() => setShapeModalOpen(true)}
        onOpenDailySchedule={() => handleOpenDailySchedule()}
        shapeType={shapeInfo.type}
        shapeLabel={shapeInfo.label}
      />

      {/* Sheets / Modals */}
      <QuotationModal
        isOpen={modalOpen}
        data={modalData}
        onClose={() => setModalOpen(false)}
        onAddToQuote={handleAddToQuote}
        rates={rates}
      />

      <QuotationListModal
        isOpen={quoteListOpen}
        onClose={() => setQuoteListOpen(false)}
        items={quoteItems}
        onRemoveItem={id => setQuoteItems(prev => prev.filter(item => item.id !== id))}
        onUpdateQuantity={(id, delta) =>
          setQuoteItems(prev =>
            prev.map(item =>
              item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
            )
          )
        }
        onClearAll={() => setQuoteItems([])}
        onAddCustomItem={item => setQuoteItems(prev => [...prev, item])}
        onUpdateItem={(id, updates) =>
          setQuoteItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)))
        }
        auth={auth}
        onLoadQuoteRecord={handleLoadQuoteRecord}
        onOpenDailySchedule={handleOpenDailySchedule}
      />

      {/* Google Account Modal */}
      <GoogleAccountModal
        isOpen={auth.authModalOpen}
        onClose={() => auth.setAuthModalOpen(false)}
        auth={auth}
      />

      {/* Universal Mobile App (iOS / Android / APK) Modal */}
      <MobileAppModal
        isOpen={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      {/* Math Calculator Modal */}
      <MathCalculatorModal
        isOpen={mathCalcOpen}
        onClose={() => setMathCalcOpen(false)}
        onApplyWidth={(val) => setWidth(val)}
        onApplyHeight={(val) => setHeight(val)}
        currentWidth={width}
        currentHeight={height}
      />

      {/* Lightbox Shape Visualizer Modal */}
      <LightboxShapeModal
        isOpen={shapeModalOpen}
        onClose={() => setShapeModalOpen(false)}
        width={width}
        height={height}
        unit={unit}
        onUpdateWidth={(w) => setWidth(w)}
        onUpdateHeight={(h) => setHeight(h)}
        onUpdateUnit={(u) => setUnit(u)}
      />

      {/* Daily Outside Schedule Form Modal */}
      <DailyOutsideScheduleModal
        isOpen={dailyScheduleOpen}
        onClose={() => setDailyScheduleOpen(false)}
        quoteItems={quoteItems}
        currentCustomerName={scheduleCustomerName}
        currentCustomerAddress={scheduleCustomerAddress}
      />
    </div>
  );
}
