import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Download,
  Printer,
  MessageSquare,
  Upload,
  Stamp,
  PenTool,
  Type,
  Square,
  Check,
  Plus,
  Trash2,
  Sliders,
  FileCheck,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Save,
  Crosshair,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FilePlus2,
  ZoomIn,
  ZoomOut,
  Highlighter,
  Copy,
  Scissors,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Replace,
  Edit3,
  MousePointer,
  Undo2,
  ShieldAlert,
} from 'lucide-react';
import { QuoteItem, QuoteRecord } from '../types';
import { DocumentType } from '../utils/messaging';
import {
  PdfAnnotation,
  STAMP_PRESETS,
  generateHaloPdfBytes,
  applyPdfAnnotations,
  downloadPdfBytes,
  createPdfUrl,
  readFileAsArrayBuffer,
  getPdfPageCount,
  createBlankA4PdfBytes,
  PdfEditOptions,
  generateSignatureDataUrl,
  generateUniqueAnnotationId,
} from '../utils/pdfEditor';
import {
  loadPdfDocument,
  renderPdfPageToCanvas,
  extractTextFromPage,
  ExtractedTextItem,
} from '../utils/pdfRenderer';
import { useLanguage } from '../context/LanguageContext';
import { openWhatsApp } from '../utils/messaging';
import {
  PdfescapePropertyBar,
  ActiveTextProps,
  STANDARD_FONTS,
} from './pdf/PdfescapePropertyBar';
import { PdfescapeToolPanel, PdfescapeTab } from './pdf/PdfescapeToolPanel';
import { PdfescapeCanvasOverlay } from './pdf/PdfescapeCanvasOverlay';

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: QuoteItem[];
  initialRecordData?: Partial<QuoteRecord>;
  initialDocType?: DocumentType;
  onSaveToQuoteSheet?: (items: QuoteItem[], data: Partial<QuoteRecord>) => void;
}

type DocumentSource = 'currentQuote' | 'upload' | 'blankA4';

export const PdfEditorModal: React.FC<PdfEditorModalProps> = ({
  isOpen,
  onClose,
  initialItems = [],
  initialRecordData = {},
  initialDocType = 'quote',
  onSaveToQuoteSheet,
}) => {
  const { language } = useLanguage();
  const isZh = language === 'zh';

  // Active Editor Tab & Document Source (PDFescape style tabs: insert | annotate | page | document | upload)
  const [activeTab, setActiveTab] = useState<PdfescapeTab>('insert');
  // Default to clean blank A4 file as requested
  const [activeSource, setActiveSource] = useState<DocumentSource>('blankA4');

  // Multi-page & Page Transformations
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [watermarkColor, setWatermarkColor] = useState<string>('#94a3b8');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(48);
  const [watermarkLayout, setWatermarkLayout] = useState<'center' | 'tiled'>('center');
  const [deletePageIndices, setDeletePageIndices] = useState<number[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);

  // Canvas PDF Viewer & Zoom
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [pageCanvasDimensions, setPageCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 595,
    height: 842,
  });
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [extractedTextItems, setExtractedTextItems] = useState<ExtractedTextItem[]>([]);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [showTextInspector, setShowTextInspector] = useState<boolean>(false);
  const [textSearchFilter, setTextSearchFilter] = useState<string>('');

  // Active Tool Mode (Default to 'text' for instant text editing)
  const [activeTool, setActiveTool] = useState<string>('text');

  // Selected annotation on canvas
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Active in-place text editing box (Auto Follows Detected Font)
  type ActiveEditingStateType = (ActiveTextProps & {
    id: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    annotationId?: string;
  }) | null;

  const [activeEditingText, setActiveEditingText] = useState<ActiveEditingStateType>(null);
  const activeEditingTextRef = useRef<ActiveEditingStateType>(null);
  useEffect(() => {
    activeEditingTextRef.current = activeEditingText;
  }, [activeEditingText]);

  // Undo history stack
  const [undoStack, setUndoStack] = useState<PdfAnnotation[][]>([]);

  // Tool specific options
  const [freehandColor, setFreehandColor] = useState<string>('#000000');
  const [freehandWidth, setFreehandWidth] = useState<number>(2);
  const [checkmarkColor, setCheckmarkColor] = useState<string>('#16a34a');
  const [checkmarkSize, setCheckmarkSize] = useState<number>(22);
  const [shapeStrokeColor, setShapeStrokeColor] = useState<string>('#000000');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState<number>(2);
  const [shapeFillColor, setShapeFillColor] = useState<string>('transparent');

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');

  // Drag-to-Select Box on PDF canvas (for Whiteout & Highlight)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // --- Document Structured Data State ---
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [docNo, setDocNo] = useState<string>(initialRecordData.docNo || 'Q-2026-001');
  const [dateStr, setDateStr] = useState<string>(
    initialRecordData.dateFormatted || new Date().toISOString().split('T')[0]
  );
  const [customerName, setCustomerName] = useState<string>(initialRecordData.customerName || '');
  const [contact, setContact] = useState<string>(initialRecordData.contact || '');
  const [customerPhone, setCustomerPhone] = useState<string>(initialRecordData.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialRecordData.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState<string>(initialRecordData.customerAddress || '');
  const [deposit, setDeposit] = useState<string>(
    initialRecordData.deposit ? String(initialRecordData.deposit) : '0'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialRecordData.paymentMethod || 'PAYNOW'
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialRecordData.paymentTerms || 'Payment upon delivery / 7 days'
  );
  const [showSizes, setShowSizes] = useState<boolean>(initialRecordData.showSizes !== false);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Line items state
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (initialItems.length > 0) return initialItems;
    return [
      {
        id: 'item-1',
        title: '3D ACRYLIC LED LIGHTBOX SIGNAGE',
        originalWidth: 120,
        originalHeight: 36,
        widthInches: 120,
        heightInches: 36,
        unit: 'in',
        totalPrice: 480,
        quantity: 1,
      },
    ];
  });

  // --- External Uploaded PDF State ---
  const [uploadedPdfBytes, setUploadedPdfBytes] = useState<ArrayBuffer | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // --- Visual Annotations State (Stamps, Text, Whiteouts, Signatures, Highlights) ---
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

  // Safe helper to append annotation with collision-proof unique ID
  const appendAnnotationSafe = (ann: PdfAnnotation) => {
    setAnnotations(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      let id = ann.id;
      while (!id || existingIds.has(id)) {
        id = generateUniqueAnnotationId();
      }
      return [...prev, { ...ann, id }];
    });
  };

  const [selectedStampId, setSelectedStampId] = useState<string>('HALO_SEAL');
  const [customStampText, setCustomStampText] = useState<string>('HALO DESIGN HUB (UEN: 53142015M)');
  const [customStampColor, setCustomStampColor] = useState<string>('#b91c1c');

  // Text tool options in sidebar
  const [annotationText, setAnnotationText] = useState<string>('APPROVED & SIGNED OFF');
  const [annotationFontSize, setAnnotationFontSize] = useState<number>(14);
  const [annotationColor, setAnnotationColor] = useState<string>('#059669');
  const [annotationBold, setAnnotationBold] = useState<boolean>(true);
  const [annotationBgColor, setAnnotationBgColor] = useState<string>('transparent');

  // Whiteout options
  const [whiteoutReplacementText, setWhiteoutReplacementText] = useState<string>('');
  const [whiteoutWidthPercent, setWhiteoutWidthPercent] = useState<number>(0.25);
  const [whiteoutHeightPercent, setWhiteoutHeightPercent] = useState<number>(0.04);

  // Highlight options
  const [highlightColor, setHighlightColor] = useState<string>('#fef08a');

  // Target pin coordinates (percentage 0..1)
  const [clickX, setClickX] = useState<number>(0.5);
  const [clickY, setClickY] = useState<number>(0.5);

  // Signature Studio & Placement State
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const modalSignatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState<boolean>(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signaturePenColor, setSignaturePenColor] = useState<string>('#0f172a');
  const [typedSignatureName, setTypedSignatureName] = useState<string>('');
  const [typedSignatureStyle, setTypedSignatureStyle] = useState<'script' | 'cursive' | 'formal'>('script');
  const [currentSignatureDataUrl, setCurrentSignatureDataUrl] = useState<string | null>(null);
  const [pendingPlacementCoords, setPendingPlacementCoords] = useState<{ x: number; y: number } | null>(null);

  // Generated PDF Output State
  const [basePdfBytes, setBasePdfBytes] = useState<ArrayBuffer | null>(null);
  const [currentPdfBytes, setCurrentPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Sync initial props on open
  useEffect(() => {
    if (isOpen) {
      if (initialItems.length > 0) setItems(initialItems);
      if (initialRecordData.docNo) setDocNo(initialRecordData.docNo);
      if (initialRecordData.customerName) {
        setCustomerName(initialRecordData.customerName);
        setTypedSignatureName(initialRecordData.customerName);
      }
      if (initialRecordData.customerPhone) setCustomerPhone(initialRecordData.customerPhone);
      if (initialRecordData.customerEmail) setCustomerEmail(initialRecordData.customerEmail);
      if (initialRecordData.customerAddress) setCustomerAddress(initialRecordData.customerAddress);
      if (initialRecordData.contact) setContact(initialRecordData.contact);
      if (initialDocType) setDocType(initialDocType);

      // User requested: PDF editor defaults to a clean blank A4 file
      setActiveSource('blankA4');
      setUploadedFileName('Blank_A4_Canvas.pdf');
    }
  }, [isOpen, initialItems, initialRecordData, initialDocType]);

  // Financial calculations
  const grandTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.totalPrice * it.quantity, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (grandTotal * discountValue) / 100;
    }
    if (discountType === 'fixed') {
      return Math.min(grandTotal, discountValue);
    }
    return 0;
  }, [grandTotal, discountType, discountValue]);

  const finalTotal = useMemo(() => {
    return Math.max(0, grandTotal - discountAmount);
  }, [grandTotal, discountAmount]);

  const depositNum = parseFloat(deposit) || 0;
  const balanceDue = Math.max(0, finalTotal - depositNum);

  // Generate or update Base PDF preview (Independent of visual annotations for 60fps performance)
  const refreshBasePdf = useCallback(async () => {
    setIsProcessing(true);
    try {
      let rawBytes: ArrayBuffer;

      if (activeSource === 'blankA4') {
        rawBytes = uploadedPdfBytes || (await createBlankA4PdfBytes());
      } else if (activeSource === 'upload' && uploadedPdfBytes) {
        rawBytes = uploadedPdfBytes;
      } else {
        // Generate from structured quote form data
        const data: Partial<QuoteRecord> = {
          docNo,
          dateFormatted: dateStr,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          contact,
          deposit: depositNum,
          paymentMethod,
          paymentTerms,
          showSizes,
          docType,
        };
        rawBytes = await generateHaloPdfBytes(
          items,
          data,
          docType,
          grandTotal,
          discountAmount,
          finalTotal
        );
      }

      // Apply structural page operations (rotations, page deletions, page order) to base PDF
      const hasPageOps =
        Object.keys(rotations).length > 0 ||
        deletePageIndices.length > 0 ||
        pageOrder.length > 0;

      let processedBase: ArrayBuffer = rawBytes;
      if (hasPageOps) {
        processedBase = await applyPdfAnnotations(rawBytes, [], {
          rotations,
          deletePages: deletePageIndices,
          pageOrder: pageOrder.length > 0 ? pageOrder : undefined,
        });
      }

      const pCount = await getPdfPageCount(processedBase);
      setTotalPages(Math.max(1, pCount));
      setBasePdfBytes(processedBase);
    } catch (err) {
      console.error('Error generating base PDF preview:', err);
      showToast(isZh ? 'PDF 生成出错，请检查输入' : 'Error updating PDF');
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeSource,
    uploadedPdfBytes,
    docNo,
    dateStr,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    contact,
    depositNum,
    paymentMethod,
    paymentTerms,
    showSizes,
    docType,
    items,
    grandTotal,
    discountAmount,
    finalTotal,
    rotations,
    deletePageIndices,
    pageOrder,
    isZh,
  ]);

  // Auto-regenerate base PDF only when document data changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(refreshBasePdf, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, refreshBasePdf]);

  // Render current PDF page to HTML5 Canvas using pdfjs-dist
  useEffect(() => {
    if (!isOpen || !basePdfBytes || !pdfCanvasRef.current) return;

    let isCancelled = false;
    setIsRenderingPage(true);

    const renderPage = async () => {
      try {
        const pdfDoc = await loadPdfDocument(basePdfBytes);
        const actualPageCount = pdfDoc.numPages;
        setTotalPages(actualPageCount);

        const safePageIndex = Math.max(0, Math.min(actualPageCount - 1, currentPageIndex));
        if (safePageIndex !== currentPageIndex) {
          setCurrentPageIndex(safePageIndex);
          return;
        }

        const renderRes = await renderPdfPageToCanvas(
          pdfDoc,
          safePageIndex + 1,
          pdfCanvasRef.current!,
          zoomScale
        );

        if (!isCancelled) {
          setPageCanvasDimensions({ width: renderRes.width, height: renderRes.height });

          // Extract text items with exact bounding coordinates, font family, style, and sampled color
          const extracted = await extractTextFromPage(pdfDoc, safePageIndex + 1, pdfCanvasRef.current);
          setExtractedTextItems(extracted);
        }
      } catch (err) {
        console.error('Failed to render PDF page on canvas:', err);
      } finally {
        if (!isCancelled) {
          setIsRenderingPage(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, basePdfBytes, currentPageIndex, zoomScale]);

  // Compile final PDF with all visual annotations, watermarks, stamps, text edits
  const compileFinalPdf = useCallback(async (): Promise<Uint8Array | null> => {
    if (!basePdfBytes) return null;
    return await applyPdfAnnotations(basePdfBytes, annotations, {
      watermarkText,
      watermarkColor,
      watermarkOpacity,
      watermarkRotation,
      watermarkFontSize,
      watermarkLayout,
    });
  }, [
    basePdfBytes,
    annotations,
    watermarkText,
    watermarkColor,
    watermarkOpacity,
    watermarkRotation,
    watermarkFontSize,
    watermarkLayout,
  ]);

  const handleClearWatermark = () => {
    setWatermarkText('');
    showToast(isZh ? '水印已清除' : 'Watermark cleared');
  };

  // Handle external PDF file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast(isZh ? '请选择有效的 .pdf 文件' : 'Please select a valid .pdf file');
      return;
    }

    try {
      setIsProcessing(true);
      const buffer = await readFileAsArrayBuffer(file);
      setUploadedPdfBytes(buffer);
      setUploadedFileName(file.name);
      setActiveSource('upload');
      setActiveTab('annotate');
      setActiveTool('text');
      const pCount = await getPdfPageCount(buffer);
      setTotalPages(pCount);
      setCurrentPageIndex(0);
      setRotations({});
      setAnnotations([]);
      setDeletePageIndices([]);
      showToast(isZh ? `已载入: ${file.name} (共 ${pCount} 页) — 点击任意文字即可直接修改！` : `Loaded: ${file.name} — Click any text on page to edit!`);
    } catch (err) {
      console.error('Failed to read PDF file', err);
      showToast(isZh ? '读取 PDF 文件失败' : 'Failed to read PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create clean blank A4 canvas
  const handleCreateBlankA4 = async () => {
    try {
      setIsProcessing(true);
      const blank = await createBlankA4PdfBytes();
      setUploadedPdfBytes(blank);
      setUploadedFileName('Blank_A4_Canvas.pdf');
      setActiveSource('blankA4');
      setActiveTab('annotate');
      setActiveTool('text');
      setTotalPages(1);
      setCurrentPageIndex(0);
      setRotations({});
      setAnnotations([]);
      setDeletePageIndices([]);
      showToast(isZh ? '已创建空白 A4 纸张画布 — 点击画面任意位置添加文字' : 'Created Blank A4 Canvas — Click anywhere to add text');
    } catch (err) {
      console.error('Failed to create blank PDF', err);
      showToast(isZh ? '创建空白文档失败' : 'Failed to create blank PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch back to current quotation/invoice
  const handleSelectCurrentQuote = () => {
    setActiveSource('currentQuote');
    setActiveTab('document');
    setUploadedFileName('');
    setRotations({});
    setDeletePageIndices([]);
    showToast(isZh ? '已切换至当前开单单据' : 'Switched to current quote document');
  };

  // Rotate current page 90 degrees
  const handleRotateCurrentPage = () => {
    setRotations(prev => {
      const cur = prev[currentPageIndex] || 0;
      const next = (cur + 90) % 360;
      return { ...prev, [currentPageIndex]: next };
    });
    showToast(isZh ? `第 ${currentPageIndex + 1} 页已旋转 90°` : `Rotated Page ${currentPageIndex + 1} by 90°`);
  };

  // Push snapshot to undo stack
  const pushUndoSnapshot = () => {
    setUndoStack(prev => [...prev.slice(-25), annotations]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      showToast(isZh ? '没有可撤销的动作' : 'Nothing to undo');
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setAnnotations(previous);
    setSelectedAnnotationId(null);
    setActiveEditingText(null);
    showToast(isZh ? '已撤销上一步操作' : 'Undone');
  };

  // Rotate counter-clockwise
  const handleRotateCounterClockwise = () => {
    setRotations(prev => {
      const cur = prev[currentPageIndex] || 0;
      const next = (cur + 270) % 360;
      return { ...prev, [currentPageIndex]: next };
    });
    showToast(isZh ? `第 ${currentPageIndex + 1} 页已逆时针旋转 90°` : `Rotated Page ${currentPageIndex + 1} CCW`);
  };

  // Move page up
  const handleMovePageUp = () => {
    if (currentPageIndex <= 0) return;
    const prevOrder = pageOrder.length === totalPages ? [...pageOrder] : Array.from({ length: totalPages }, (_, i) => i);
    const temp = prevOrder[currentPageIndex];
    prevOrder[currentPageIndex] = prevOrder[currentPageIndex - 1];
    prevOrder[currentPageIndex - 1] = temp;
    setPageOrder(prevOrder);
    setCurrentPageIndex(currentPageIndex - 1);
    showToast(isZh ? `已将第 ${currentPageIndex + 1} 页上移` : `Moved Page ${currentPageIndex + 1} up`);
  };

  // Move page down
  const handleMovePageDown = () => {
    if (currentPageIndex >= totalPages - 1) return;
    const prevOrder = pageOrder.length === totalPages ? [...pageOrder] : Array.from({ length: totalPages }, (_, i) => i);
    const temp = prevOrder[currentPageIndex];
    prevOrder[currentPageIndex] = prevOrder[currentPageIndex + 1];
    prevOrder[currentPageIndex + 1] = temp;
    setPageOrder(prevOrder);
    setCurrentPageIndex(currentPageIndex + 1);
    showToast(isZh ? `已将第 ${currentPageIndex + 1} 页下移` : `Moved Page ${currentPageIndex + 1} down`);
  };

  // Add blank page
  const handleAddBlankPage = () => {
    setTotalPages(prev => prev + 1);
    setCurrentPageIndex(totalPages);
    showToast(isZh ? '已追加空白页面' : 'Added blank page');
  };

  // Delete current page
  const handleDeleteCurrentPage = () => {
    if (totalPages <= 1) {
      showToast(isZh ? '无法删除仅剩的一页' : 'Cannot delete the only page');
      return;
    }
    setDeletePageIndices(prev => [...prev, currentPageIndex]);
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
    showToast(isZh ? `已删除第 ${currentPageIndex + 1} 页` : `Deleted Page ${currentPageIndex + 1}`);
  };

  // ==========================================
  // DIRECT IN-PLACE TEXT EDITING (PDFescape Style)
  // ==========================================

  // 1. Click on existing detected text on PDF (Auto Follows Font Family, Size, Weight, Italic, Color)
  const handleStartEditText = (item: ExtractedTextItem) => {
    if (activeEditingTextRef.current) {
      handleCommitEditing();
    }
    setActiveTool('text');
    setSelectedAnnotationId(null);
    const tightFontSize = item.fontSizePt || 11;
    // Ultra-tight single-line height based on A4 height (842pt) to never cover the sentence below
    const tightHeightPercent = Math.max(0.008, Math.min(0.018, (tightFontSize * 1.05) / 842));
    const newEdit = {
      id: item.id,
      text: item.text,
      fontSize: tightFontSize,
      textColor: item.textColor || '#000000',
      isBold: !!item.isBold,
      isItalic: !!item.isItalic,
      isUnderline: false,
      fontFamily: item.fontFamily,
      fontDisplayName: item.fontDisplayName,
      whiteoutBackground: true,
      xPercent: item.xPercent,
      yPercent: item.yPercent,
      widthPercent: Math.max(item.widthPercent, 0.02),
      heightPercent: tightHeightPercent,
    };
    activeEditingTextRef.current = newEdit;
    setActiveEditingText(newEdit);
  };

  // 2. Click on empty space to type new text
  const handleStartAddText = (x: number, y: number) => {
    if (activeEditingTextRef.current) {
      handleCommitEditing();
    }
    setActiveTool('text');
    setSelectedAnnotationId(null);
    const newEdit = {
      id: generateUniqueAnnotationId(),
      text: isZh ? '输入文字...' : 'Type text...',
      fontSize: 12,
      textColor: '#000000',
      isBold: false,
      isItalic: false,
      isUnderline: false,
      fontFamily: STANDARD_FONTS[0].value,
      fontDisplayName: STANDARD_FONTS[0].label,
      whiteoutBackground: false,
      xPercent: x,
      yPercent: y,
      widthPercent: 0.16,
      heightPercent: (12 * 1.05) / 842,
    };
    activeEditingTextRef.current = newEdit;
    setActiveEditingText(newEdit);
  };

  // Safe font / text property update handler that keeps height strictly bounded to text
  const handleUpdateActiveText = (updates: Partial<ActiveTextProps>) => {
    setActiveEditingText(prev => {
      if (!prev) return null;
      const targetFontSize = updates.fontSize || prev.fontSize || 11;
      // Strictly compute tight single-line height in proportion to font size
      // 842pt is standard A4 height. 12pt font is 12*1.05/842 = 0.0149 (1.49% of page height).
      const nextHeight = Math.max(0.008, Math.min(0.02, (targetFontSize * 1.05) / 842));

      const currentText = updates.text !== undefined ? updates.text : prev.text;
      const estWidthPercent = Math.max(
        0.02,
        Math.min(0.98, ((currentText.length + 1) * targetFontSize * 0.58) / 595)
      );
      const nextWidth = Math.max(prev.widthPercent, estWidthPercent);

      const nextObj = {
        ...prev,
        ...updates,
        heightPercent: nextHeight,
        widthPercent: nextWidth,
      };
      activeEditingTextRef.current = nextObj;
      return nextObj;
    });
  };

  // 3. Double click on existing annotation to edit it
  const handleStartEditAnnotation = (ann: PdfAnnotation) => {
    if (ann.type === 'text' || ann.type === 'whiteout') {
      setActiveTool('text');
      setSelectedAnnotationId(ann.id);
      const tightFontSize = ann.fontSize || 12;
      const tightHeightPercent = Math.max(0.008, Math.min(0.02, (tightFontSize * 1.05) / 842));
      const newEdit = {
        id: ann.id,
        annotationId: ann.id,
        text: ann.text || '',
        fontSize: tightFontSize,
        textColor: ann.textColor || '#000000',
        isBold: !!ann.isBold,
        isItalic: !!ann.isItalic,
        isUnderline: !!ann.isUnderline,
        fontFamily: ann.fontFamily || STANDARD_FONTS[0].value,
        fontDisplayName: ann.fontDisplayName,
        whiteoutBackground: ann.type === 'whiteout',
        xPercent: ann.xPercent,
        yPercent: ann.yPercent,
        widthPercent: ann.widthPercent || 0.2,
        heightPercent: tightHeightPercent,
      };
      activeEditingTextRef.current = newEdit;
      setActiveEditingText(newEdit);
    } else {
      setSelectedAnnotationId(ann.id);
      activeEditingTextRef.current = null;
      setActiveEditingText(null);
    }
  };

  // 4. Commit inline edit
  const handleCommitEditing = () => {
    const current = activeEditingTextRef.current || activeEditingText;
    if (!current) return;
    // Clear immediately to prevent any re-entrant or duplicate commit calls
    activeEditingTextRef.current = null;
    setActiveEditingText(null);

    const {
      text,
      fontSize,
      textColor,
      isBold,
      isItalic,
      isUnderline,
      fontFamily,
      fontDisplayName,
      whiteoutBackground,
      xPercent,
      yPercent,
      widthPercent,
      annotationId,
    } = current;

    // Do not create empty annotation if text is empty or untyped placeholder
    if (!annotationId && (!text || !text.trim() || text === (isZh ? '输入文字...' : 'Type text...'))) {
      return;
    }

    pushUndoSnapshot();
    const tightHeightPercent = Math.max(0.008, Math.min(0.02, ((fontSize || 11) * 1.05) / 842));

    if (annotationId) {
      // Update existing
      setAnnotations(prev =>
        prev.map(a =>
          a.id === annotationId
            ? {
                ...a,
                text,
                fontSize,
                textColor,
                isBold,
                isItalic,
                isUnderline,
                fontFamily,
                fontDisplayName,
                heightPercent: tightHeightPercent,
                widthPercent,
                type: whiteoutBackground ? 'whiteout' : 'text',
              }
            : a
        )
      );
    } else {
      // Create new annotation with guaranteed unique ID
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: currentPageIndex,
        type: whiteoutBackground ? 'whiteout' : 'text',
        xPercent,
        yPercent,
        widthPercent,
        heightPercent: tightHeightPercent,
        text,
        fontSize,
        textColor,
        isBold,
        isItalic,
        isUnderline,
        fontFamily,
        fontDisplayName,
        coveredTextId: current.id && current.id.startsWith('txt-') ? current.id : undefined,
      };
      appendAnnotationSafe(newAnn);
      setSelectedAnnotationId(newAnn.id);
    }
  };

  // 5. Delete selected annotation or cancel editing text
  const handleDeleteSelected = () => {
    activeEditingTextRef.current = null;
    if (activeEditingText) {
      setActiveEditingText(null);
      return;
    }
    if (selectedAnnotationId) {
      pushUndoSnapshot();
      setAnnotations(prev => prev.filter(a => a.id !== selectedAnnotationId));
      setSelectedAnnotationId(null);
      showToast(isZh ? '已删除选定元素' : 'Deleted selected element');
    }
  };

  // Image upload handler
  const handleImageFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      pushUndoSnapshot();
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: currentPageIndex,
        type: 'image',
        xPercent: 0.35,
        yPercent: 0.35,
        widthPercent: 0.25,
        heightPercent: 0.18,
        imageDataUrl: dataUrl,
      };
      appendAnnotationSafe(newAnn);
      setSelectedAnnotationId(newAnn.id);
      showToast(isZh ? '已插入图片，可拖拽调整位置与大小' : 'Image inserted! Drag to move or resize.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ==========================================
  // FIND & REPLACE METHODS
  // ==========================================
  const handleFindAndReplaceNext = () => {
    if (!findText.trim()) return;
    const search = findText.trim().toLowerCase();
    const match = extractedTextItems.find(it => it.text.toLowerCase().includes(search));
    if (!match) {
      showToast(isZh ? `本页未找到匹配: "${findText}"` : `No matches found for "${findText}"`);
      return;
    }

    const replaced = match.text.replace(new RegExp(findText, 'gi'), replaceText);
    const newAnn: PdfAnnotation = {
      id: generateUniqueAnnotationId(),
      pageIndex: currentPageIndex,
      type: 'whiteout',
      xPercent: match.xPercent,
      yPercent: match.yPercent,
      widthPercent: Math.max(match.widthPercent, 0.05),
      heightPercent: Math.max(match.heightPercent, 0.025),
      text: replaced,
      fontSize: match.fontSizePt || 11,
      textColor: '#000000',
    };
    appendAnnotationSafe(newAnn);
    showToast(isZh ? `已替换: "${match.text}" → "${replaced}"` : `Replaced "${match.text}" with "${replaced}"`);
  };

  const handleFindAndReplaceAll = () => {
    if (!findText.trim()) return;
    const search = findText.trim().toLowerCase();
    const matches = extractedTextItems.filter(it => it.text.toLowerCase().includes(search));
    if (matches.length === 0) {
      showToast(isZh ? `本页未找到匹配: "${findText}"` : `No matches found for "${findText}"`);
      return;
    }

    const newAnns: PdfAnnotation[] = matches.map(match => {
      const replaced = match.text.replace(new RegExp(findText, 'gi'), replaceText);
      return {
        id: generateUniqueAnnotationId(),
        pageIndex: currentPageIndex,
        type: 'whiteout',
        xPercent: match.xPercent,
        yPercent: match.yPercent,
        widthPercent: Math.max(match.widthPercent, 0.05),
        heightPercent: Math.max(match.heightPercent, 0.025),
        text: replaced,
        fontSize: match.fontSizePt || 11,
        textColor: '#000000',
      };
    });

    setAnnotations(prev => [...prev, ...newAnns]);
    showToast(isZh ? `已全部替换本页 ${matches.length} 处匹配文字！` : `Replaced all ${matches.length} matches!`);
  };

  // Precision Nudge Controls
  const nudge = (dx: number, dy: number) => {
    setClickX(prev => Math.max(0.01, Math.min(0.99, Number((prev + dx).toFixed(3)))));
    setClickY(prev => Math.max(0.01, Math.min(0.99, Number((prev + dy).toFixed(3)))));
  };

  // Line items state methods
  const handleAddItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      title: 'CUSTOM SIGNAGE & INSTALLATION',
      originalWidth: 0,
      originalHeight: 0,
      widthInches: 0,
      heightInches: 0,
      unit: 'in',
      totalPrice: 150,
      quantity: 1,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // --- Signature Pad & Studio Methods ---
  const startDrawingOnCanvas = (
    canvas: HTMLCanvasElement | null,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawOnCanvas = (
    canvas: HTMLCanvasElement | null,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    color: string = '#0f172a'
  ) => {
    if (!isDrawing || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSidebarSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!modalSignatureCanvasRef.current) {
      setHasSignature(false);
      setCurrentSignatureDataUrl(null);
    }
  };

  const clearModalSignature = () => {
    const canvas = modalSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setCurrentSignatureDataUrl(null);
  };

  // Tool selection handler - automatically opens Signature Studio when signature tool is picked
  const handleSelectTool = (tool: string) => {
    setActiveTool(tool);
    if (tool === 'signature') {
      setActiveTab('annotate');
      setSignatureModalOpen(true);
    }
  };

  // Place signature directly at clicked coordinates on the PDF canvas
  const handlePlaceSignatureAt = useCallback(
    (x: number, y: number) => {
      let dataUrl = currentSignatureDataUrl;
      if (!dataUrl) {
        const canvas = modalSignatureCanvasRef.current || signatureCanvasRef.current;
        if (canvas && hasSignature) {
          dataUrl = canvas.toDataURL('image/png');
          setCurrentSignatureDataUrl(dataUrl);
        }
      }

      if (!dataUrl) {
        setPendingPlacementCoords({ x, y });
        setSignatureModalOpen(true);
        showToast(isZh ? '请先在签名设计器中完成手写或输入' : 'Please draw or type your signature first');
        return;
      }

      pushUndoSnapshot();
      const targetPage = currentPageIndex;
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'signature',
        xPercent: Math.max(0, Math.min(0.78, x - 0.1)),
        yPercent: Math.max(0, Math.min(0.9, y - 0.04)),
        widthPercent: 0.22,
        heightPercent: 0.08,
        imageDataUrl: dataUrl,
      };

      appendAnnotationSafe(newAnn);
      setSelectedAnnotationId(newAnn.id);
      showToast(isZh ? `已将电子签名放入第 ${targetPage + 1} 页，可拖拽调整位置与大小` : `Signature placed on Page ${targetPage + 1}`);
    },
    [currentSignatureDataUrl, hasSignature, currentPageIndex, pushUndoSnapshot, isZh]
  );

  // Confirm and insert signature from the Signature Studio dialog
  const handleConfirmSignaturePlacement = () => {
    let dataUrl: string | null = null;

    if (signatureMode === 'draw') {
      const canvas = modalSignatureCanvasRef.current || signatureCanvasRef.current;
      if (!canvas || !hasSignature) {
        showToast(isZh ? '请先在画板中绘制签名' : 'Please draw your signature first');
        return;
      }
      dataUrl = canvas.toDataURL('image/png');
    } else if (signatureMode === 'type') {
      const name = typedSignatureName.trim() || customerName || 'Authorized Signature';
      const sigObj = generateSignatureDataUrl(name, signaturePenColor, typedSignatureStyle);
      dataUrl = sigObj.dataUrl;
    } else if (signatureMode === 'upload') {
      dataUrl = currentSignatureDataUrl;
      if (!dataUrl) {
        showToast(isZh ? '请先上传签名图片' : 'Please upload a signature image');
        return;
      }
    }

    if (!dataUrl) return;

    setCurrentSignatureDataUrl(dataUrl);
    setHasSignature(true);
    setSignatureModalOpen(false);

    pushUndoSnapshot();
    const targetPage = currentPageIndex;
    const targetX = pendingPlacementCoords ? pendingPlacementCoords.x : 0.65;
    const targetY = pendingPlacementCoords ? pendingPlacementCoords.y : 0.82;
    setPendingPlacementCoords(null);

    const newAnn: PdfAnnotation = {
      id: generateUniqueAnnotationId(),
      pageIndex: targetPage,
      type: 'signature',
      xPercent: Math.max(0, Math.min(0.78, targetX - 0.1)),
      yPercent: Math.max(0, Math.min(0.9, targetY - 0.04)),
      widthPercent: 0.22,
      heightPercent: 0.08,
      imageDataUrl: dataUrl,
    };

    appendAnnotationSafe(newAnn);
    setSelectedAnnotationId(newAnn.id);
    setActiveTool('select');
    showToast(isZh ? `已将电子签名放入第 ${targetPage + 1} 页，可拖拽调整` : `Signature placed on Page ${targetPage + 1}`);
  };

  // Place signature from sidebar signature pad
  const handlePlaceSignatureFromSidebar = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !hasSignature) {
      setSignatureModalOpen(true);
      showToast(isZh ? '请在签名板手写或点击打开设计器生成' : 'Please draw signature or open studio');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setCurrentSignatureDataUrl(dataUrl);

    pushUndoSnapshot();
    const targetPage = currentPageIndex;
    const newAnn: PdfAnnotation = {
      id: generateUniqueAnnotationId(),
      pageIndex: targetPage,
      type: 'signature',
      xPercent: 0.65,
      yPercent: 0.82,
      widthPercent: 0.22,
      heightPercent: 0.08,
      imageDataUrl: dataUrl,
    };
    appendAnnotationSafe(newAnn);
    setSelectedAnnotationId(newAnn.id);
    showToast(isZh ? `已将电子签名放入第 ${targetPage + 1} 页` : `Signature placed on Page ${targetPage + 1}`);
  };

  // Upload external signature image
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const url = evt.target?.result as string;
      if (url) {
        setCurrentSignatureDataUrl(url);
        setHasSignature(true);
        showToast(isZh ? '已成功载入签名图片' : 'Signature image loaded');
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Annotation Action from Sidebar
  const handleAddAnnotation = () => {
    const targetPage = currentPageIndex;
    if (activeTool === 'stamp') {
      const isCustom = selectedStampId === 'CUSTOM';
      const preset = STAMP_PRESETS.find(p => p.id === selectedStampId) || STAMP_PRESETS[0];
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'stamp',
        xPercent: clickX,
        yPercent: clickY,
        stampType: isCustom ? 'CUSTOM' : (preset.id as any),
        stampText: isCustom ? customStampText : preset.text,
        stampColor: isCustom ? customStampColor : preset.color,
        fontSize: 15,
      };
      appendAnnotationSafe(newAnn);
      showToast(
        isZh
          ? `已盖印至第 ${targetPage + 1} 页: ${isCustom ? customStampText : preset.label}`
          : `Stamp applied to Page ${targetPage + 1}`
      );
    } else if (activeTool === 'text') {
      if (!annotationText.trim()) return;
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'text',
        xPercent: clickX,
        yPercent: clickY,
        text: annotationText,
        fontSize: annotationFontSize,
        textColor: annotationColor,
        isBold: annotationBold,
        backgroundColor: annotationBgColor,
      };
      appendAnnotationSafe(newAnn);
      showToast(isZh ? `已添加文字至第 ${targetPage + 1} 页` : `Added Text to Page ${targetPage + 1}`);
    } else if (activeTool === 'whiteout') {
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'whiteout',
        xPercent: clickX,
        yPercent: clickY,
        widthPercent: whiteoutWidthPercent,
        heightPercent: whiteoutHeightPercent,
        text: whiteoutReplacementText,
        fontSize: 11,
        textColor: '#000000',
      };
      appendAnnotationSafe(newAnn);
      showToast(isZh ? `已添加涂白修正区至第 ${targetPage + 1} 页` : `Added Whiteout Patch to Page ${targetPage + 1}`);
    } else if (activeTool === 'signature') {
      const canvas = signatureCanvasRef.current;
      if (!canvas || !hasSignature) {
        showToast(isZh ? '请先在签名板中签名' : 'Please draw your signature first');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'signature',
        xPercent: clickX,
        yPercent: clickY,
        widthPercent: 0.22,
        heightPercent: 0.08,
        imageDataUrl: dataUrl,
      };
      appendAnnotationSafe(newAnn);
      showToast(isZh ? `已将电子签名放入第 ${targetPage + 1} 页` : `Signature placed on Page ${targetPage + 1}`);
    } else if (activeTool === 'highlight') {
      const newAnn: PdfAnnotation = {
        id: generateUniqueAnnotationId(),
        pageIndex: targetPage,
        type: 'highlight',
        xPercent: clickX,
        yPercent: clickY,
        widthPercent: 0.25,
        heightPercent: 0.035,
        backgroundColor: highlightColor,
      };
      appendAnnotationSafe(newAnn);
      showToast(isZh ? `已添加高亮标记至第 ${targetPage + 1} 页` : `Highlight added to Page ${targetPage + 1}`);
    }
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Download Action
  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      const finalBytes = await compileFinalPdf();
      if (!finalBytes) {
        showToast(isZh ? '正在载入文档，请稍候...' : 'Please wait, document loading...');
        return;
      }
      const baseName = uploadedFileName
        ? uploadedFileName.replace(/\.pdf$/i, '') + '_edited.pdf'
        : `${docType === 'invoice' ? 'Invoice' : docType === 'receipt' ? 'Receipt' : 'Quotation'}_${docNo || 'Document'}.pdf`;
      downloadPdfBytes(finalBytes, baseName);
      showToast(isZh ? '已成功导出修改后的 PDF 文件！' : 'Downloaded edited PDF successfully!');
    } catch (err) {
      console.error('Download error:', err);
      showToast(isZh ? '导出 PDF 失败，请重试' : 'Failed to export PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print Action
  const handlePrint = async () => {
    try {
      setIsProcessing(true);
      const finalBytes = await compileFinalPdf();
      if (!finalBytes) return;
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      } else {
        showToast(isZh ? '请允许弹出窗口以打印文档' : 'Please allow popups to print');
      }
    } catch (err) {
      console.error('Print error:', err);
      showToast(isZh ? '打印出错' : 'Print failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp Action
  const handleWhatsApp = () => {
    const filename = `${docType === 'invoice' ? 'Tax_Invoice' : docType === 'receipt' ? 'Receipt' : 'Quotation'}_${docNo}.pdf`;
    const message = [
      `*HALO DESIGN HUB — 官方单据修改确认*`,
      `单号: ${docNo}`,
      `客户: ${customerName || '贵司 / 客户'}`,
      `合计总额: SGD $${finalTotal.toFixed(2)}`,
      `未结清余款: SGD $${balanceDue.toFixed(2)}`,
      `📎 随信附上已更新的官方单据: ${filename}`,
      `如有任何修改需求请随时告知。感谢支持！`,
      `*PayNow UEN:* 53142015M (Halo Design Hub)`,
    ].join('\n');

    openWhatsApp({
      phone: customerPhone || contact || '',
      text: message,
    });
  };

  // Save to Quote Sheet in app
  const handleSaveToSheet = () => {
    if (onSaveToQuoteSheet) {
      onSaveToQuoteSheet(items, {
        docNo,
        dateFormatted: dateStr,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        contact,
        deposit: depositNum,
        paymentMethod,
        paymentTerms,
        showSizes,
        docType,
      });
      showToast(isZh ? '已将修改同步至当前开单列表！' : 'Saved to Quotation Sheet!');
    }
  };

  if (!isOpen) return null;

  // Active annotations for current page
  const currentPageAnnotations = annotations.filter(a => a.pageIndex === currentPageIndex);

  // Drag selection box calculations
  const dragBox =
    isDragging && dragStart && dragCurrent
      ? {
          left: Math.min(dragStart.x, dragCurrent.x) * 100,
          top: Math.min(dragStart.y, dragCurrent.y) * 100,
          width: Math.abs(dragCurrent.x - dragStart.x) * 100,
          height: Math.abs(dragCurrent.y - dragStart.y) * 100,
        }
      : null;

  // Filtered text items in inspector
  const filteredTextItems = extractedTextItems.filter(
    it => !textSearchFilter || it.text.toLowerCase().includes(textSearchFilter.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-7xl h-[95vh] max-h-[95vh] bg-white dark:bg-[#070b1a] border border-slate-200 dark:border-indigo-500/25 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto relative"
        >
          {/* Neon Accent Top Border */}
          <div className="h-[2.5px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90 shrink-0"></div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-cyan-300 border border-cyan-500/50 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-xs pointer-events-none"
              >
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{toastMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* macOS Titlebar */}
          <div className="h-10 px-3 sm:px-4 bg-slate-100/95 dark:bg-[#0c122c] border-b border-slate-200 dark:border-indigo-500/20 flex items-center justify-between select-none shrink-0 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/15 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center text-[8px] text-black/70 font-bold cursor-pointer"
                title="Close"
              >
                ×
              </button>
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/15 opacity-60"></span>
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/15 opacity-60"></span>
            </div>

            <div className="flex items-center gap-2 min-w-0 truncate">
              <div className="p-1 rounded-md bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-xs">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-cyan-300 font-mono truncate">
                Halo PDF Editor — {uploadedFileName || (activeSource === 'blankA4' ? 'Blank A4 Canvas' : `${docNo} (${docType.toUpperCase()})`)}
              </span>
            </div>

            {/* Quick Export Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Download Edited PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isZh ? '导出 PDF' : 'Export PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader Toolbar & Tool Switcher */}
          <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-[#070b1a] border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            {/* Primary Tool Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-0.5 rounded-lg bg-slate-200/80 dark:bg-[#0c122c] border border-slate-300 dark:border-indigo-500/20 font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('text');
                  setActiveTab('annotate');
                  showToast(isZh ? '已切换至文字编辑模式: 点击 PDF 上任何文字直接修改！' : 'Direct Text Edit: Click any text on PDF to edit!');
                }}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Click any text on PDF to edit or click blank space to add text"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-300" />
                <span>{isZh ? '✏️ 直接编辑文字' : 'Edit Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('whiteout');
                  setActiveTab('annotate');
                  showToast(isZh ? '已切换至涂白修正: 在 PDF 上拖拽拉出遮盖区域' : 'Whiteout: Drag on PDF to cover any area');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'whiteout'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Drag on PDF to whiteout and replace text"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>{isZh ? '涂白修正' : 'Whiteout'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('stamp');
                  setActiveTab('annotate');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'stamp'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Stamps (HALO Chop, PAID, APPROVED, etc.)"
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>{isZh ? '印章' : 'Stamp'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTool('signature')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'signature'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title={isZh ? '电子签名 (手写/书法/上传)' : 'Sign document (Draw, type or upload)'}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isZh ? '签名' : 'Sign'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('highlight');
                  setActiveTab('annotate');
                }}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'highlight'
                    ? 'bg-yellow-500 text-black shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Highlighter"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>{isZh ? '荧光' : 'Highlight'}</span>
              </button>
            </div>

            {/* Quick Actions & Search/Replace Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 text-[11px] transition-all cursor-pointer disabled:opacity-30 bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-300 border-transparent hover:bg-slate-300 dark:hover:bg-white/15"
                title="Undo last change (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{isZh ? '撤销' : 'Undo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 text-[11px] transition-all cursor-pointer ${
                  showFindReplace
                    ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/40'
                    : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-300 border-transparent hover:bg-slate-300 dark:hover:bg-white/15'
                }`}
                title="Search and Replace text across the document"
              >
                <Search className="w-3 h-3 text-cyan-400" />
                <span>{isZh ? '查找与替换' : 'Find & Replace'}</span>
              </button>

              {/* Watermark Quick Access Button */}
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'watermark' ? 'annotate' : 'watermark')}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 text-[11px] transition-all cursor-pointer ${
                  activeTab === 'watermark'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-xs'
                    : watermarkText
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/40'
                    : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-300 border-transparent hover:bg-slate-300 dark:hover:bg-white/15'
                }`}
                title={isZh ? '添加或设置文档水印（实时预览与嵌入导出）' : 'Document watermark settings & live preview'}
              >
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>{isZh ? '水印' : 'Watermark'}</span>
                {watermarkText && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5"
                    title={isZh ? `已启用: ${watermarkText}` : `Active: ${watermarkText}`}
                  />
                )}
              </button>

              <label
                className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                title="Upload ANY external PDF file to edit"
              >
                <Upload className="w-3 h-3" />
                <span>{isZh ? '上传 PDF' : 'Upload PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {activeSource !== 'currentQuote' ? (
                <button
                  type="button"
                  onClick={handleSelectCurrentQuote}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-cyan-400 border border-blue-500/25 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  title="Return to current Quote / Invoice"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isZh ? '切回开单报价' : 'Quote Sheet'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'document' ? 'annotate' : 'document')}
                  className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 text-[11px] transition-all cursor-pointer ${
                    activeTab === 'document'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-300 border-transparent'
                  }`}
                  title="Edit quotation fields like customer, line items, totals"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isZh ? '单据表单' : 'Quote Form'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Find & Replace Bar */}
          <AnimatePresence>
            {showFindReplace && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-cyan-500/30 bg-cyan-950/40 px-3 sm:px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/30 rounded-lg px-2 py-1 text-slate-200">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    <input
                      type="text"
                      value={findText}
                      onChange={e => setFindText(e.target.value)}
                      placeholder={isZh ? '查找文字 (例如: $480 或 客户名)...' : 'Find text in page...'}
                      className="bg-transparent text-xs outline-none text-white w-40 sm:w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900 border border-indigo-500/30 rounded-lg px-2 py-1 text-slate-200">
                    <Replace className="w-3.5 h-3.5 text-indigo-400" />
                    <input
                      type="text"
                      value={replaceText}
                      onChange={e => setReplaceText(e.target.value)}
                      placeholder={isZh ? '替换为新文字...' : 'Replace with...'}
                      className="bg-transparent text-xs outline-none text-white w-40 sm:w-56"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleFindAndReplaceNext}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <span>{isZh ? '替换下一个' : 'Replace Next'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFindAndReplaceAll}
                    className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <span>{isZh ? '全部替换' : 'Replace All'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-cyan-300 font-mono">
                    {findText.trim()
                      ? `${
                          extractedTextItems.filter(it =>
                            it.text.toLowerCase().includes(findText.trim().toLowerCase())
                          ).length
                        } ${isZh ? '处匹配' : 'matches'}`
                      : `${extractedTextItems.length} ${isZh ? '项文字检测' : 'text items'}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFindReplace(false)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Workspace: Split View */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Left Column: Side Tools, Detected Text List & Layers */}
            <div className="w-full md:w-5/12 lg:w-4/12 border-r border-slate-200 dark:border-white/10 flex flex-col overflow-y-auto mac-scrollbar p-2 sm:p-3 space-y-3 bg-white dark:bg-[#070b1a]">
              {/* Hidden image input for Image tool */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFilePicked}
                className="hidden"
              />

              {/* PDFescape Main Tools Panel (Insert / Annotate / Page / Document / Upload) */}
              <PdfescapeToolPanel
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                activeTool={activeTool}
                onSelectTool={handleSelectTool}
                isZh={isZh}
                activeSource={activeSource}
                onTriggerImageUpload={() => imageInputRef.current?.click()}
                currentPageIndex={currentPageIndex}
                totalPages={totalPages}
                onRotateClockwise={handleRotateCurrentPage}
                onRotateCounterClockwise={handleRotateCounterClockwise}
                onDeleteCurrentPage={handleDeleteCurrentPage}
                onAddBlankPage={handleAddBlankPage}
                onMovePageUp={handleMovePageUp}
                onMovePageDown={handleMovePageDown}
                onUploadPdf={handleFileUpload}
                onCreateBlankA4={handleCreateBlankA4}
                onSelectCurrentQuote={handleSelectCurrentQuote}
                watermarkText={watermarkText}
                onChangeWatermarkText={setWatermarkText}
                watermarkColor={watermarkColor}
                onChangeWatermarkColor={setWatermarkColor}
                watermarkOpacity={watermarkOpacity}
                onChangeWatermarkOpacity={setWatermarkOpacity}
                watermarkRotation={watermarkRotation}
                onChangeWatermarkRotation={setWatermarkRotation}
                watermarkFontSize={watermarkFontSize}
                onChangeWatermarkFontSize={setWatermarkFontSize}
                watermarkLayout={watermarkLayout}
                onChangeWatermarkLayout={setWatermarkLayout}
                onClearWatermark={handleClearWatermark}
              />

              {/* TAB: STRUCTURED QUOTE FORM (when activeTab === 'document') */}
              {activeTab === 'document' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2.5">
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-neutral-400 tracking-wider block">
                      {isZh ? '单据类型与编号' : 'Document Type & Number'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['quote', 'invoice', 'receipt'] as DocumentType[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDocType(t)}
                          className={`py-1 text-[10px] sm:text-xs font-bold rounded-lg uppercase transition-all cursor-pointer ${
                            docType === t
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                          }`}
                        >
                          {t === 'quote'
                            ? isZh
                              ? '报价单'
                              : 'Quote'
                            : t === 'invoice'
                            ? isZh
                              ? '发票'
                              : 'Invoice'
                            : isZh
                            ? '收据'
                            : 'Receipt'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '单号' : 'Doc No'}:
                        </label>
                        <input
                          type="text"
                          value={docNo}
                          onChange={e => setDocNo(e.target.value)}
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] font-mono text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '开单日期' : 'Date'}:
                        </label>
                        <input
                          type="date"
                          value={dateStr}
                          onChange={e => setDateStr(e.target.value)}
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2 text-xs">
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-neutral-400 tracking-wider block">
                      {isZh ? '客户资料' : 'Client Details'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '客户名称' : 'Customer Name'}:
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="Company / Client"
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '联络人' : 'Contact Person'}:
                        </label>
                        <input
                          type="text"
                          value={contact}
                          onChange={e => setContact(e.target.value)}
                          placeholder="Attn: Mr / Ms"
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '电话' : 'Phone'}:
                        </label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="+65 9123 4567"
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">
                          {isZh ? '电子邮箱' : 'Email'}:
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items List */}
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-500 dark:text-neutral-400 tracking-wider">
                        {isZh ? '项目明细' : 'Line Items'} ({items.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isZh ? '添加项目' : 'Add Item'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto mac-scrollbar pr-1">
                      {items.map((it, idx) => (
                        <div
                          key={it.id}
                          className="p-2 rounded-lg bg-white dark:bg-[#050817] border border-slate-200 dark:border-white/10 space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-[10px] text-slate-400">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={it.title}
                              onChange={e => handleUpdateItem(it.id, { title: e.target.value })}
                              className="flex-1 font-bold text-xs bg-transparent border-b border-dashed border-slate-300 dark:border-white/20 outline-none px-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">{isZh ? '数量' : 'Qty'}:</span>
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={e =>
                                  handleUpdateItem(it.id, {
                                    quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })
                                }
                                className="w-12 p-0.5 rounded border border-slate-200 dark:border-white/15 bg-transparent font-mono text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">{isZh ? '金额' : 'Price'}: $</span>
                              <input
                                type="number"
                                step="any"
                                value={it.totalPrice}
                                onChange={e =>
                                  handleUpdateItem(it.id, {
                                    totalPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-20 p-0.5 rounded border border-slate-200 dark:border-white/15 bg-transparent font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DETECTED TEXT INSPECTOR & 1-CLICK EDIT (Always available!) */}
              <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black uppercase text-slate-800 dark:text-neutral-200">
                      {isZh ? '页面文字清单' : 'Page Text Items'} ({extractedTextItems.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-500 font-bold">
                    {isZh ? '可直接点击修改' : 'Click to Edit'}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={textSearchFilter}
                    onChange={e => setTextSearchFilter(e.target.value)}
                    placeholder={isZh ? '按关键词快速过滤文字...' : 'Filter text lines...'}
                    className="w-full pl-6 pr-2 py-1 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-[11px] outline-none"
                  />
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto mac-scrollbar pr-1">
                  {filteredTextItems.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-slate-400">
                      {isZh ? '未检索到文字或正在解析中...' : 'No text matching filter...'}
                    </div>
                  ) : (
                    filteredTextItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onMouseEnter={() => setHoveredTextId(item.id)}
                        onMouseLeave={() => setHoveredTextId(null)}
                        className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 text-xs transition-all ${
                          hoveredTextId === item.id
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#050817]'
                        }`}
                      >
                        <span className="font-mono text-slate-800 dark:text-neutral-200 truncate flex-1 text-[11px]" title={item.text}>
                          {item.text}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditText(item)}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                            title="Edit this text"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>{isZh ? '编辑' : 'Edit'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TOOL: STAMPS & PRESETS */}
              {activeTool === 'stamp' && (
                <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-neutral-200 block">
                    {isZh ? '印章样式预设' : 'Stamp Presets'}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STAMP_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedStampId(preset.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedStampId === preset.id
                            ? 'border-cyan-500 bg-white dark:bg-[#050817] shadow-xs'
                            : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border"
                          style={{
                            color: preset.color,
                            borderColor: preset.borderColor,
                            backgroundColor: preset.bgColor,
                          }}
                        >
                          {preset.text}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Stamp */}
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">
                      {isZh ? '自定义印章文字' : 'Custom Stamp Text'}:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customStampText}
                        onChange={e => {
                          setCustomStampText(e.target.value);
                          setSelectedStampId('CUSTOM');
                        }}
                        className="flex-1 p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-xs outline-none"
                        placeholder="e.g. PAYMENT RECEIVED"
                      />
                      <input
                        type="color"
                        value={customStampColor}
                        onChange={e => setCustomStampColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TOOL: SIGNATURE PAD */}
              {activeTool === 'signature' && (
                <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-neutral-200">
                        {isZh ? '电子签名板' : 'Digital Signature Pad'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearSidebarSignature}
                        className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        {isZh ? '清除重签' : 'Clear'}
                      </button>
                    </div>
                  </div>

                  {/* Pen Color Palette */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isZh ? '画笔颜色:' : 'Pen Color:'}</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#0f172a', label: isZh ? '黑墨' : 'Black' },
                        { color: '#1d4ed8', label: isZh ? '蓝墨' : 'Blue' },
                        { color: '#b91c1c', label: isZh ? '红墨' : 'Red' },
                      ].map(c => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setSignaturePenColor(c.color)}
                          className={`w-4 h-4 rounded-full border cursor-pointer transition-all ${
                            signaturePenColor === c.color ? 'ring-2 ring-emerald-400 scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-300 dark:border-white/20 rounded-xl overflow-hidden bg-white shadow-inner cursor-crosshair">
                    <canvas
                      ref={signatureCanvasRef}
                      width={320}
                      height={120}
                      onMouseDown={e => startDrawingOnCanvas(signatureCanvasRef.current, e)}
                      onMouseMove={e => drawOnCanvas(signatureCanvasRef.current, e, signaturePenColor)}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={e => startDrawingOnCanvas(signatureCanvasRef.current, e)}
                      onTouchMove={e => drawOnCanvas(signatureCanvasRef.current, e, signaturePenColor)}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 block touch-none"
                    />
                  </div>

                  {/* Placement & Studio Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handlePlaceSignatureFromSidebar}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isZh ? '放置签名到当前页面' : 'Place Signature on Page'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignatureModalOpen(true)}
                      className="w-full py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>{isZh ? '打开签名设计器 (书法生成/上传图片)' : 'Signature Studio (Type/Upload)'}</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 block text-center leading-tight">
                    💡 {isZh ? '签名后可直接点击上方绿色按钮，或在右侧 PDF 画面任意位置点击放置' : 'Draw above and place on page, or click anywhere on PDF.'}
                  </span>
                </div>
              )}

              {/* ACTIVE ANNOTATION LAYERS MANAGER */}
              {annotations.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-neutral-200">
                      {isZh ? '已修改图层' : 'Active Edited Layers'} ({annotations.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnnotations([])}
                      className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                    >
                      {isZh ? '全部清除' : 'Clear All'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto mac-scrollbar pr-1">
                    {annotations.map((ann, idx) => (
                      <div
                        key={ann.id ? `${ann.id}-${idx}` : `ann-item-${idx}`}
                        className="p-1.5 rounded-lg bg-white dark:bg-[#050817] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs hover:border-cyan-500 transition-all"
                      >
                        <span className="font-bold text-slate-400 text-[10px]">
                          P{ann.pageIndex + 1}
                        </span>
                        <span className="font-semibold truncate flex-1 text-slate-800 dark:text-neutral-200 text-[11px]">
                          {ann.type === 'stamp'
                            ? `[印章] ${ann.stampText}`
                            : ann.type === 'whiteout'
                            ? `[修改] ${ann.text || '(空白遮盖)'}`
                            : ann.type === 'signature'
                            ? `[签名]`
                            : ann.type === 'highlight'
                            ? `[高亮]`
                            : `[文字] ${ann.text}`}
                        </span>
                        <div className="flex items-center gap-1">
                          {(ann.type === 'text' || ann.type === 'whiteout') && (
                            <button
                              type="button"
                              onClick={() => handleStartEditAnnotation(ann)}
                              className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                              title="Edit text"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAnnotation(ann.id)}
                            className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Delete layer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: High-Fidelity Canvas-Rendered PDF Viewer */}
            <div className="flex-1 bg-slate-900 flex flex-col relative overflow-hidden">
              {/* PDF Toolbar */}
              <div className="px-3 py-1.5 bg-slate-950/95 border-b border-white/10 flex items-center justify-between text-xs text-neutral-300 shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isProcessing || isRenderingPage ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-mono font-bold text-slate-200 text-xs">
                    {isProcessing
                      ? isZh
                        ? '正在生成 PDF...'
                        : 'Compiling PDF...'
                      : isRenderingPage
                      ? isZh
                        ? '渲染高清画质...'
                        : 'Rendering Page...'
                      : isZh
                      ? '实时高清预览'
                      : 'Live Document View'}
                  </span>
                </div>

                {/* Page Navigation & Zoom Controls */}
                <div className="flex items-center gap-2">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-xs font-mono">
                      <button
                        type="button"
                        disabled={currentPageIndex <= 0}
                        onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                        className="hover:text-cyan-300 disabled:opacity-30 p-0.5 cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span>
                        {currentPageIndex + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPageIndex >= totalPages - 1}
                        onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                        className="hover:text-cyan-300 disabled:opacity-30 p-0.5 cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.max(0.7, prev - 0.2))}
                      className="p-1 hover:text-cyan-300 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold min-w-8 text-center">
                      {(zoomScale * 100).toFixed(0)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.min(2.2, prev + 0.2))}
                      className="p-1 hover:text-cyan-300 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRotateCurrentPage}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 text-neutral-200 cursor-pointer active:scale-95"
                    title="Rotate page 90°"
                  >
                    <RotateCw className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">{isZh ? '旋转' : 'Rotate'}</span>
                  </button>
                </div>
              </div>

              {/* PDFescape Sticky Contextual Property Bar */}
              <PdfescapePropertyBar
                activeTool={activeTool}
                selectedAnnotation={annotations.find(a => a.id === selectedAnnotationId) || null}
                activeEditingText={activeEditingText}
                isZh={isZh}
                onUpdateActiveText={handleUpdateActiveText}
                onUpdateSelectedAnnotation={updates => {
                  if (selectedAnnotationId) {
                    pushUndoSnapshot();
                    setAnnotations(prev =>
                      prev.map(a => (a.id === selectedAnnotationId ? { ...a, ...updates } : a))
                    );
                  }
                }}
                onDeleteSelected={handleDeleteSelected}
                onCommitEditing={handleCommitEditing}
                freehandColor={freehandColor}
                onChangeFreehandColor={setFreehandColor}
                freehandWidth={freehandWidth}
                onChangeFreehandWidth={setFreehandWidth}
                checkmarkColor={checkmarkColor}
                onChangeCheckmarkColor={setCheckmarkColor}
                checkmarkSize={checkmarkSize}
                onChangeCheckmarkSize={setCheckmarkSize}
                selectedStampId={selectedStampId}
                onChangeStampId={setSelectedStampId}
                customStampText={customStampText}
                onChangeCustomStampText={setCustomStampText}
                customStampColor={customStampColor}
                onChangeCustomStampColor={setCustomStampColor}
                highlightColor={highlightColor}
                onChangeHighlightColor={setHighlightColor}
                shapeStrokeColor={shapeStrokeColor}
                onChangeShapeStrokeColor={setShapeStrokeColor}
                shapeStrokeWidth={shapeStrokeWidth}
                onChangeShapeStrokeWidth={setShapeStrokeWidth}
                shapeFillColor={shapeFillColor}
                onChangeShapeFillColor={setShapeFillColor}
              />

              {/* Main Canvas Scroll Viewport */}
              <div
                ref={containerRef}
                className="flex-1 w-full h-full relative p-4 bg-slate-950/90 overflow-auto mac-scrollbar flex items-start justify-center"
              >
                {/* PDF Page Wrapper */}
                <div
                  className="relative rounded-lg shadow-2xl overflow-hidden bg-white select-none shrink-0"
                  style={{
                    width: pageCanvasDimensions.width || 'auto',
                    height: pageCanvasDimensions.height || 'auto',
                  }}
                >
                  {/* HTML5 Canvas rendering PDF with pdfjs-dist */}
                  <canvas ref={pdfCanvasRef} className="block w-full h-full" />

                  {/* PDFescape Interactive Overlay (Direct On-Canvas Editing) */}
                  <PdfescapeCanvasOverlay
                    canvasWidth={pageCanvasDimensions.width}
                    canvasHeight={pageCanvasDimensions.height}
                    zoomScale={zoomScale}
                    isZh={isZh}
                    activeTool={activeTool}
                    extractedTextItems={extractedTextItems}
                    annotations={currentPageAnnotations}
                    selectedAnnotationId={selectedAnnotationId}
                    activeEditingText={activeEditingText}
                    onSelectAnnotation={setSelectedAnnotationId}
                    onPlaceSignatureAt={handlePlaceSignatureAt}
                    onStartEditTextItem={handleStartEditText}
                    onStartEditAnnotation={handleStartEditAnnotation}
                    onStartAddTextAt={handleStartAddText}
                    onUpdateActiveText={handleUpdateActiveText}
                    onCommitEditing={handleCommitEditing}
                    onDeleteSelected={handleDeleteSelected}
                    onAddAnnotation={newAnn => {
                      pushUndoSnapshot();
                      appendAnnotationSafe({ ...newAnn, pageIndex: currentPageIndex });
                    }}
                    onUpdateAnnotation={(id, updates) => {
                      setAnnotations(prev =>
                        prev.map(a => (a.id === id ? { ...a, ...updates } : a))
                      );
                    }}
                    freehandColor={freehandColor}
                    freehandWidth={freehandWidth}
                    highlightColor={highlightColor}
                    checkmarkColor={checkmarkColor}
                    checkmarkSize={checkmarkSize}
                    shapeStrokeColor={shapeStrokeColor}
                    shapeStrokeWidth={shapeStrokeWidth}
                    shapeFillColor={shapeFillColor}
                    selectedStampId={selectedStampId}
                    customStampText={customStampText}
                    customStampColor={customStampColor}
                    watermarkText={watermarkText}
                    watermarkColor={watermarkColor}
                    watermarkOpacity={watermarkOpacity}
                    watermarkRotation={watermarkRotation}
                    watermarkFontSize={watermarkFontSize}
                    watermarkLayout={watermarkLayout}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Bar with Totals & Quick Actions */}
          <div className="px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-[#0c122c] border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
            <div className="flex items-center gap-3 font-mono">
              <span className="text-slate-600 dark:text-neutral-400">
                {isZh ? '合计总额' : 'Grand Total'}:{' '}
                <strong className="text-slate-900 dark:text-white text-sm">
                  ${finalTotal.toFixed(2)}
                </strong>
              </span>
              {depositNum > 0 && (
                <span className="text-slate-600 dark:text-neutral-400">
                  {isZh ? '未付余款' : 'Balance'}:{' '}
                  <strong className="text-blue-600 dark:text-cyan-400 text-sm">
                    ${balanceDue.toFixed(2)}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-neutral-200 font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isZh ? '打印' : 'Print'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isZh ? '下载修改后 PDF' : 'Download Edited PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-300 dark:bg-white/15 hover:bg-slate-400 dark:hover:bg-white/25 text-slate-800 dark:text-white font-bold transition-all active:scale-95 cursor-pointer"
              >
                {isZh ? '完成' : 'Done'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* DIGITAL SIGNATURE STUDIO MODAL (Draw, Type Calligraphy, or Upload Signature) */}
      <AnimatePresence>
        {signatureModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-[#0c122c] border border-slate-300 dark:border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      {isZh ? '电子签名设计器' : 'Digital Signature Studio'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {isZh
                        ? '手写绘制、输入生成艺术签名或上传透明图片'
                        : 'Draw with mouse/touch, type calligraphy, or upload'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="px-5 pt-3.5 pb-2 flex gap-1.5 border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-black/20">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    signatureMode === 'draw'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{isZh ? '手写绘制 (Draw)' : 'Draw'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('type')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    signatureMode === 'type'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{isZh ? '输入生成 (Type)' : 'Type'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('upload')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    signatureMode === 'upload'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isZh ? '上传图片 (Upload)' : 'Upload'}</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* 1. DRAW MODE */}
                {signatureMode === 'draw' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span>{isZh ? '墨水颜色:' : 'Ink Color:'}</span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { color: '#0f172a', label: 'Black' },
                            { color: '#1d4ed8', label: 'Blue' },
                            { color: '#b91c1c', label: 'Red' },
                          ].map(c => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setSignaturePenColor(c.color)}
                              className={`w-5 h-5 rounded-full border cursor-pointer transition-all ${
                                signaturePenColor === c.color
                                  ? 'ring-2 ring-emerald-500 scale-110 shadow-xs'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.color }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearModalSignature}
                        className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        {isZh ? '清除重写' : 'Clear Canvas'}
                      </button>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl overflow-hidden bg-white shadow-inner cursor-crosshair relative">
                      <canvas
                        ref={modalSignatureCanvasRef}
                        width={460}
                        height={160}
                        onMouseDown={e => startDrawingOnCanvas(modalSignatureCanvasRef.current, e)}
                        onMouseMove={e => drawOnCanvas(modalSignatureCanvasRef.current, e, signaturePenColor)}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={e => startDrawingOnCanvas(modalSignatureCanvasRef.current, e)}
                        onTouchMove={e => drawOnCanvas(modalSignatureCanvasRef.current, e, signaturePenColor)}
                        onTouchEnd={stopDrawing}
                        className="w-full h-40 block touch-none"
                      />
                      <div className="absolute bottom-4 left-6 right-6 border-b border-slate-200 dark:border-slate-300/40 pointer-events-none" />
                      <span className="absolute bottom-1 right-3 text-[10px] text-slate-400 pointer-events-none">
                        ✕ Sign Above Line
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. TYPE MODE */}
                {signatureMode === 'type' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                        {isZh ? '输入签名者姓名 / 授权代表' : 'Signatory Name'}:
                      </label>
                      <input
                        type="text"
                        value={typedSignatureName}
                        onChange={e => setTypedSignatureName(e.target.value)}
                        placeholder="e.g. Johnathan Tan / Authorized Representative"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#050817] text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1.5">
                        {isZh ? '书法风格' : 'Calligraphy Style'}:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'script', label: isZh ? '流动草书' : 'Expressive Script' },
                          { id: 'cursive', label: isZh ? '优雅行书' : 'Flowing Cursive' },
                          { id: 'formal', label: isZh ? '正式公文体' : 'Formal Script' },
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setTypedSignatureStyle(st.id as any)}
                            className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                              typedSignatureStyle === st.id
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-inner flex flex-col items-center justify-center min-h-[120px]">
                      <img
                        src={
                          generateSignatureDataUrl(
                            typedSignatureName || 'Authorized Signatory',
                            signaturePenColor,
                            typedSignatureStyle
                          ).dataUrl
                        }
                        alt="Signature Preview"
                        className="max-h-24 object-contain select-none"
                      />
                    </div>
                  </div>
                )}

                {/* 3. UPLOAD MODE */}
                {signatureMode === 'upload' && (
                  <div className="space-y-3">
                    <label className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center">
                      <Upload className="w-8 h-8 text-emerald-400" />
                      <div className="font-bold text-xs text-slate-800 dark:text-white">
                        {isZh ? '点击上传签名文件 (PNG / JPG)' : 'Upload Signature Image'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                        {isZh ? '建议上传透明背景图片以达最佳视觉效果' : 'Transparent PNG background recommended'}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleSignatureFileUpload}
                        className="hidden"
                      />
                    </label>

                    {currentSignatureDataUrl && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <img
                          src={currentSignatureDataUrl}
                          alt="Loaded Signature"
                          className="max-h-20 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSignaturePlacement}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{isZh ? '确定并放置到文档' : 'Insert Signature on Document'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
