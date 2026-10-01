import React, { useRef, useEffect, useState } from 'react';
import { Edit3, Check, Trash2, Move, StickyNote, Link2, ExternalLink } from 'lucide-react';
import { ExtractedTextItem } from '../../utils/pdfRenderer';
import { PdfAnnotation, STAMP_PRESETS } from '../../utils/pdfEditor';
import { ActiveTextProps } from './PdfescapePropertyBar';

interface PdfescapeCanvasOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  zoomScale: number;
  isZh: boolean;
  activeTool: string;
  extractedTextItems: ExtractedTextItem[];
  annotations: PdfAnnotation[];
  selectedAnnotationId: string | null;
  activeEditingText: (ActiveTextProps & {
    id: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    annotationId?: string;
  }) | null;
  onSelectAnnotation: (id: string | null) => void;
  onStartEditTextItem: (item: ExtractedTextItem) => void;
  onStartEditAnnotation: (ann: PdfAnnotation) => void;
  onStartAddTextAt: (x: number, y: number) => void;
  onUpdateActiveText: (updates: Partial<ActiveTextProps>) => void;
  onCommitEditing: () => void;
  onDeleteSelected: () => void;
  onAddAnnotation: (ann: PdfAnnotation) => void;
  onUpdateAnnotation: (id: string, updates: Partial<PdfAnnotation>) => void;
  // Freehand drawing options
  freehandColor: string;
  freehandWidth: number;
  // Highlight color
  highlightColor: string;
  // Checkmark options
  checkmarkColor: string;
  checkmarkSize: number;
  // Shape options
  shapeStrokeColor: string;
  shapeStrokeWidth: number;
  shapeFillColor: string;
  // Stamp options
  selectedStampId?: string;
  customStampText?: string;
  customStampColor?: string;
  // Live Watermark preview options
  watermarkText?: string;
  watermarkColor?: string;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  watermarkFontSize?: number;
  watermarkLayout?: 'center' | 'tiled';
}

export const PdfescapeCanvasOverlay: React.FC<PdfescapeCanvasOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  zoomScale,
  isZh,
  activeTool,
  extractedTextItems,
  annotations,
  selectedAnnotationId,
  activeEditingText,
  onSelectAnnotation,
  onStartEditTextItem,
  onStartEditAnnotation,
  onStartAddTextAt,
  onUpdateActiveText,
  onCommitEditing,
  onDeleteSelected,
  onAddAnnotation,
  onUpdateAnnotation,
  freehandColor,
  freehandWidth,
  highlightColor,
  checkmarkColor,
  checkmarkSize,
  shapeStrokeColor,
  shapeStrokeWidth,
  shapeFillColor,
  selectedStampId = 'APPROVED',
  customStampText = 'APPROVED & VERIFIED',
  customStampColor = '#b91c1c',
  watermarkText = '',
  watermarkColor = '#94a3b8',
  watermarkOpacity = 0.25,
  watermarkRotation = 45,
  watermarkFontSize = 48,
  watermarkLayout = 'center',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dragging state for creating boxes (Whiteout, Highlight, Rectangle, Line, Link)
  const [isBoxDragging, setIsBoxDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Moving existing annotation
  const [movingAnnotation, setMovingAnnotation] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Resizing existing annotation
  const [resizingAnnotation, setResizingAnnotation] = useState<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Freehand drawing canvas
  const freehandCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPencilDrawing, setIsPencilDrawing] = useState(false);
  const pencilPoints = useRef<{ x: number; y: number }[]>([]);

  // Focus inline input whenever editing opens
  useEffect(() => {
    if (activeEditingText && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeEditingText?.id]);

  // Handle keyboard shortcuts (Delete / Backspace to delete selected annotation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeEditingText) return; // Don't delete annotation if typing inside text input
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        // Only if target is not an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        onDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, activeEditingText, onDeleteSelected]);

  // Set of extracted text IDs that have already been covered/replaced by an annotation
  const coveredTextIds = new Set<string>();
  annotations.forEach(ann => {
    if (ann.coveredTextId) {
      coveredTextIds.add(ann.coveredTextId);
    }
  });

  // Handle mousedown on overlay background
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicked on an interactive handle, inline input, existing annotation, or text item: ignore
    const target = e.target as HTMLElement;
    if (
      target.closest('.interactive-handle') ||
      target.closest('.inline-text-input') ||
      target.closest('.annotation-item') ||
      target.closest('.extracted-text-item')
    ) {
      return;
    }

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // If Freehand tool is active, start drawing
    if (activeTool === 'freehand') {
      setIsPencilDrawing(true);
      pencilPoints.current = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
      const ctx = freehandCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = freehandColor;
        ctx.lineWidth = freehandWidth * zoomScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      return;
    }

    // If Checkmark tool is active, place checkmark directly
    if (activeTool === 'checkmark') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: 0,
        type: 'checkmark',
        xPercent: x,
        yPercent: y,
        textColor: checkmarkColor,
        fontSize: checkmarkSize,
        widthPercent: 0.04,
        heightPercent: 0.03,
      };
      onAddAnnotation(newAnn);
      onSelectAnnotation(newAnn.id);
      return;
    }

    // If Stamp tool is active, place stamp directly
    if (activeTool === 'stamp') {
      const preset = STAMP_PRESETS.find(p => p.id === selectedStampId) || {
        text: customStampText || 'APPROVED',
        color: customStampColor || '#b91c1c',
      };
      const stampText = selectedStampId === 'CUSTOM' ? customStampText : preset.text;
      const stampColor = selectedStampId === 'CUSTOM' ? customStampColor : preset.color;
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: 0,
        type: 'stamp',
        stampType: (selectedStampId as any) || 'APPROVED',
        stampText,
        stampColor,
        xPercent: Math.max(0, x - 0.08),
        yPercent: Math.max(0, y - 0.03),
        widthPercent: 0.18,
        heightPercent: 0.05,
      };
      onAddAnnotation(newAnn);
      onSelectAnnotation(newAnn.id);
      return;
    }

    // If Sticky Note tool is active, place sticky note
    if (activeTool === 'sticky') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: 0,
        type: 'sticky',
        text: isZh ? '在此输入便签备注...' : 'Add sticky note comment here...',
        xPercent: Math.max(0, x - 0.05),
        yPercent: Math.max(0, y - 0.04),
        widthPercent: 0.18,
        heightPercent: 0.1,
        backgroundColor: '#fef08a',
      };
      onAddAnnotation(newAnn);
      onSelectAnnotation(newAnn.id);
      return;
    }

    // If Text tool is active and clicked outside:
    if (activeTool === 'text') {
      // If was editing, commit first
      if (activeEditingText) {
        onCommitEditing();
      }
      // Start adding new text at clicked spot
      onStartAddTextAt(x, y);
      return;
    }

    // Drag-to-create box for Whiteout, Highlight, Rectangle, Line, Link
    if (
      activeTool === 'whiteout' ||
      activeTool === 'highlight' ||
      activeTool === 'rectangle' ||
      activeTool === 'line' ||
      activeTool === 'link'
    ) {
      setIsBoxDragging(true);
      setDragStart({ x, y });
      setDragCurrent({ x, y });
      return;
    }

    // Deselect if clicked blank area in pointer/select mode
    if (activeEditingText) {
      onCommitEditing();
    }
    onSelectAnnotation(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(1, clientX / rect.width));
    const y = Math.max(0, Math.min(1, clientY / rect.height));

    // Freehand drawing stroke
    if (isPencilDrawing && freehandCanvasRef.current) {
      pencilPoints.current.push({ x: clientX, y: clientY });
      const ctx = freehandCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(clientX, clientY);
        ctx.stroke();
      }
      return;
    }

    // Moving existing annotation
    if (movingAnnotation) {
      const dx = (clientX - movingAnnotation.startX) / rect.width;
      const dy = (clientY - movingAnnotation.startY) / rect.height;
      const newX = Math.max(0, Math.min(0.95, movingAnnotation.initialX + dx));
      const newY = Math.max(0, Math.min(0.95, movingAnnotation.initialY + dy));
      onUpdateAnnotation(movingAnnotation.id, {
        xPercent: Number(newX.toFixed(4)),
        yPercent: Number(newY.toFixed(4)),
      });
      return;
    }

    // Resizing existing annotation
    if (resizingAnnotation) {
      const dx = (clientX - resizingAnnotation.startX) / rect.width;
      const dy = (clientY - resizingAnnotation.startY) / rect.height;
      const { initialW, initialH, initialX, initialY, handle } = resizingAnnotation;

      let newW = initialW;
      let newH = initialH;
      let newX = initialX;
      let newY = initialY;

      if (handle.includes('e')) newW = Math.max(0.02, initialW + dx);
      if (handle.includes('s')) newH = Math.max(0.015, initialH + dy);
      if (handle.includes('w')) {
        newW = Math.max(0.02, initialW - dx);
        newX = initialX + dx;
      }
      if (handle.includes('n')) {
        newH = Math.max(0.015, initialH - dy);
        newY = initialY + dy;
      }

      onUpdateAnnotation(resizingAnnotation.id, {
        xPercent: Number(newX.toFixed(4)),
        yPercent: Number(newY.toFixed(4)),
        widthPercent: Number(newW.toFixed(4)),
        heightPercent: Number(newH.toFixed(4)),
      });
      return;
    }

    // Box dragging preview
    if (isBoxDragging) {
      setDragCurrent({ x, y });
    }
  };

  const handleMouseUp = () => {
    // End freehand drawing
    if (isPencilDrawing) {
      setIsPencilDrawing(false);
      const points = pencilPoints.current;
      if (points.length > 2 && overlayRef.current) {
        const rect = overlayRef.current.getBoundingClientRect();
        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });

        const pad = Math.max(4, freehandWidth * 2);
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(rect.width, maxX + pad);
        maxY = Math.min(rect.height, maxY + pad);
        const w = maxX - minX;
        const h = maxY - minY;

        if (w > 4 && h > 4) {
          // Render stroke to offscreen canvas
          const offCanvas = document.createElement('canvas');
          offCanvas.width = Math.ceil(w);
          offCanvas.height = Math.ceil(h);
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.beginPath();
            offCtx.strokeStyle = freehandColor;
            offCtx.lineWidth = freehandWidth * zoomScale;
            offCtx.lineCap = 'round';
            offCtx.lineJoin = 'round';
            points.forEach((p, idx) => {
              const ox = p.x - minX;
              const oy = p.y - minY;
              if (idx === 0) offCtx.moveTo(ox, oy);
              else offCtx.lineTo(ox, oy);
            });
            offCtx.stroke();

            const dataUrl = offCanvas.toDataURL('image/png');
            const newAnn: PdfAnnotation = {
              id: `ann-${Date.now()}`,
              pageIndex: 0,
              type: 'freehand',
              xPercent: minX / rect.width,
              yPercent: minY / rect.height,
              widthPercent: w / rect.width,
              heightPercent: h / rect.height,
              imageDataUrl: dataUrl,
            };
            onAddAnnotation(newAnn);
            onSelectAnnotation(newAnn.id);
          }
        }
      }
      // Clear freehand overlay canvas
      const ctx = freehandCanvasRef.current?.getContext('2d');
      if (ctx && freehandCanvasRef.current) {
        ctx.clearRect(0, 0, freehandCanvasRef.current.width, freehandCanvasRef.current.height);
      }
      return;
    }

    if (movingAnnotation) {
      setMovingAnnotation(null);
      return;
    }

    if (resizingAnnotation) {
      setResizingAnnotation(null);
      return;
    }

    if (isBoxDragging && dragStart && dragCurrent) {
      setIsBoxDragging(false);
      const left = Math.min(dragStart.x, dragCurrent.x);
      const top = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 0.01 && h > 0.008) {
        if (activeTool === 'whiteout') {
          const newAnn: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            pageIndex: 0,
            type: 'whiteout',
            xPercent: left,
            yPercent: top,
            widthPercent: w,
            heightPercent: h,
            text: '',
          };
          onAddAnnotation(newAnn);
          onSelectAnnotation(newAnn.id);
        } else if (activeTool === 'highlight') {
          const newAnn: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            pageIndex: 0,
            type: 'highlight',
            xPercent: left,
            yPercent: top,
            widthPercent: w,
            heightPercent: h,
            backgroundColor: highlightColor,
          };
          onAddAnnotation(newAnn);
          onSelectAnnotation(newAnn.id);
        } else if (activeTool === 'rectangle') {
          const newAnn: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            pageIndex: 0,
            type: 'rectangle',
            xPercent: left,
            yPercent: top,
            widthPercent: w,
            heightPercent: h,
            strokeColor: shapeStrokeColor,
            strokeWidth: shapeStrokeWidth,
            fillColor: shapeFillColor,
          };
          onAddAnnotation(newAnn);
          onSelectAnnotation(newAnn.id);
        } else if (activeTool === 'line') {
          const newAnn: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            pageIndex: 0,
            type: 'line',
            xPercent: left,
            yPercent: top,
            widthPercent: w,
            heightPercent: Math.max(0.01, h),
            strokeColor: shapeStrokeColor,
            strokeWidth: shapeStrokeWidth,
          };
          onAddAnnotation(newAnn);
          onSelectAnnotation(newAnn.id);
        } else if (activeTool === 'link') {
          const url = window.prompt(isZh ? '请输入跳转网址 (URL):' : 'Enter Destination Link URL:', 'https://');
          if (url) {
            const newAnn: PdfAnnotation = {
              id: `ann-${Date.now()}`,
              pageIndex: 0,
              type: 'link',
              xPercent: left,
              yPercent: top,
              widthPercent: w,
              heightPercent: h,
              linkUrl: url,
            };
            onAddAnnotation(newAnn);
            onSelectAnnotation(newAnn.id);
          }
        }
      }
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  // Cursor style depending on active tool
  const cursorStyle =
    activeTool === 'text'
      ? 'cursor-text'
      : activeTool === 'whiteout' ||
        activeTool === 'highlight' ||
        activeTool === 'rectangle' ||
        activeTool === 'line' ||
        activeTool === 'freehand' ||
        activeTool === 'link'
      ? 'cursor-crosshair'
      : activeTool === 'checkmark' || activeTool === 'stamp' || activeTool === 'sticky'
      ? 'cursor-pointer'
      : 'cursor-default';

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 select-none ${cursorStyle}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Freehand Realtime Drawing Canvas */}
      <canvas
        ref={freehandCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Dragging box creation preview */}
      {isBoxDragging && dragStart && dragCurrent && (
        <div
          className={`absolute pointer-events-none border-2 border-dashed ${
            activeTool === 'whiteout'
              ? 'border-amber-400 bg-white/80'
              : activeTool === 'highlight'
              ? 'border-yellow-400 bg-yellow-300/40'
              : activeTool === 'link'
              ? 'border-blue-400 bg-blue-400/20'
              : 'border-cyan-400 bg-cyan-400/20'
          }`}
          style={{
            left: `${Math.min(dragStart.x, dragCurrent.x) * 100}%`,
            top: `${Math.min(dragStart.y, dragCurrent.y) * 100}%`,
            width: `${Math.abs(dragCurrent.x - dragStart.x) * 100}%`,
            height: `${Math.abs(dragCurrent.y - dragStart.y) * 100}%`,
          }}
        />
      )}

      {/* Live Document Watermark Layer (Real-time preview across page) */}
      {watermarkText && watermarkText.trim() && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-[4]">
          {watermarkLayout === 'tiled' ? (
            <div className="w-full h-full grid grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-4 gap-6 p-4 items-center justify-items-center">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    transform: `rotate(${watermarkRotation}deg)`,
                    color: watermarkColor,
                    opacity: watermarkOpacity,
                    fontSize: `${Math.max(13, (watermarkFontSize || 48) * 0.45 * zoomScale)}px`,
                    fontWeight: 800,
                    fontFamily: 'Arial, "Segoe UI", -apple-system, sans-serif',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 1px rgba(0,0,0,0.1)',
                  }}
                >
                  {watermarkText}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div
                style={{
                  transform: `rotate(${watermarkRotation}deg)`,
                  color: watermarkColor,
                  opacity: watermarkOpacity,
                  fontSize: `${(watermarkFontSize || 48) * zoomScale}px`,
                  fontWeight: 800,
                  fontFamily: 'Arial, "Segoe UI", -apple-system, sans-serif',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 1px rgba(0,0,0,0.15)',
                  padding: '12px 24px',
                }}
              >
                {watermarkText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. EXTRACTED TEXT LAYER (Auto Detect Font & Click to Edit) */}
      {extractedTextItems.map(item => {
        // If this item is covered by an active annotation or currently being edited, hide ghost box
        if (coveredTextIds.has(item.id)) return null;
        if (activeEditingText && activeEditingText.id === item.id) return null;

        return (
          <div
            key={item.id}
            onMouseDown={e => {
              e.stopPropagation();
              onStartEditTextItem(item);
            }}
            className="extracted-text-item absolute cursor-pointer hover:bg-cyan-500/20 hover:outline hover:outline-1 hover:outline-cyan-400 rounded-xs transition-colors group z-10"
            style={{
              left: `${item.xPercent * 100}%`,
              top: `${item.yPercent * 100}%`,
              width: `${item.widthPercent * 100}%`,
              height: `${item.heightPercent * 100}%`,
            }}
            title={`${isZh ? '点击直接编辑文字' : 'Click to edit'}: "${item.text}" • ${item.fontDisplayName || item.fontFamily} • ${item.fontSizePt}pt`}
          >
            {/* Hover mini-badge with auto-detected font info */}
            <span className="hidden group-hover:flex absolute -top-5 left-0 items-center gap-1 px-1.5 py-0.5 bg-slate-900/95 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold rounded shadow-lg pointer-events-none whitespace-nowrap z-40">
              <Edit3 className="w-2.5 h-2.5 text-cyan-400" />
              <span>
                {item.fontDisplayName || 'Font'} • {item.fontSizePt}pt{item.isBold ? ' • Bold' : ''}
              </span>
            </span>
          </div>
        );
      })}

      {/* 2. ACTIVE IN-PLACE TEXT EDITING BOX (Auto Follows Exact Font!) */}
      {activeEditingText && (
        <div
          className="absolute z-50 inline-text-input flex items-center"
          style={{
            left: `${activeEditingText.xPercent * 100}%`,
            top: `${activeEditingText.yPercent * 100}%`,
            minWidth: `${Math.max(
              activeEditingText.widthPercent * 100,
              Math.min(90, Math.max(12, (activeEditingText.text.length * activeEditingText.fontSize * 0.65 * 100) / canvasWidth))
            )}%`,
            minHeight: `${Math.max(activeEditingText.heightPercent * 100, 2.5)}%`,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="relative w-full flex items-center shadow-2xl ring-2 ring-cyan-400 rounded bg-white">
            <input
              ref={inputRef}
              type="text"
              value={activeEditingText.text}
              onChange={e => onUpdateActiveText({ text: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitEditing();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCommitEditing();
                }
              }}
              className="w-full px-1.5 py-0.5 outline-none rounded text-left"
              style={{
                fontFamily: activeEditingText.fontFamily,
                fontSize: `${Math.max(8, activeEditingText.fontSize * zoomScale)}px`,
                fontWeight: activeEditingText.isBold ? 'bold' : 'normal',
                fontStyle: activeEditingText.isItalic ? 'italic' : 'normal',
                textDecoration: activeEditingText.isUnderline ? 'underline' : 'none',
                color: activeEditingText.textColor || '#000000',
                backgroundColor: activeEditingText.whiteoutBackground ? '#ffffff' : 'rgba(255,255,255,0.92)',
              }}
            />
            {/* Quick check button */}
            <button
              type="button"
              onMouseDown={e => {
                e.stopPropagation();
                onCommitEditing();
              }}
              className="absolute -right-7 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 shadow-md cursor-pointer transition-transform active:scale-90"
              title="Apply (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. EXISTING ANNOTATIONS & SELECTION HANDLES */}
      {annotations.map(ann => {
        const isSelected = selectedAnnotationId === ann.id;
        const left = `${ann.xPercent * 100}%`;
        const top = `${ann.yPercent * 100}%`;
        const width = `${(ann.widthPercent || 0.15) * 100}%`;
        const height = `${(ann.heightPercent || 0.04) * 100}%`;

        return (
          <div
            key={ann.id}
            onMouseDown={e => {
              e.stopPropagation();
              onSelectAnnotation(ann.id);
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              onStartEditAnnotation(ann);
            }}
            className={`annotation-item absolute pointer-events-auto transition-all group z-20 ${
              isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-cyan-400'
            }`}
            style={{
              left,
              top,
              width: ann.type === 'stamp' ? 'auto' : width,
              height: ann.type === 'stamp' ? 'auto' : height,
            }}
          >
            {/* Annotation Content Rendering */}
            {ann.type === 'whiteout' && (
              <div
                className="w-full h-full bg-white flex items-center px-1 overflow-hidden"
                style={{
                  fontFamily: ann.fontFamily,
                  fontSize: `${(ann.fontSize || 12) * zoomScale}px`,
                  fontWeight: ann.isBold ? 'bold' : 'normal',
                  fontStyle: ann.isItalic ? 'italic' : 'normal',
                  textDecoration: ann.isUnderline ? 'underline' : 'none',
                  color: ann.textColor || '#000000',
                }}
              >
                <span className="whitespace-nowrap">{ann.text || ''}</span>
              </div>
            )}

            {ann.type === 'text' && (
              <div
                className="w-full h-full flex items-center px-1 whitespace-nowrap overflow-hidden"
                style={{
                  fontFamily: ann.fontFamily,
                  fontSize: `${(ann.fontSize || 12) * zoomScale}px`,
                  fontWeight: ann.isBold ? 'bold' : 'normal',
                  fontStyle: ann.isItalic ? 'italic' : 'normal',
                  textDecoration: ann.isUnderline ? 'underline' : 'none',
                  color: ann.textColor || '#000000',
                  backgroundColor: ann.backgroundColor || 'transparent',
                }}
              >
                <span>{ann.text || ''}</span>
              </div>
            )}

            {ann.type === 'highlight' && (
              <div
                className="w-full h-full opacity-45 rounded-xs"
                style={{ backgroundColor: ann.backgroundColor || '#fef08a' }}
              />
            )}

            {ann.type === 'rectangle' && (
              <div
                className="w-full h-full rounded-xs"
                style={{
                  borderColor: ann.strokeColor || '#000000',
                  borderWidth: `${Math.max(1, (ann.strokeWidth || 2) * zoomScale)}px`,
                  borderStyle: 'solid',
                  backgroundColor: ann.fillColor || 'transparent',
                }}
              />
            )}

            {ann.type === 'line' && (
              <div
                className="w-full"
                style={{
                  borderBottomColor: ann.strokeColor || '#000000',
                  borderBottomWidth: `${Math.max(1, (ann.strokeWidth || 2) * zoomScale)}px`,
                  borderBottomStyle: 'solid',
                  height: '50%',
                }}
              />
            )}

            {ann.type === 'checkmark' && (
              <div
                className="w-full h-full flex items-center justify-center font-bold"
                style={{
                  color: ann.textColor || '#16a34a',
                  fontSize: `${(ann.fontSize || 22) * zoomScale}px`,
                  lineHeight: 1,
                }}
              >
                ✓
              </div>
            )}

            {ann.type === 'sticky' && (
              <div
                className="w-full h-full p-1.5 rounded-sm shadow-md border border-amber-300 font-sans text-xs leading-tight overflow-hidden flex flex-col"
                style={{ backgroundColor: ann.backgroundColor || '#fef08a', color: '#451a03' }}
              >
                <div className="flex items-center gap-1 font-bold text-[10px] text-amber-900 border-b border-amber-300/60 pb-0.5 mb-0.5">
                  <StickyNote className="w-2.5 h-2.5 text-amber-700" />
                  <span>{isZh ? '便签' : 'Note'}</span>
                </div>
                <div className="text-[11px] font-medium break-words overflow-auto">
                  {ann.text || (isZh ? '双击编辑便签' : 'Double click to edit note')}
                </div>
              </div>
            )}

            {ann.type === 'link' && (
              <div className="w-full h-full border border-blue-500 bg-blue-500/15 rounded-xs p-0.5 flex items-center justify-between text-[9px] text-blue-700 font-mono">
                <div className="flex items-center gap-0.5 truncate">
                  <Link2 className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span className="truncate">{ann.linkUrl || 'link'}</span>
                </div>
                {ann.linkUrl && (
                  <ExternalLink
                    className="w-2.5 h-2.5 text-blue-600 cursor-pointer shrink-0"
                    onClick={() => window.open(ann.linkUrl, '_blank')}
                  />
                )}
              </div>
            )}

            {(ann.type === 'image' || ann.type === 'signature' || ann.type === 'freehand') && ann.imageDataUrl && (
              <img
                src={ann.imageDataUrl}
                alt="layer"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}

            {ann.type === 'stamp' && (
              <div
                className="px-2.5 py-1 rounded border-2 font-mono font-bold text-xs shadow-md whitespace-nowrap tracking-wider uppercase transform -rotate-3"
                style={{
                  color: ann.stampColor || '#b91c1c',
                  borderColor: ann.stampColor || '#b91c1c',
                  backgroundColor: '#fff1f2',
                }}
              >
                {ann.stampText || 'APPROVED'}
              </div>
            )}

            {/* SELECTION RESIZE HANDLES & MOVE DRAGGER */}
            {isSelected && (
              <>
                {/* Center Move Handle */}
                <div
                  className="interactive-handle absolute -top-6 left-1/2 -translate-x-1/2 p-1 rounded bg-blue-600 text-white cursor-move shadow-md z-30"
                  onMouseDown={e => {
                    e.stopPropagation();
                    const rect = overlayRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setMovingAnnotation({
                      id: ann.id,
                      startX: e.clientX - rect.left,
                      startY: e.clientY - rect.top,
                      initialX: ann.xPercent,
                      initialY: ann.yPercent,
                    });
                  }}
                  title="Drag to move"
                >
                  <Move className="w-3 h-3" />
                </div>

                {/* 4 Corner Resize Handles */}
                <div
                  className="interactive-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow-xs"
                  onMouseDown={e => {
                    e.stopPropagation();
                    const rect = overlayRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setResizingAnnotation({
                      id: ann.id,
                      handle: 'nw',
                      startX: e.clientX - rect.left,
                      startY: e.clientY - rect.top,
                      initialX: ann.xPercent,
                      initialY: ann.yPercent,
                      initialW: ann.widthPercent || 0.15,
                      initialH: ann.heightPercent || 0.04,
                    });
                  }}
                />
                <div
                  className="interactive-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow-xs"
                  onMouseDown={e => {
                    e.stopPropagation();
                    const rect = overlayRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setResizingAnnotation({
                      id: ann.id,
                      handle: 'ne',
                      startX: e.clientX - rect.left,
                      startY: e.clientY - rect.top,
                      initialX: ann.xPercent,
                      initialY: ann.yPercent,
                      initialW: ann.widthPercent || 0.15,
                      initialH: ann.heightPercent || 0.04,
                    });
                  }}
                />
                <div
                  className="interactive-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow-xs"
                  onMouseDown={e => {
                    e.stopPropagation();
                    const rect = overlayRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setResizingAnnotation({
                      id: ann.id,
                      handle: 'sw',
                      startX: e.clientX - rect.left,
                      startY: e.clientY - rect.top,
                      initialX: ann.xPercent,
                      initialY: ann.yPercent,
                      initialW: ann.widthPercent || 0.15,
                      initialH: ann.heightPercent || 0.04,
                    });
                  }}
                />
                <div
                  className="interactive-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow-xs"
                  onMouseDown={e => {
                    e.stopPropagation();
                    const rect = overlayRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setResizingAnnotation({
                      id: ann.id,
                      handle: 'se',
                      startX: e.clientX - rect.left,
                      startY: e.clientY - rect.top,
                      initialX: ann.xPercent,
                      initialY: ann.yPercent,
                      initialW: ann.widthPercent || 0.15,
                      initialH: ann.heightPercent || 0.04,
                    });
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
