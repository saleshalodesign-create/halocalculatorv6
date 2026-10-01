import React from 'react';
import {
  Type,
  Image as ImageIcon,
  Link2,
  Minus,
  Square,
  CheckSquare,
  Eraser,
  PenTool,
  MessageSquare,
  Highlighter,
  Strikethrough,
  Underline,
  Stamp,
  ArrowUp,
  ArrowDown,
  RotateCw,
  RotateCcw,
  Trash2,
  FilePlus2,
  Sliders,
  Upload,
  RefreshCw,
  FileText,
  ShieldAlert,
  X,
  Check,
} from 'lucide-react';

export type PdfescapeTab = 'insert' | 'annotate' | 'watermark' | 'page' | 'document' | 'upload';

interface PdfescapeToolPanelProps {
  activeTab: PdfescapeTab;
  onChangeTab: (tab: PdfescapeTab) => void;
  activeTool: string;
  onSelectTool: (tool: string) => void;
  isZh: boolean;
  activeSource: string;
  // Image upload trigger
  onTriggerImageUpload: () => void;
  // Page actions
  currentPageIndex: number;
  totalPages: number;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  onDeleteCurrentPage: () => void;
  onAddBlankPage: () => void;
  onMovePageUp: () => void;
  onMovePageDown: () => void;
  // File actions
  onUploadPdf: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateBlankA4: () => void;
  onSelectCurrentQuote: () => void;
  // Watermark controls
  watermarkText?: string;
  onChangeWatermarkText?: (t: string) => void;
  watermarkColor?: string;
  onChangeWatermarkColor?: (c: string) => void;
  watermarkOpacity?: number;
  onChangeWatermarkOpacity?: (o: number) => void;
  watermarkRotation?: number;
  onChangeWatermarkRotation?: (r: number) => void;
  watermarkFontSize?: number;
  onChangeWatermarkFontSize?: (s: number) => void;
  watermarkLayout?: 'center' | 'tiled';
  onChangeWatermarkLayout?: (l: 'center' | 'tiled') => void;
  onClearWatermark?: () => void;
}

export const PdfescapeToolPanel: React.FC<PdfescapeToolPanelProps> = ({
  activeTab,
  onChangeTab,
  activeTool,
  onSelectTool,
  isZh,
  activeSource,
  onTriggerImageUpload,
  currentPageIndex,
  totalPages,
  onRotateClockwise,
  onRotateCounterClockwise,
  onDeleteCurrentPage,
  onAddBlankPage,
  onMovePageUp,
  onMovePageDown,
  onUploadPdf,
  onCreateBlankA4,
  onSelectCurrentQuote,
  watermarkText = '',
  onChangeWatermarkText = () => {},
  watermarkColor = '#94a3b8',
  onChangeWatermarkColor = () => {},
  watermarkOpacity = 0.25,
  onChangeWatermarkOpacity = () => {},
  watermarkRotation = 45,
  onChangeWatermarkRotation = () => {},
  watermarkFontSize = 48,
  onChangeWatermarkFontSize = () => {},
  watermarkLayout = 'center',
  onChangeWatermarkLayout = () => {},
  onClearWatermark = () => {},
}) => {
  const tabs: { id: PdfescapeTab; labelZh: string; labelEn: string }[] = [
    { id: 'insert', labelZh: '插入 (Insert)', labelEn: 'Insert' },
    { id: 'annotate', labelZh: '标注 (Annotate)', labelEn: 'Annotate' },
    { id: 'watermark', labelZh: '水印 (Watermark)', labelEn: 'Watermark' },
    { id: 'page', labelZh: '页面 (Page)', labelEn: 'Page' },
    { id: 'document', labelZh: '单据明细', labelEn: 'Quote Form' },
    { id: 'upload', labelZh: '文件源', labelEn: 'Files' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-700/80 w-full select-none">
      {/* Top Tab Bar (PDFescape Style: Insert | Annotate | Page | Document | Upload) */}
      <div className="flex border-b border-slate-700 bg-slate-950 overflow-x-auto mac-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex-1 py-2 px-2.5 text-center font-bold text-xs whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            {isZh ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="p-3 overflow-y-auto mac-scrollbar flex-1 space-y-3">
        {/* 1. INSERT TAB (PDFescape primary tools) */}
        {activeTab === 'insert' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isZh ? 'PDFescape 常用插入工具' : 'PDFescape Insert Tools'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Text Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('text')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-blue-600/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <Type className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-xs">{isZh ? '文字 (Text)' : 'Text'}</span>
              </button>

              {/* Whiteout Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('whiteout')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'whiteout'
                    ? 'bg-amber-600/20 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <Eraser className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-xs">{isZh ? '涂白 (Whiteout)' : 'Whiteout'}</span>
              </button>

              {/* Image Tool */}
              <button
                type="button"
                onClick={onTriggerImageUpload}
                className="p-2.5 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-xs">{isZh ? '图片 (Image)' : 'Image'}</span>
              </button>

              {/* Freehand Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('freehand')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'freehand'
                    ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <PenTool className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-xs">{isZh ? '手写画笔 (Freehand)' : 'Freehand'}</span>
              </button>

              {/* Checkmark Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('checkmark')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'checkmark'
                    ? 'bg-green-600/20 border-green-400 text-green-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <CheckSquare className="w-5 h-5 text-green-400" />
                <span className="font-bold text-xs">{isZh ? '打勾标记 (Checkmark)' : 'Checkmark'}</span>
              </button>

              {/* Line Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('line')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'line'
                    ? 'bg-blue-600/20 border-blue-400 text-blue-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <Minus className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-xs">{isZh ? '线条 (Line)' : 'Line'}</span>
              </button>

              {/* Rectangle Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('rectangle')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'rectangle'
                    ? 'bg-indigo-600/20 border-indigo-400 text-indigo-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <Square className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-xs">{isZh ? '矩形框 (Rectangle)' : 'Rectangle'}</span>
              </button>

              {/* Link Tool */}
              <button
                type="button"
                onClick={() => onSelectTool('link')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'link'
                    ? 'bg-cyan-600/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <Link2 className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-xs">{isZh ? '超链接 (Link)' : 'Link'}</span>
              </button>
            </div>

            {/* Quick Helper Banner */}
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300 leading-relaxed">
              💡 {isZh ? '点击【文字】后，直接点击画面上任何文字即可修改！或按住鼠标拖拽拉出涂白框。' : 'Select Text, then click any text on the PDF to edit it directly! Or drag to whiteout.'}
            </div>
          </div>
        )}

        {/* 2. ANNOTATE TAB (Sticky notes, highlights, stamps) */}
        {activeTab === 'annotate' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isZh ? 'PDFescape 批注工具' : 'PDFescape Annotations'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Highlight */}
              <button
                type="button"
                onClick={() => onSelectTool('highlight')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'highlight'
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Highlighter className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-xs">{isZh ? '荧光高亮 (Highlight)' : 'Highlight'}</span>
              </button>

              {/* Stamp */}
              <button
                type="button"
                onClick={() => onSelectTool('stamp')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'stamp'
                    ? 'bg-purple-600/20 border-purple-400 text-purple-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Stamp className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-xs">{isZh ? '官方印章 (Stamp)' : 'Stamp'}</span>
              </button>

              {/* Sticky Note */}
              <button
                type="button"
                onClick={() => onSelectTool('sticky')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'sticky'
                    ? 'bg-amber-600/20 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-xs">{isZh ? '便签便笺 (Sticky)' : 'Sticky Note'}</span>
              </button>

              {/* Signature Pad */}
              <button
                type="button"
                onClick={() => onSelectTool('signature')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTool === 'signature'
                    ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <PenTool className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-xs">{isZh ? '手写签名 (Sign)' : 'Signature'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. WATERMARK TAB (Global Document Watermark) */}
        {activeTab === 'watermark' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{isZh ? '全局文档水印设置' : 'Document Watermark'}</span>
              </span>
              {watermarkText && (
                <button
                  type="button"
                  onClick={onClearWatermark}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isZh ? '清除水印' : 'Clear'}</span>
                </button>
              )}
            </div>

            {/* Watermark Layout Mode (Center Diagonal vs Tiled Grid) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400">
                {isZh ? '水印排版模式' : 'Layout Mode'}:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeWatermarkLayout('center')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    watermarkLayout === 'center'
                      ? 'border-amber-400 bg-amber-950/60 text-amber-300 shadow-xs'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{isZh ? '📐 单体居中倾斜' : '📐 Center Diagonal'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeWatermarkLayout('tiled')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    watermarkLayout === 'tiled'
                      ? 'border-amber-400 bg-amber-950/60 text-amber-300 shadow-xs'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{isZh ? '▦ 全页平铺网格' : '▦ Tiled Repeating Grid'}</span>
                </button>
              </div>
            </div>

            {/* Presets Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400">
                {isZh ? '常用水印预设' : 'Quick Presets'}:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { text: 'CONFIDENTIAL', labelZh: '机密文件', color: '#ef4444' },
                  { text: 'SAMPLE', labelZh: '样品样张', color: '#94a3b8' },
                  { text: 'DRAFT', labelZh: '草稿文件', color: '#f59e0b' },
                  { text: 'APPROVED', labelZh: '已批准', color: '#10b981' },
                  { text: 'PAID', labelZh: '已付款', color: '#059669' },
                  { text: 'FOR REVIEW ONLY', labelZh: '仅供审阅', color: '#3b82f6' },
                  { text: 'VOID', labelZh: '作废无效', color: '#dc2626' },
                  { text: 'INTERNAL ONLY', labelZh: '内部专用', color: '#8b5cf6' },
                  { text: 'HALO DESIGN HUB', labelZh: '公司水印', color: '#6366f1' },
                ].map(p => (
                  <button
                    key={p.text}
                    type="button"
                    onClick={() => {
                      onChangeWatermarkText(p.text);
                      onChangeWatermarkColor(p.color);
                    }}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer truncate ${
                      watermarkText === p.text
                        ? 'border-amber-400 bg-amber-950/70 text-amber-300 shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={p.text}
                  >
                    {isZh ? p.labelZh : p.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Watermark Text Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>{isZh ? '自定义水印文字' : 'Watermark Text'}:</span>
                {watermarkText && (
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {watermarkText.length} {isZh ? '字' : 'chars'}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => onChangeWatermarkText(e.target.value)}
                  placeholder={isZh ? '例如: CONFIDENTIAL / 绝密 / 样品...' : 'e.g. CONFIDENTIAL / DRAFT...'}
                  className="w-full p-2 pr-7 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 font-mono text-xs outline-none focus:border-amber-400"
                />
                {watermarkText && (
                  <button
                    type="button"
                    onClick={() => onChangeWatermarkText('')}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    title={isZh ? '清空' : 'Clear'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400">
                {isZh ? '水印颜色' : 'Color'}:
              </label>
              <div className="flex items-center gap-2">
                {['#94a3b8', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#334155'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChangeWatermarkColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      watermarkColor === c ? 'scale-115 border-white shadow-md' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={watermarkColor}
                  onChange={e => onChangeWatermarkColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Opacity Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400">
                {isZh ? '透明度 (Opacity)' : 'Opacity'}: {(watermarkOpacity * 100).toFixed(0)}%
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.12, 0.22, 0.35, 0.5].map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => onChangeWatermarkOpacity(op)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      watermarkOpacity === op
                        ? 'border-amber-400 bg-amber-950/60 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {(op * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400">
                {isZh ? '倾斜角度 (Angle)' : 'Angle'}:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { angle: 45, label: '45°' },
                  { angle: 30, label: '30°' },
                  { angle: 0, label: '0°' },
                  { angle: -45, label: '-45°' },
                ].map(r => (
                  <button
                    key={r.angle}
                    type="button"
                    onClick={() => onChangeWatermarkRotation(r.angle)}
                    className={`py-1 text-center rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      watermarkRotation === r.angle
                        ? 'border-amber-400 bg-amber-950/60 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400">
                {isZh ? '字号大小 (Font Size)' : 'Size'}: {watermarkFontSize}pt
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[32, 44, 56, 72].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onChangeWatermarkFontSize(sz)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      watermarkFontSize === sz
                        ? 'border-amber-400 bg-amber-950/60 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sz}pt
                  </button>
                ))}
              </div>
            </div>

            {/* Live Indicator */}
            <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
              watermarkText
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}>
              {watermarkText ? (
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {isZh
                      ? `水印实时生效中：“${watermarkText}” (${watermarkLayout === 'tiled' ? '全页平铺' : '单体居中'} · ${watermarkRotation}° · ${(watermarkOpacity * 100).toFixed(0)}%透明度)，下载与打印将完整嵌入。`
                      : `Watermark active: "${watermarkText}" (${watermarkLayout === 'tiled' ? 'Tiled Grid' : 'Center'} · ${watermarkRotation}°), embedded in exports & prints.`}
                  </span>
                </div>
              ) : (
                <span>
                  💡 {isZh ? '选择预设或输入自定义文字，即可在文档页面实时生成水印，导出与打印自动同步。' : 'Select a preset or enter text to preview watermarks in real-time.'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 4. PAGE TAB (Rotate, Delete, Add page, Move page) */}
        {activeTab === 'page' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isZh ? 'PDFescape 页面管理' : 'PDFescape Page Tools'}
            </span>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                {isZh ? '当前选中第' : 'Current Page:'}{' '}
                <strong className="text-cyan-400 font-mono text-sm">{currentPageIndex + 1}</strong> / {totalPages}{' '}
                {isZh ? '页' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRotateClockwise}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <span>{isZh ? '顺时针 90°' : 'Rotate CW'}</span>
              </button>

              <button
                type="button"
                onClick={onRotateCounterClockwise}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>{isZh ? '逆时针 90°' : 'Rotate CCW'}</span>
              </button>

              <button
                type="button"
                onClick={onMovePageUp}
                disabled={currentPageIndex === 0}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <ArrowUp className="w-4 h-4 text-blue-400" />
                <span>{isZh ? '上移一页' : 'Move Up'}</span>
              </button>

              <button
                type="button"
                onClick={onMovePageDown}
                disabled={currentPageIndex >= totalPages - 1}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <ArrowDown className="w-4 h-4 text-blue-400" />
                <span>{isZh ? '下移一页' : 'Move Down'}</span>
              </button>

              <button
                type="button"
                onClick={onAddBlankPage}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <FilePlus2 className="w-4 h-4 text-emerald-400" />
                <span>{isZh ? '追加空白页' : 'Add Blank Page'}</span>
              </button>

              <button
                type="button"
                onClick={onDeleteCurrentPage}
                disabled={totalPages <= 1}
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/30 text-red-400 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isZh ? '删除本页' : 'Delete Page'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. FILES TAB (Upload PDF, Blank A4, Switch back to quote) */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isZh ? 'PDF 文件源管理' : 'Document Source'}
            </span>

            {/* Upload PDF Box */}
            <label className="p-4 rounded-2xl border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center">
              <Upload className="w-6 h-6 text-cyan-400" />
              <div className="font-bold text-xs text-white">
                {isZh ? '上传外部 PDF 文件' : 'Upload External PDF'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isZh ? '选择本地 .pdf 文件直接载入编辑' : 'Load any PDF file into editor'}
              </div>
              <input type="file" accept="application/pdf" onChange={onUploadPdf} className="hidden" />
            </label>

            {/* Create Blank A4 */}
            <button
              type="button"
              onClick={onCreateBlankA4}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <FilePlus2 className="w-4 h-4 text-emerald-400" />
              <span>{isZh ? '创建空白 A4 纸张画布' : 'Create Blank A4 Canvas'}</span>
            </button>

            {/* Switch back to current quotation */}
            {activeSource !== 'currentQuote' && (
              <button
                type="button"
                onClick={onSelectCurrentQuote}
                className="w-full p-3 rounded-xl border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>{isZh ? '切回开单报价单' : 'Switch Back to Quote Sheet'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
