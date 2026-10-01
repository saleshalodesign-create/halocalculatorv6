import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Trash2,
  Check,
  Type,
  Eraser,
  PenTool,
  Square,
  Minus,
  CheckSquare,
  Highlighter,
  Stamp,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { PdfAnnotation, STAMP_PRESETS } from '../../utils/pdfEditor';

export const STANDARD_FONTS = [
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Space Mono', value: '"Space Mono", "Courier New", Courier, monospace' },
  { label: 'Helvetica / Sans', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'Arial / Sans-Serif', value: 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: 'Times New Roman / Serif', value: '"Times New Roman", Times, Georgia, "Songti SC", SimSun, serif' },
  { label: 'Courier New / Monospace', value: '"Courier New", Courier, monospace' },
  { label: 'Calibri', value: 'Calibri, "Segoe UI", Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'SimSun / 宋体', value: '"Songti SC", SimSun, STSong, serif' },
  { label: 'PingFang / 微软雅黑', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

export const QUICK_COLORS = [
  '#000000',
  '#374151',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#ffffff',
];

export interface ActiveTextProps {
  text: string;
  fontSize: number;
  textColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean;
  fontFamily: string;
  fontDisplayName?: string;
  whiteoutBackground: boolean;
}

interface PdfescapePropertyBarProps {
  activeTool: string;
  selectedAnnotation: PdfAnnotation | null;
  activeEditingText: ActiveTextProps | null;
  isZh: boolean;
  onUpdateActiveText: (updates: Partial<ActiveTextProps>) => void;
  onUpdateSelectedAnnotation: (updates: Partial<PdfAnnotation>) => void;
  onDeleteSelected: () => void;
  onCommitEditing: () => void;
  // Freehand options
  freehandColor: string;
  onChangeFreehandColor: (c: string) => void;
  freehandWidth: number;
  onChangeFreehandWidth: (w: number) => void;
  // Checkmark options
  checkmarkColor: string;
  onChangeCheckmarkColor: (c: string) => void;
  checkmarkSize: number;
  onChangeCheckmarkSize: (s: number) => void;
  // Stamp options
  selectedStampId: string;
  onChangeStampId: (id: string) => void;
  customStampText: string;
  onChangeCustomStampText: (t: string) => void;
  customStampColor: string;
  onChangeCustomStampColor: (c: string) => void;
  // Highlight color
  highlightColor: string;
  onChangeHighlightColor: (c: string) => void;
  // Shape options
  shapeStrokeColor: string;
  onChangeShapeStrokeColor: (c: string) => void;
  shapeStrokeWidth: number;
  onChangeShapeStrokeWidth: (w: number) => void;
  shapeFillColor: string;
  onChangeShapeFillColor: (c: string) => void;
}

export const PdfescapePropertyBar: React.FC<PdfescapePropertyBarProps> = ({
  activeTool,
  selectedAnnotation,
  activeEditingText,
  isZh,
  onUpdateActiveText,
  onUpdateSelectedAnnotation,
  onDeleteSelected,
  onCommitEditing,
  freehandColor,
  onChangeFreehandColor,
  freehandWidth,
  onChangeFreehandWidth,
  checkmarkColor,
  onChangeCheckmarkColor,
  checkmarkSize,
  onChangeCheckmarkSize,
  selectedStampId,
  onChangeStampId,
  customStampText,
  onChangeCustomStampText,
  customStampColor,
  onChangeCustomStampColor,
  highlightColor,
  onChangeHighlightColor,
  shapeStrokeColor,
  onChangeShapeStrokeColor,
  shapeStrokeWidth,
  onChangeShapeStrokeWidth,
  shapeFillColor,
  onChangeShapeFillColor,
}) => {
  const isTextMode =
    activeEditingText !== null ||
    (selectedAnnotation && (selectedAnnotation.type === 'text' || selectedAnnotation.type === 'whiteout')) ||
    activeTool === 'text';

  const currentFont = activeEditingText?.fontFamily || selectedAnnotation?.fontFamily || STANDARD_FONTS[0].value;
  const currentSize = activeEditingText?.fontSize || selectedAnnotation?.fontSize || 12;
  const currentColor = activeEditingText?.textColor || selectedAnnotation?.textColor || '#000000';
  const currentBold = activeEditingText ? activeEditingText.isBold : !!selectedAnnotation?.isBold;
  const currentItalic = activeEditingText ? activeEditingText.isItalic : !!selectedAnnotation?.isItalic;
  const currentUnderline = activeEditingText ? !!activeEditingText.isUnderline : !!selectedAnnotation?.isUnderline;
  const currentWhiteout = activeEditingText
    ? activeEditingText.whiteoutBackground
    : selectedAnnotation?.type === 'whiteout';

  const handleFontChange = (val: string) => {
    if (activeEditingText) onUpdateActiveText({ fontFamily: val });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ fontFamily: val });
  };

  const handleSizeChange = (val: number) => {
    if (activeEditingText) onUpdateActiveText({ fontSize: val });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ fontSize: val });
  };

  const handleColorChange = (val: string) => {
    if (activeEditingText) onUpdateActiveText({ textColor: val });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ textColor: val });
  };

  const handleBoldToggle = () => {
    if (activeEditingText) onUpdateActiveText({ isBold: !currentBold });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ isBold: !currentBold });
  };

  const handleItalicToggle = () => {
    if (activeEditingText) onUpdateActiveText({ isItalic: !currentItalic });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ isItalic: !currentItalic });
  };

  const handleUnderlineToggle = () => {
    if (activeEditingText) onUpdateActiveText({ isUnderline: !currentUnderline });
    if (selectedAnnotation) onUpdateSelectedAnnotation({ isUnderline: !currentUnderline });
  };

  const handleWhiteoutToggle = (val: boolean) => {
    if (activeEditingText) onUpdateActiveText({ whiteoutBackground: val });
    if (selectedAnnotation) {
      onUpdateSelectedAnnotation({
        type: val ? 'whiteout' : 'text',
        backgroundColor: val ? '#ffffff' : 'transparent',
      });
    }
  };

  const currentFontDisplayName =
    activeEditingText?.fontDisplayName || selectedAnnotation?.fontDisplayName;
  const hasMatchingStandard = STANDARD_FONTS.some(f => f.value === currentFont);

  return (
    <div className="w-full bg-slate-900 border-b border-cyan-500/20 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none shadow-sm z-30 shrink-0">
      {/* Left side: Contextual property controls */}
      <div className="flex flex-wrap items-center gap-2">
        {isTextMode ? (
          <>
            <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider border-r border-white/10 pr-2">
              <Type className="w-3.5 h-3.5" />
              <span>{isZh ? '文字属性' : 'Text'}</span>
            </span>

            {/* When editing existing text from PDF: strictly lock and preserve original font */}
            {currentFontDisplayName ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30 whitespace-nowrap shadow-xs"
                title={isZh ? '已锁定原 PDF 字体，保持原文档格式不变' : 'Original PDF font locked - never changed'}
              >
                <span>🔒 {isZh ? '原文档字体' : 'Original Font'}: {currentFontDisplayName}</span>
              </div>
            ) : (
              /* Font Family Dropdown for newly created text */
              <div className="flex items-center gap-1">
                <select
                  value={currentFont}
                  onChange={e => handleFontChange(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-400 max-w-[160px] sm:max-w-[210px] cursor-pointer"
                  title={isZh ? '文字字体' : 'Font'}
                >
                  {STANDARD_FONTS.map(f => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Font Size Dropdown */}
            <select
              value={currentSize}
              onChange={e => handleSizeChange(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-400 cursor-pointer"
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s}>
                  {s} pt
                </option>
              ))}
            </select>

            {/* Style Toggles: B, I, U */}
            <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
              <button
                type="button"
                onClick={handleBoldToggle}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  currentBold ? 'bg-cyan-500 text-black font-black' : 'text-slate-300 hover:text-white'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleItalicToggle}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  currentItalic ? 'bg-cyan-500 text-black font-black' : 'text-slate-300 hover:text-white'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleUnderlineToggle}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  currentUnderline ? 'bg-cyan-500 text-black font-black' : 'text-slate-300 hover:text-white'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text Color Picker & Swatches */}
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <input
                type="color"
                value={currentColor}
                onChange={e => handleColorChange(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                title="Custom color"
              />
              <div className="hidden sm:flex items-center gap-1">
                {QUICK_COLORS.slice(0, 5).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className="w-3.5 h-3.5 rounded-full border border-white/20 cursor-pointer"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Whiteout Background Toggle */}
            <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300 cursor-pointer select-none hover:border-cyan-500">
              <input
                type="checkbox"
                checked={currentWhiteout}
                onChange={e => handleWhiteoutToggle(e.target.checked)}
                className="rounded cursor-pointer accent-cyan-500"
              />
              <span>{isZh ? '涂白遮盖原字' : 'Whiteout Background'}</span>
            </label>
          </>
        ) : activeTool === 'whiteout' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Eraser className="w-3.5 h-3.5" />
              <span>{isZh ? '涂白模式 (Whiteout)' : 'Whiteout Mode'}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {isZh ? '在页面上按住鼠标拖拽拉出白色矩形遮罩' : 'Click & drag on page to cover any area with pure white'}
            </span>
          </div>
        ) : activeTool === 'freehand' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <PenTool className="w-3.5 h-3.5" />
              <span>{isZh ? '自由绘制 (Freehand)' : 'Pencil'}</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <input
                type="color"
                value={freehandColor}
                onChange={e => onChangeFreehandColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-[11px] text-slate-400">{freehandColor}</span>
            </div>
            <select
              value={freehandWidth}
              onChange={e => onChangeFreehandWidth(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={5}>5px</option>
              <option value={8}>8px</option>
            </select>
          </div>
        ) : activeTool === 'checkmark' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isZh ? '勾选标记 (Checkmark)' : 'Checkmark'}</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <input
                type="color"
                value={checkmarkColor}
                onChange={e => onChangeCheckmarkColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
            <select
              value={checkmarkSize}
              onChange={e => onChangeCheckmarkSize(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={16}>16 pt</option>
              <option value={20}>20 pt</option>
              <option value={24}>24 pt</option>
              <option value={32}>32 pt</option>
            </select>
            <span className="text-[11px] text-slate-400">
              {isZh ? '在画面任意位置点击即可盖上 ✓ 符号' : 'Click anywhere on page to place ✓'}
            </span>
          </div>
        ) : activeTool === 'rectangle' || activeTool === 'line' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              {activeTool === 'rectangle' ? <Square className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              <span>{activeTool === 'rectangle' ? (isZh ? '矩形' : 'Rectangle') : (isZh ? '线条' : 'Line')}</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400">{isZh ? '边框:' : 'Stroke:'}</span>
              <input
                type="color"
                value={shapeStrokeColor}
                onChange={e => onChangeShapeStrokeColor(e.target.value)}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
            <select
              value={shapeStrokeWidth}
              onChange={e => onChangeShapeStrokeWidth(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={5}>5px</option>
            </select>
            {activeTool === 'rectangle' && (
              <select
                value={shapeFillColor}
                onChange={e => onChangeShapeFillColor(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
              >
                <option value="transparent">{isZh ? '无填充' : 'No Fill'}</option>
                <option value="#ffffff">{isZh ? '白色填充' : 'White Fill'}</option>
                <option value="#f1f5f9">{isZh ? '灰色填充' : 'Gray Fill'}</option>
                <option value="#dbeafe">{isZh ? '浅蓝填充' : 'Light Blue'}</option>
              </select>
            )}
          </div>
        ) : activeTool === 'highlight' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
              <Highlighter className="w-3.5 h-3.5" />
              <span>{isZh ? '荧光高亮 (Highlight)' : 'Highlight'}</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              {['#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8', '#fed7aa'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeHighlightColor(c)}
                  className={`w-4 h-4 rounded-full border cursor-pointer ${
                    highlightColor === c ? 'ring-2 ring-white scale-110' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-400">
              {isZh ? '拖拽框选文字施加荧光' : 'Drag over text to highlight'}
            </span>
          </div>
        ) : activeTool === 'stamp' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
              <Stamp className="w-3.5 h-3.5" />
              <span>{isZh ? '印章 (Stamp)' : 'Stamp'}</span>
            </span>
            <select
              value={selectedStampId}
              onChange={e => onChangeStampId(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
            >
              {STAMP_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="CUSTOM">{isZh ? '自定义印章...' : 'Custom Stamp...'}</option>
            </select>
            {selectedStampId === 'CUSTOM' && (
              <input
                type="text"
                value={customStampText}
                onChange={e => onChangeCustomStampText(e.target.value)}
                placeholder="Stamp text..."
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none w-36"
              />
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            {isZh ? '点击左侧工具添加元素，或点击画面文字直接修改' : 'Select a tool from left panel or click text to edit'}
          </span>
        )}
      </div>

      {/* Right side: Delete element or Commit edit button */}
      <div className="flex items-center gap-1.5">
        {activeEditingText && (
          <button
            type="button"
            onClick={onCommitEditing}
            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            title="Commit text edit (Enter)"
          >
            <Check className="w-3 h-3" />
            <span>{isZh ? '完成' : 'Done'}</span>
          </button>
        )}

        {(selectedAnnotation || activeEditingText) && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
            title="Delete selected item (Del)"
          >
            <Trash2 className="w-3 h-3" />
            <span>{isZh ? '删除' : 'Delete'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
