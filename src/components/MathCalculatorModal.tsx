import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  History,
  Copy,
  Check,
  Trash2,
  ArrowRightToLine,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface MathCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWidth?: (val: string) => void;
  onApplyHeight?: (val: string) => void;
  currentWidth?: string;
  currentHeight?: string;
}

interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export const MathCalculatorModal: React.FC<MathCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyWidth,
  onApplyHeight,
}) => {
  // Core iOS Calculator States
  const [display, setDisplay] = useState<string>('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [activeOperator, setActiveOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);
  const [hasEnteredDigits, setHasEnteredDigits] = useState<boolean>(false);
  const [lastEvaluatedOperand, setLastEvaluatedOperand] = useState<number | null>(null);
  const [lastEvaluatedOperator, setLastEvaluatedOperator] = useState<string | null>(null);

  // Quick Utilities States
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedWidth, setAppliedWidth] = useState<boolean>(false);
  const [appliedHeight, setAppliedHeight] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('halo_ios_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Swipe-to-delete coordinates on display
  const touchStartXRef = useRef<number | null>(null);
  const mouseStartXRef = useRef<number | null>(null);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem('halo_ios_calc_history', JSON.stringify(historyList));
    } catch (e) {
      console.warn('Failed to save calculator history', e);
    }
  }, [historyList]);

  // Clean rounding and precision helper (matches iOS 9-digit display limit)
  const formatResultNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return 'Error';

    // If result fits in standard 9 digits
    const absNum = Math.abs(num);
    if (absNum !== 0 && (absNum >= 1e9 || absNum < 1e-6)) {
      // Scientific notation like iOS
      return num.toExponential(4).replace('e+', 'e');
    }

    // Limit to 9 significant digits max
    const precisionStr = parseFloat(num.toPrecision(9)).toString();
    return precisionStr;
  };

  // Format display string with standard thousands commas (e.g. 1,234,567.89)
  const formatDisplayWithCommas = (val: string): string => {
    if (val === 'Error') return 'Error';
    if (val.includes('e')) return val;

    const isNegative = val.startsWith('-');
    const cleanVal = isNegative ? val.slice(1) : val;

    const parts = cleanVal.split('.');
    const integerPart = parts[0];
    const hasDecimal = parts.length > 1;
    const decimalPart = parts[1];

    // Format integer part with commas
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    let result = (isNegative ? '-' : '') + formattedInteger;
    if (hasDecimal) {
      result += '.' + decimalPart;
    }
    return result;
  };

  const calculateResult = (op: string, a: number, b: number): number => {
    switch (op) {
      case '+':
        return a + b;
      case '−':
      case '-':
        return a - b;
      case '×':
      case '*':
        return a * b;
      case '÷':
      case '/':
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  };

  // Digit button press (0-9)
  const handleDigit = useCallback(
    (digit: string) => {
      if (waitingForSecondOperand) {
        setDisplay(digit);
        setWaitingForSecondOperand(false);
        setHasEnteredDigits(true);
      } else {
        setDisplay(prev => {
          if (prev === '0' || prev === 'Error') {
            return digit;
          }
          // Max 9 digits like real iPhone calculator
          const digitsOnly = prev.replace(/[^0-9]/g, '');
          if (digitsOnly.length >= 9) {
            return prev;
          }
          return prev + digit;
        });
        setHasEnteredDigits(true);
      }
    },
    [waitingForSecondOperand]
  );

  // Decimal button press (.)
  const handleDecimal = useCallback(() => {
    if (waitingForSecondOperand) {
      setDisplay('0.');
      setWaitingForSecondOperand(false);
      setHasEnteredDigits(true);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
      setHasEnteredDigits(true);
    }
  }, [waitingForSecondOperand, display]);

  // Operator button press (÷, ×, −, +)
  const handleOperator = useCallback(
    (nextOp: string) => {
      const inputValue = parseFloat(display);

      if (isNaN(inputValue)) return;

      if (firstOperand === null) {
        setFirstOperand(inputValue);
      } else if (activeOperator && !waitingForSecondOperand) {
        const result = calculateResult(activeOperator, firstOperand, inputValue);
        const formattedResult = formatResultNumber(result);
        setDisplay(formattedResult);
        setFirstOperand(result);
      }

      setActiveOperator(nextOp);
      setWaitingForSecondOperand(true);
      setLastEvaluatedOperand(null);
      setLastEvaluatedOperator(null);
    },
    [display, firstOperand, activeOperator, waitingForSecondOperand]
  );

  // Equals button press (=)
  const handleEquals = useCallback(() => {
    const currentInput = parseFloat(display);

    if (isNaN(currentInput)) return;

    let opToApply = activeOperator;
    let operandA = firstOperand;
    let operandB = currentInput;

    // Handle repeated '=' clicks (iOS feature)
    if (activeOperator === null && lastEvaluatedOperator !== null && lastEvaluatedOperand !== null) {
      opToApply = lastEvaluatedOperator;
      operandA = currentInput;
      operandB = lastEvaluatedOperand;
    }

    if (opToApply === null || operandA === null) {
      return;
    }

    const result = calculateResult(opToApply, operandA, operandB);
    const formattedResult = formatResultNumber(result);
    const expression = `${operandA} ${opToApply} ${operandB} =`;

    setDisplay(formattedResult);
    setFirstOperand(null);
    setActiveOperator(null);
    setWaitingForSecondOperand(true);
    setLastEvaluatedOperator(opToApply);
    setLastEvaluatedOperand(operandB);

    // Save history
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      expression,
      result: formattedResult,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistoryList(prev => [entry, ...prev.slice(0, 24)]);
  }, [display, activeOperator, firstOperand, lastEvaluatedOperator, lastEvaluatedOperand]);

  // AC / C button press
  const handleClear = useCallback(() => {
    if (hasEnteredDigits || display !== '0') {
      // Single clear "C"
      setDisplay('0');
      setHasEnteredDigits(false);
    } else {
      // All clear "AC"
      setDisplay('0');
      setFirstOperand(null);
      setActiveOperator(null);
      setWaitingForSecondOperand(false);
      setHasEnteredDigits(false);
      setLastEvaluatedOperand(null);
      setLastEvaluatedOperator(null);
    }
  }, [hasEnteredDigits, display]);

  // Sign inversion (±)
  const handleToggleSign = useCallback(() => {
    if (display === '0' || display === 'Error') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  }, [display]);

  // Percentage (%)
  const handlePercent = useCallback(() => {
    const current = parseFloat(display);
    if (isNaN(current)) return;
    const result = current / 100;
    setDisplay(formatResultNumber(result));
  }, [display]);

  // Backspace (swipe left/right on iOS display)
  const handleBackspace = useCallback(() => {
    if (waitingForSecondOperand) return;
    setDisplay(prev => {
      if (prev === 'Error' || prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [waitingForSecondOperand]);

  // Swipe handling on display
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 30) {
      handleBackspace();
    }
    touchStartXRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartXRef.current === null) return;
    const diff = e.clientX - mouseStartXRef.current;
    if (Math.abs(diff) > 40) {
      handleBackspace();
    }
    mouseStartXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('−');
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    handleDigit,
    handleDecimal,
    handleOperator,
    handleEquals,
    handleBackspace,
    handlePercent,
    handleClear,
    onClose,
  ]);

  if (!isOpen) return null;

  const formattedDisplay = formatDisplayWithCommas(display);
  const displayLength = formattedDisplay.length;

  // iOS Dynamic font size based on string length
  let fontSizeStyle = 'text-7xl';
  if (displayLength > 10) {
    fontSizeStyle = 'text-4xl';
  } else if (displayLength > 8) {
    fontSizeStyle = 'text-5xl';
  } else if (displayLength > 6) {
    fontSizeStyle = 'text-6xl';
  }

  // C vs AC label
  const clearLabel = hasEnteredDigits || display !== '0' ? 'C' : 'AC';

  return (
    <div
      id="ios-calculator-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="ios-calculator-chassis"
        className="relative w-full max-w-[340px] sm:max-w-[360px] bg-black text-white rounded-[44px] sm:rounded-[48px] p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-neutral-800/80 flex flex-col transition-all overflow-hidden"
        style={{
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* iOS Top Notch / Dynamic Island indicator & Dismiss Bar */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          {/* Close circle button */}
          <button
            id="ios-calc-close-btn"
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#333333] hover:bg-[#444444] active:scale-90 text-neutral-300 flex items-center justify-center transition-all"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* iOS Dynamic Island bar */}
          <div className="w-20 h-4 bg-neutral-900 rounded-full border border-neutral-800 flex items-center justify-center shadow-inner">
            <div className="w-2 h-2 rounded-full bg-neutral-950 mr-2" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-950" />
          </div>

          {/* History drawer toggle button */}
          <button
            id="ios-calc-history-btn"
            type="button"
            onClick={() => setShowHistory(prev => !prev)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              showHistory
                ? 'bg-[#ff9f0a] text-white'
                : 'bg-[#333333] hover:bg-[#444444] text-neutral-300'
            }`}
            title="Calculation History"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Quickbar: Copy / Set Width / Set Height in sleek iOS pill format */}
        <div className="flex items-center justify-between pb-2 text-[11px] font-medium text-neutral-400">
          <button
            id="ios-calc-copy-btn"
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(display);
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#242426] hover:bg-[#323235] text-neutral-300 transition active:scale-95 border border-white/5"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            {onApplyWidth && (
              <button
                id="ios-calc-apply-width-btn"
                type="button"
                onClick={() => {
                  if (display !== 'Error' && !isNaN(parseFloat(display))) {
                    onApplyWidth(display);
                    setAppliedWidth(true);
                    setTimeout(() => setAppliedWidth(false), 1500);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#242426] hover:bg-[#323235] text-neutral-300 transition active:scale-95 border border-white/5"
                title="Apply to Width"
              >
                {appliedWidth ? (
                  <Check className="w-3 h-3 text-amber-400" />
                ) : (
                  <ArrowRightToLine className="w-3 h-3 text-amber-400" />
                )}
                <span>Width</span>
              </button>
            )}

            {onApplyHeight && (
              <button
                id="ios-calc-apply-height-btn"
                type="button"
                onClick={() => {
                  if (display !== 'Error' && !isNaN(parseFloat(display))) {
                    onApplyHeight(display);
                    setAppliedHeight(true);
                    setTimeout(() => setAppliedHeight(false), 1500);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#242426] hover:bg-[#323235] text-neutral-300 transition active:scale-95 border border-white/5"
                title="Apply to Height"
              >
                {appliedHeight ? (
                  <Check className="w-3 h-3 text-orange-400" />
                ) : (
                  <ArrowRightToLine className="w-3 h-3 text-orange-400" />
                )}
                <span>Height</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible History Drawer */}
        {showHistory && (
          <div className="bg-[#1c1c1e] rounded-2xl border border-neutral-800 p-3 mb-3 max-h-44 overflow-y-auto mac-scrollbar">
            <div className="flex items-center justify-between pb-1 mb-2 border-b border-neutral-800 text-[11px] font-semibold text-neutral-400">
              <span>Calculation History</span>
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryList([])}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[10px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <p className="text-[11px] text-neutral-500 text-center py-2">No past calculations</p>
            ) : (
              <div className="space-y-1.5">
                {historyList.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDisplay(item.result);
                      setWaitingForSecondOperand(false);
                      setShowHistory(false);
                    }}
                    className="w-full text-left p-1.5 rounded-xl hover:bg-white/5 transition flex items-center justify-between group"
                  >
                    <span className="text-xs text-neutral-400 truncate max-w-[170px] font-mono">
                      {item.expression}
                    </span>
                    <span className="text-xs font-semibold text-[#ff9f0a] font-mono group-hover:underline">
                      {item.result}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* iOS Display Area (Right-aligned, pure white, swipe-to-backspace) */}
        <div
          id="ios-calculator-display"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="min-h-[100px] sm:min-h-[110px] flex flex-col justify-end items-end px-2 mb-3 cursor-default select-none overflow-hidden"
          title="Swipe left or right to delete digit"
        >
          {/* Active operator indicator when waiting */}
          <div className="h-5 text-sm text-[#ff9f0a] font-mono font-medium">
            {activeOperator && waitingForSecondOperand ? activeOperator : '\u00A0'}
          </div>

          <div className="w-full flex items-baseline justify-end overflow-hidden">
            <span
              className={`text-white font-light tracking-tight ${fontSizeStyle} transition-all duration-75 select-text`}
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
              }}
            >
              {formattedDisplay}
            </span>
          </div>
        </div>

        {/* iOS Authentic Keypad Grid: 4 columns x 5 rows */}
        <div className="grid grid-cols-4 gap-3 sm:gap-3.5">
          {/* Row 1: AC/C, ±, %, ÷ */}
          <button
            id="ios-key-clear"
            type="button"
            onClick={handleClear}
            className="aspect-square rounded-full bg-[#a5a5a5] hover:bg-[#bebebe] active:bg-[#d9d9d9] text-black font-medium text-2xl sm:text-3xl flex items-center justify-center transition-colors active:scale-95"
          >
            {clearLabel}
          </button>
          <button
            id="ios-key-sign"
            type="button"
            onClick={handleToggleSign}
            className="aspect-square rounded-full bg-[#a5a5a5] hover:bg-[#bebebe] active:bg-[#d9d9d9] text-black font-medium text-2xl sm:text-3xl flex items-center justify-center transition-colors active:scale-95"
          >
            ±
          </button>
          <button
            id="ios-key-percent"
            type="button"
            onClick={handlePercent}
            className="aspect-square rounded-full bg-[#a5a5a5] hover:bg-[#bebebe] active:bg-[#d9d9d9] text-black font-medium text-2xl sm:text-3xl flex items-center justify-center transition-colors active:scale-95"
          >
            %
          </button>
          <button
            id="ios-key-divide"
            type="button"
            onClick={() => handleOperator('÷')}
            className={`aspect-square rounded-full font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95 ${
              activeOperator === '÷' && waitingForSecondOperand
                ? 'bg-white text-[#ff9f0a]'
                : 'bg-[#ff9f0a] hover:bg-[#ffb03a] active:bg-[#fcc875] text-white'
            }`}
          >
            ÷
          </button>

          {/* Row 2: 7, 8, 9, × */}
          <button
            id="ios-key-7"
            type="button"
            onClick={() => handleDigit('7')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            7
          </button>
          <button
            id="ios-key-8"
            type="button"
            onClick={() => handleDigit('8')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            8
          </button>
          <button
            id="ios-key-9"
            type="button"
            onClick={() => handleDigit('9')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            9
          </button>
          <button
            id="ios-key-multiply"
            type="button"
            onClick={() => handleOperator('×')}
            className={`aspect-square rounded-full font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95 ${
              activeOperator === '×' && waitingForSecondOperand
                ? 'bg-white text-[#ff9f0a]'
                : 'bg-[#ff9f0a] hover:bg-[#ffb03a] active:bg-[#fcc875] text-white'
            }`}
          >
            ×
          </button>

          {/* Row 3: 4, 5, 6, − */}
          <button
            id="ios-key-4"
            type="button"
            onClick={() => handleDigit('4')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            4
          </button>
          <button
            id="ios-key-5"
            type="button"
            onClick={() => handleDigit('5')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            5
          </button>
          <button
            id="ios-key-6"
            type="button"
            onClick={() => handleDigit('6')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            6
          </button>
          <button
            id="ios-key-subtract"
            type="button"
            onClick={() => handleOperator('−')}
            className={`aspect-square rounded-full font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95 ${
              activeOperator === '−' && waitingForSecondOperand
                ? 'bg-white text-[#ff9f0a]'
                : 'bg-[#ff9f0a] hover:bg-[#ffb03a] active:bg-[#fcc875] text-white'
            }`}
          >
            −
          </button>

          {/* Row 4: 1, 2, 3, + */}
          <button
            id="ios-key-1"
            type="button"
            onClick={() => handleDigit('1')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            1
          </button>
          <button
            id="ios-key-2"
            type="button"
            onClick={() => handleDigit('2')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            2
          </button>
          <button
            id="ios-key-3"
            type="button"
            onClick={() => handleDigit('3')}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            3
          </button>
          <button
            id="ios-key-add"
            type="button"
            onClick={() => handleOperator('+')}
            className={`aspect-square rounded-full font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95 ${
              activeOperator === '+' && waitingForSecondOperand
                ? 'bg-white text-[#ff9f0a]'
                : 'bg-[#ff9f0a] hover:bg-[#ffb03a] active:bg-[#fcc875] text-white'
            }`}
          >
            +
          </button>

          {/* Row 5: 0 (spans 2 columns, left aligned), ., = */}
          <button
            id="ios-key-0"
            type="button"
            onClick={() => handleDigit('0')}
            className="col-span-2 rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-start pl-7 sm:pl-8 transition-colors active:scale-98"
          >
            0
          </button>
          <button
            id="ios-key-decimal"
            type="button"
            onClick={handleDecimal}
            className="aspect-square rounded-full bg-[#333333] hover:bg-[#444444] active:bg-[#737373] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            .
          </button>
          <button
            id="ios-key-equals"
            type="button"
            onClick={handleEquals}
            className="aspect-square rounded-full bg-[#ff9f0a] hover:bg-[#ffb03a] active:bg-[#fcc875] text-white font-light text-3xl sm:text-4xl flex items-center justify-center transition-colors active:scale-95"
          >
            =
          </button>
        </div>

        {/* Footer Swipe Hint */}
        <div className="pt-3 flex items-center justify-center text-[10px] text-neutral-500 tracking-wider">
          <span>Swipe display to delete &bull; Esc to close</span>
        </div>
      </div>
    </div>
  );
};
