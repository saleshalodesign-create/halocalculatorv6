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
} from '../utils/pdfEditor';
import {
  loadPdfDocument,
  renderPdfPageToCanvas,
  extractTextFromPage,
  ExtractedTextItem,
} from '../utils/pdfRenderer';
import { useLanguage } from '../context/LanguageContext';
import { openWhatsApp } from '../utils/messaging';

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: QuoteItem[];
  initialRecordData?: Partial<QuoteRecord>;
  initialDocType?: DocumentType;
  onSaveToQuoteSheet?: (items: QuoteItem[], data: Partial<QuoteRecord>) => void;
}

type EditorTab = 'document' | 'annotate' | 'upload' | 'pages';
type DocumentSource = 'currentQuote' | 'upload' | 'blankA4';
type ActiveToolType = 'text' | 'whiteout' | 'stamp' | 'signature' | 'highlight';

interface InlineEditorState {
  isOpen: boolean;
  mode: 'editText' | 'addText' | 'editAnnotation';
  originalText?: string;
  text: string;
  fontSize: number;
  textColor: string;
  isBold: boolean;
  isItalic: boolean;
  fontFamily: string;
  fontDisplayName: string;
  whiteoutBackground: boolean;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  annotationId?: string;
  extractedItemId?: string;
}

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

  // Active Editor Tab & Document Source
  const [activeTab, setActiveTab] = useState<EditorTab>('annotate');
  const [activeSource, setActiveSource] = useState<DocumentSource>('currentQuote');

  // Multi-page & Page Transformations
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [deletePageIndices, setDeletePageIndices] = useState<number[]>([]);

  // Canvas PDF Viewer & Zoom
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Interactive Click-to-Position on Live Preview
  const [isInteractiveMode, setIsInteractiveMode] = useState<boolean>(true);

  // Active Tool Mode (Default to 'text' for instant text editing!)
  const [activeTool, setActiveTool] = useState<ActiveToolType>('text');

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');

  // Direct Inline Floating Text Editor State
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState>({
    isOpen: false,
    mode: 'editText',
    text: '',
    fontSize: 12,
    textColor: '#000000',
    isBold: false,
    isItalic: false,
    fontFamily: 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontDisplayName: 'Arial / Sans-Serif',
    whiteoutBackground: true,
    xPercent: 0.5,
    yPercent: 0.5,
    widthPercent: 0.2,
    heightPercent: 0.035,
  });

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

  // Signature Pad State
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // Generated PDF Output State
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
      if (initialRecordData.customerName) setCustomerName(initialRecordData.customerName);
      if (initialRecordData.customerPhone) setCustomerPhone(initialRecordData.customerPhone);
      if (initialRecordData.customerEmail) setCustomerEmail(initialRecordData.customerEmail);
      if (initialRecordData.customerAddress) setCustomerAddress(initialRecordData.customerAddress);
      if (initialRecordData.contact) setContact(initialRecordData.contact);
      if (initialDocType) setDocType(initialDocType);
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

  // Generate or update PDF preview
  const refreshPdf = useCallback(async () => {
    setIsProcessing(true);
    try {
      let baseBytes: ArrayBuffer;

      if (activeSource === 'blankA4') {
        baseBytes = uploadedPdfBytes || (await createBlankA4PdfBytes());
      } else if (activeSource === 'upload' && uploadedPdfBytes) {
        baseBytes = uploadedPdfBytes;
      } else {
        // Generate from structured data
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
        baseBytes = await generateHaloPdfBytes(
          items,
          data,
          docType,
          grandTotal,
          discountAmount,
          finalTotal
        );
      }

      // Check total page count
      const pCount = await getPdfPageCount(baseBytes);
      setTotalPages(Math.max(1, pCount - deletePageIndices.length));

      // Apply annotations, rotations, watermarks, page deletions
      const finalBytes = await applyPdfAnnotations(baseBytes, annotations, {
        rotations,
        watermarkText,
        deletePages: deletePageIndices,
      });

      setCurrentPdfBytes(finalBytes);
    } catch (err) {
      console.error('Error compiling PDF preview:', err);
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
    annotations,
    rotations,
    watermarkText,
    deletePageIndices,
    isZh,
  ]);

  // Auto-regenerate on dependencies change
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(refreshPdf, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, refreshPdf]);

  // Render current PDF page to HTML5 Canvas using pdfjs-dist
  useEffect(() => {
    if (!isOpen || !currentPdfBytes || !pdfCanvasRef.current) return;

    let isCancelled = false;
    setIsRenderingPage(true);

    const renderPage = async () => {
      try {
        const pdfDoc = await loadPdfDocument(currentPdfBytes);
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
  }, [isOpen, currentPdfBytes, currentPageIndex, zoomScale]);

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
  // DIRECT INLINE TEXT EDITING METHODS
  // ==========================================

  // 1. Click on existing detected text on PDF (Auto Follows Font Family, Size, Weight, Italic, Color)
  const handleStartEditText = (item: ExtractedTextItem) => {
    setInlineEditor({
      isOpen: true,
      mode: 'editText',
      originalText: item.text,
      text: item.text,
      fontSize: item.fontSizePt || 11,
      textColor: item.textColor || '#000000',
      isBold: !!item.isBold,
      isItalic: !!item.isItalic,
      fontFamily: item.fontFamily || 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontDisplayName: item.fontDisplayName || 'Arial / Sans-Serif',
      whiteoutBackground: true,
      xPercent: item.xPercent,
      yPercent: item.yPercent,
      widthPercent: Math.max(item.widthPercent, 0.05),
      heightPercent: Math.max(item.heightPercent, 0.025),
      extractedItemId: item.id,
    });
  };

  // 2. Click on empty space to type new text
  const handleStartAddText = (x: number, y: number) => {
    setInlineEditor({
      isOpen: true,
      mode: 'addText',
      originalText: '',
      text: '',
      fontSize: 12,
      textColor: '#000000',
      isBold: false,
      isItalic: false,
      fontFamily: 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontDisplayName: 'Arial / Sans-Serif',
      whiteoutBackground: false,
      xPercent: x,
      yPercent: y,
      widthPercent: 0.22,
      heightPercent: 0.035,
    });
  };

  // 3. Click on existing annotation to edit it
  const handleStartEditAnnotation = (ann: PdfAnnotation) => {
    setInlineEditor({
      isOpen: true,
      mode: 'editAnnotation',
      originalText: ann.text || '',
      text: ann.text || '',
      fontSize: ann.fontSize || 12,
      textColor: ann.textColor || '#000000',
      isBold: !!ann.isBold,
      isItalic: !!ann.isItalic,
      fontFamily: ann.fontFamily || 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontDisplayName: ann.fontDisplayName || 'Arial / Sans-Serif',
      whiteoutBackground: ann.type === 'whiteout',
      xPercent: ann.xPercent,
      yPercent: ann.yPercent,
      widthPercent: ann.widthPercent || 0.2,
      heightPercent: ann.heightPercent || 0.04,
      annotationId: ann.id,
    });
  };

  // 4. Save and apply inline text modification
  const handleSaveInlineEdit = () => {
    if (!inlineEditor.isOpen) return;

    const {
      mode,
      text,
      fontSize,
      textColor,
      isBold,
      isItalic,
      fontFamily,
      fontDisplayName,
      whiteoutBackground,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
      annotationId,
    } = inlineEditor;

    if (mode === 'editAnnotation' && annotationId) {
      setAnnotations(prev =>
        prev.map(ann =>
          ann.id === annotationId
            ? {
                ...ann,
                text,
                fontSize,
                textColor,
                isBold,
                isItalic,
                fontFamily,
                fontDisplayName,
                type: whiteoutBackground ? 'whiteout' : 'text',
              }
            : ann
        )
      );
      showToast(isZh ? '已保存文字修改！' : 'Saved text changes!');
    } else {
      // mode: 'editText' or 'addText'
      if (whiteoutBackground) {
        // Erase old text underneath with white rectangle and render replacement text with matching font
        const newAnn: PdfAnnotation = {
          id: `ann-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: 'whiteout',
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
          text,
          fontSize,
          textColor,
          isBold,
          isItalic,
          fontFamily,
          fontDisplayName,
        };
        setAnnotations(prev => [...prev, newAnn]);
      } else {
        if (!text.trim()) {
          setInlineEditor(prev => ({ ...prev, isOpen: false }));
          return;
        }
        const newAnn: PdfAnnotation = {
          id: `ann-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: 'text',
          xPercent,
          yPercent,
          text,
          fontSize,
          textColor,
          isBold,
          isItalic,
          fontFamily,
          fontDisplayName,
        };
        setAnnotations(prev => [...prev, newAnn]);
      }
      showToast(isZh ? `已修改文字: "${text || '(已涂白擦除)'}"` : `Applied text changes!`);
    }

    setInlineEditor(prev => ({ ...prev, isOpen: false }));
  };

  // 5. Erase / Wipe text out with white patch
  const handleEraseInlineText = () => {
    if (!inlineEditor.isOpen) return;
    const { xPercent, yPercent, widthPercent, heightPercent, annotationId } = inlineEditor;

    if (annotationId) {
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      showToast(isZh ? '已删除该文字图层' : 'Deleted text layer');
    } else {
      // Create blank whiteout patch over the area
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: currentPageIndex,
        type: 'whiteout',
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        text: '',
      };
      setAnnotations(prev => [...prev, newAnn]);
      showToast(isZh ? '已涂白擦除原文字！' : 'Erased text with whiteout patch!');
    }
    setInlineEditor(prev => ({ ...prev, isOpen: false }));
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
      id: `ann-${Date.now()}`,
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
    setAnnotations(prev => [...prev, newAnn]);
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

    const newAnns: PdfAnnotation[] = matches.map((match, i) => {
      const replaced = match.text.replace(new RegExp(findText, 'gi'), replaceText);
      return {
        id: `ann-${Date.now()}-${i}`,
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

  // Direct Interactive Placement & Drag-to-Select Box on PDF Canvas
  const handleMouseDownOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    // If click was on an existing interactive element, don't drag
    if ((e.target as HTMLElement).closest('.annotation-interactive') || (e.target as HTMLElement).closest('.text-item-interactive')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.005, Math.min(0.995, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.005, Math.min(0.995, (e.clientY - rect.top) / rect.height));

    setIsDragging(true);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    setClickX(Number(x.toFixed(3)));
    setClickY(Number(y.toFixed(3)));
  };

  const handleMouseMoveOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.005, Math.min(0.995, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.005, Math.min(0.995, (e.clientY - rect.top) / rect.height));
    setDragCurrent({ x, y });
  };

  const handleMouseUpOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragStart && dragCurrent) {
      const dx = Math.abs(dragCurrent.x - dragStart.x);
      const dy = Math.abs(dragCurrent.y - dragStart.y);

      // If user dragged a significant box (> 1% width/height), create Whiteout or Highlight box
      if (dx > 0.015 && dy > 0.012) {
        const left = Math.min(dragStart.x, dragCurrent.x);
        const top = Math.min(dragStart.y, dragCurrent.y);

        if (activeTool === 'whiteout' || activeTool === 'text') {
          // Open the inline editor right over this drawn box so user can type replacement or just whiteout!
          setInlineEditor({
            isOpen: true,
            mode: 'addText',
            originalText: '',
            text: '',
            fontSize: 11,
            textColor: '#000000',
            isBold: false,
            whiteoutBackground: true,
            xPercent: Number(left.toFixed(3)),
            yPercent: Number(top.toFixed(3)),
            widthPercent: Number(dx.toFixed(3)),
            heightPercent: Number(dy.toFixed(3)),
          });
        } else if (activeTool === 'highlight') {
          const newAnn: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            pageIndex: currentPageIndex,
            type: 'highlight',
            xPercent: Number(left.toFixed(3)),
            yPercent: Number(top.toFixed(3)),
            widthPercent: Number(dx.toFixed(3)),
            heightPercent: Number(dy.toFixed(3)),
            backgroundColor: highlightColor,
          };
          setAnnotations(prev => [...prev, newAnn]);
          showToast(isZh ? '已在拖选区域应用荧光高亮！' : 'Highlight applied to selected area!');
        }
      } else {
        // Just a simple click without dragging!
        if (activeTool === 'text') {
          // Open inline editor to type text right at clicked spot!
          handleStartAddText(clickX, clickY);
        }
      }
    }

    setDragStart(null);
    setDragCurrent(null);
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

  // --- Signature Pad Methods ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Add Annotation Action from Sidebar
  const handleAddAnnotation = () => {
    const targetPage = currentPageIndex;
    if (activeTool === 'stamp') {
      const isCustom = selectedStampId === 'CUSTOM';
      const preset = STAMP_PRESETS.find(p => p.id === selectedStampId) || STAMP_PRESETS[0];
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: targetPage,
        type: 'stamp',
        xPercent: clickX,
        yPercent: clickY,
        stampType: isCustom ? 'CUSTOM' : (preset.id as any),
        stampText: isCustom ? customStampText : preset.text,
        stampColor: isCustom ? customStampColor : preset.color,
        fontSize: 15,
      };
      setAnnotations(prev => [...prev, newAnn]);
      showToast(
        isZh
          ? `已盖印至第 ${targetPage + 1} 页: ${isCustom ? customStampText : preset.label}`
          : `Stamp applied to Page ${targetPage + 1}`
      );
    } else if (activeTool === 'text') {
      if (!annotationText.trim()) return;
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
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
      setAnnotations(prev => [...prev, newAnn]);
      showToast(isZh ? `已添加文字至第 ${targetPage + 1} 页` : `Added Text to Page ${targetPage + 1}`);
    } else if (activeTool === 'whiteout') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
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
      setAnnotations(prev => [...prev, newAnn]);
      showToast(isZh ? `已添加涂白修正区至第 ${targetPage + 1} 页` : `Added Whiteout Patch to Page ${targetPage + 1}`);
    } else if (activeTool === 'signature') {
      const canvas = signatureCanvasRef.current;
      if (!canvas || !hasSignature) {
        showToast(isZh ? '请先在签名板中签名' : 'Please draw your signature first');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: targetPage,
        type: 'signature',
        xPercent: clickX,
        yPercent: clickY,
        widthPercent: 0.22,
        heightPercent: 0.08,
        imageDataUrl: dataUrl,
      };
      setAnnotations(prev => [...prev, newAnn]);
      showToast(isZh ? `已将电子签名放入第 ${targetPage + 1} 页` : `Signature placed on Page ${targetPage + 1}`);
    } else if (activeTool === 'highlight') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: targetPage,
        type: 'highlight',
        xPercent: clickX,
        yPercent: clickY,
        widthPercent: 0.25,
        heightPercent: 0.035,
        backgroundColor: highlightColor,
      };
      setAnnotations(prev => [...prev, newAnn]);
      showToast(isZh ? `已添加高亮标记至第 ${targetPage + 1} 页` : `Highlight added to Page ${targetPage + 1}`);
    }
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Download Action
  const handleDownload = () => {
    if (!currentPdfBytes) return;
    const baseName = uploadedFileName
      ? uploadedFileName.replace(/\.pdf$/i, '') + '_edited.pdf'
      : `${docType === 'invoice' ? 'Invoice' : docType === 'receipt' ? 'Receipt' : 'Quotation'}_${docNo || 'Document'}.pdf`;
    downloadPdfBytes(currentPdfBytes, baseName);
    showToast(isZh ? '正在下载修改后的 PDF 文件...' : 'Downloading edited PDF...');
  };

  // Print Action
  const handlePrint = () => {
    if (!currentPdfBytes) return;
    const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    } else {
      showToast(isZh ? '请允许弹出窗口以打印文档' : 'Please allow popups to print');
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
                onClick={() => {
                  setActiveTool('signature');
                  setActiveTab('annotate');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'signature'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Sign document"
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
            <div className="w-full md:w-5/12 lg:w-4/12 border-r border-slate-200 dark:border-white/10 flex flex-col overflow-y-auto mac-scrollbar p-3 sm:p-4 space-y-3.5 bg-white dark:bg-[#070b1a]">
              {/* Top Mode Banner */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border border-blue-500/25 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500 dark:text-cyan-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isZh ? '直接在 PDF 上点击即可编辑文字' : 'Click Any Text on PDF to Edit Directly'}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-snug">
                    {isZh
                      ? '在右侧画面中，移到任何文字上点击即可快速修改或擦除！点击空白处可输入新文字。'
                      : 'Hover & click any text on the preview to modify or erase! Click blank areas to type new text.'}
                  </p>
                </div>
              </div>

              {/* TAB: STRUCTURED QUOTE FORM (when activeTab === 'document' && activeSource === 'currentQuote') */}
              {activeTab === 'document' && activeSource === 'currentQuote' && (
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
                <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-[#0c122c] border border-slate-200 dark:border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-neutral-200">
                      {isZh ? '电子签名板' : 'Digital Signature Pad'}
                    </span>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                    >
                      {isZh ? '清除重签' : 'Clear'}
                    </button>
                  </div>
                  <div className="border border-slate-300 dark:border-white/20 rounded-xl overflow-hidden bg-white shadow-inner cursor-crosshair">
                    <canvas
                      ref={signatureCanvasRef}
                      width={320}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 block touch-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-center">
                    {isZh ? '用鼠标或触摸屏在上方区域签名，随后点击下方放置' : 'Draw signature above, then place on page'}
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
                    {annotations.map(ann => (
                      <div
                        key={ann.id}
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

              {/* Status Hint Bar */}
              <div className="px-3 py-1 bg-slate-900 border-b border-white/5 flex items-center justify-between text-[11px] shrink-0">
                <div className="flex items-center gap-2 text-cyan-300 font-medium">
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  <span>
                    {isZh
                      ? '💡 点击画面上的任意文字即可立即修改；按住拖动可框选涂白'
                      : '💡 Click any text on the page to edit; drag to box-whiteout'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeTool !== 'text' && (
                    <button
                      type="button"
                      onClick={handleAddAnnotation}
                      className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isZh ? '在选定位置应用' : 'Place Here'}</span>
                    </button>
                  )}
                </div>
              </div>

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

                  {/* Interactive Placement & Annotation Overlay */}
                  {isInteractiveMode && (
                    <div
                      className="absolute inset-0 z-20 cursor-text"
                      onMouseDown={handleMouseDownOverlay}
                      onMouseMove={handleMouseMoveOverlay}
                      onMouseUp={handleMouseUpOverlay}
                    >
                      {/* Drag selection rectangle preview */}
                      {dragBox && (
                        <div
                          className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/20 pointer-events-none transition-none"
                          style={{
                            left: `${dragBox.left}%`,
                            top: `${dragBox.top}%`,
                            width: `${dragBox.width}%`,
                            height: `${dragBox.height}%`,
                          }}
                        />
                      )}

                      {/* 1. INTERACTIVE DETECTED TEXT LAYER (Click any text on PDF to edit it!) */}
                      {extractedTextItems.map(item => {
                        const left = item.xPercent * 100;
                        const top = item.yPercent * 100;
                        const width = item.widthPercent * 100;
                        const height = item.heightPercent * 100;
                        const isHovered = hoveredTextId === item.id;

                        return (
                          <div
                            key={item.id}
                            onClick={e => {
                              e.stopPropagation();
                              handleStartEditText(item);
                            }}
                            onMouseEnter={() => setHoveredTextId(item.id)}
                            onMouseLeave={() => setHoveredTextId(null)}
                            className={`text-item-interactive absolute cursor-pointer rounded-xs transition-colors duration-75 group ${
                              isHovered
                                ? 'bg-cyan-500/25 outline outline-1.5 outline-cyan-400 shadow-xs'
                                : 'hover:bg-cyan-500/15'
                            }`}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                            }}
                            title={`${isZh ? '点击直接编辑此文字' : 'Click to edit'}: "${item.text}"`}
                          >
                            {/* Hover Edit Tag */}
                            <span className="absolute -top-4 -left-1 hidden group-hover:flex items-center gap-0.5 px-1 py-0.2 bg-cyan-600 text-white text-[8px] font-bold rounded shadow pointer-events-none z-30 whitespace-nowrap">
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>{isZh ? '编辑' : 'Edit'}</span>
                            </span>
                          </div>
                        );
                      })}

                      {/* 2. RENDER ACTIVE ANNOTATIONS / WHITEOUTS ON THIS PAGE */}
                      {currentPageAnnotations.map(ann => {
                        const left = ann.xPercent * 100;
                        const top = ann.yPercent * 100;
                        const width = (ann.widthPercent || 0.2) * 100;
                        const height = (ann.heightPercent || 0.04) * 100;

                        if (ann.type === 'whiteout') {
                          return (
                            <div
                              key={ann.id}
                              onClick={e => {
                                e.stopPropagation();
                                handleStartEditAnnotation(ann);
                              }}
                              className="annotation-interactive absolute bg-white border border-slate-300 shadow-xs flex items-center justify-between px-1 text-[10px] overflow-hidden pointer-events-auto group cursor-pointer hover:border-cyan-500"
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                              }}
                              title={isZh ? '点击修改此涂白文本' : 'Click to edit whiteout text'}
                            >
                              <span className="truncate text-slate-800 font-sans font-medium text-[9px]">
                                {ann.text || ''}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleStartEditAnnotation(ann);
                                  }}
                                  className="text-blue-500 p-0.5 hover:text-blue-700 cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRemoveAnnotation(ann.id);
                                  }}
                                  className="text-red-500 p-0.5 hover:text-red-700 cursor-pointer"
                                  title="Remove whiteout"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (ann.type === 'highlight') {
                          return (
                            <div
                              key={ann.id}
                              className="annotation-interactive absolute opacity-45 pointer-events-auto group"
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                backgroundColor: ann.backgroundColor || '#fef08a',
                              }}
                            >
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveAnnotation(ann.id);
                                }}
                                className="absolute right-0 top-0 text-red-600 font-bold text-xs opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          );
                        }

                        if (ann.type === 'stamp') {
                          return (
                            <div
                              key={ann.id}
                              className="annotation-interactive absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group"
                              style={{ left: `${left}%`, top: `${top}%` }}
                            >
                              <div
                                className="px-2 py-0.5 rounded border-2 font-mono font-bold text-[10px] shadow-md flex items-center gap-1"
                                style={{
                                  color: ann.stampColor || '#b91c1c',
                                  borderColor: ann.stampColor || '#b91c1c',
                                  backgroundColor: '#fff1f2',
                                }}
                              >
                                <span>{ann.stampText}</span>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRemoveAnnotation(ann.id);
                                  }}
                                  className="text-red-500 opacity-0 group-hover:opacity-100 ml-1 cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (ann.type === 'text') {
                          return (
                            <div
                              key={ann.id}
                              onClick={e => {
                                e.stopPropagation();
                                handleStartEditAnnotation(ann);
                              }}
                              className="annotation-interactive absolute pointer-events-auto group whitespace-nowrap cursor-pointer hover:ring-1 hover:ring-cyan-400 rounded"
                              style={{ left: `${left}%`, top: `${top}%` }}
                            >
                              <span
                                className={`px-1 rounded text-xs ${ann.isBold ? 'font-bold' : ''}`}
                                style={{
                                  color: ann.textColor || '#000000',
                                  backgroundColor: ann.backgroundColor || 'transparent',
                                }}
                              >
                                {ann.text}
                              </span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveAnnotation(ann.id);
                                }}
                                className="text-red-500 opacity-0 group-hover:opacity-100 ml-1 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          );
                        }

                        if (ann.type === 'signature' && ann.imageDataUrl) {
                          return (
                            <div
                              key={ann.id}
                              className="annotation-interactive absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group"
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                              }}
                            >
                              <img
                                src={ann.imageDataUrl}
                                alt="Signature"
                                className="w-full h-auto object-contain"
                              />
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveAnnotation(ann.id);
                                }}
                                className="absolute right-0 top-0 text-red-500 opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer font-bold"
                              >
                                ×
                              </button>
                            </div>
                          );
                        }

                        return null;
                      })}

                      {/* Target Pin in Non-Text Modes */}
                      {activeTool !== 'text' && (
                        <div
                          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-75"
                          style={{ left: `${clickX * 100}%`, top: `${clickY * 100}%` }}
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-500/25 flex items-center justify-center shadow-lg animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. DIRECT INLINE FLOATING TEXT EDITOR MODAL */}
                  <AnimatePresence>
                    {inlineEditor.isOpen && (
                      <div
                        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-3"
                        onClick={() => setInlineEditor(prev => ({ ...prev, isOpen: false }))}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          onClick={e => e.stopPropagation()}
                          className="w-full max-w-md bg-white dark:bg-[#0c122c] border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-cyan-300">
                              <Edit3 className="w-4 h-4 text-cyan-400" />
                              <span>
                                {inlineEditor.mode === 'editText'
                                  ? isZh
                                    ? '直接修改文字'
                                    : 'Edit Text'
                                  : inlineEditor.mode === 'editAnnotation'
                                  ? isZh
                                    ? '修改图层文字'
                                    : 'Edit Layer Text'
                                  : isZh
                                  ? '添加新文字'
                                  : 'Add Text'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInlineEditor(prev => ({ ...prev, isOpen: false }))}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Reference to original text if editing */}
                          {inlineEditor.originalText && (
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] space-y-0.5">
                              <span className="text-[10px] text-slate-400 font-bold block">
                                {isZh ? '原文字内容:' : 'Original Text:'}
                              </span>
                              <p className="font-mono text-slate-600 dark:text-neutral-300 break-all select-text">
                                {inlineEditor.originalText}
                              </p>
                            </div>
                          )}

                          {/* Text input area */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                              {isZh ? '修改后的文字:' : 'New Text:'}
                            </label>
                            <textarea
                              rows={2}
                              autoFocus
                              value={inlineEditor.text}
                              onChange={e =>
                                setInlineEditor(prev => ({ ...prev, text: e.target.value }))
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveInlineEdit();
                                }
                              }}
                              placeholder={isZh ? '输入替换文字...' : 'Type text...'}
                              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#050817] text-xs font-semibold outline-none resize-none focus:border-cyan-400"
                            />
                          </div>

                          {/* Font styling controls */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block">
                                {isZh ? '字号' : 'Size'}: {inlineEditor.fontSize}pt
                              </label>
                              <input
                                type="range"
                                min="8"
                                max="32"
                                value={inlineEditor.fontSize}
                                onChange={e =>
                                  setInlineEditor(prev => ({
                                    ...prev,
                                    fontSize: parseInt(e.target.value, 10),
                                  }))
                                }
                                className="w-full mt-1 cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block">
                                {isZh ? '颜色' : 'Color'}:
                              </label>
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="color"
                                  value={inlineEditor.textColor}
                                  onChange={e =>
                                    setInlineEditor(prev => ({ ...prev, textColor: e.target.value }))
                                  }
                                  className="w-7 h-7 rounded border border-slate-300 dark:border-white/20 cursor-pointer"
                                />
                                <span className="font-mono text-[10px] text-slate-400">
                                  {inlineEditor.textColor}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setInlineEditor(prev => ({ ...prev, isBold: !prev.isBold }))
                                }
                                className={`w-full py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  inlineEditor.isBold
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/15'
                                }`}
                              >
                                {isZh ? '加粗 Bold' : 'Bold'}
                              </button>
                            </div>
                          </div>

                          {/* Whiteout background toggle */}
                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none pt-1">
                            <input
                              type="checkbox"
                              checked={inlineEditor.whiteoutBackground}
                              onChange={e =>
                                setInlineEditor(prev => ({
                                  ...prev,
                                  whiteoutBackground: e.target.checked,
                                }))
                              }
                              className="rounded cursor-pointer"
                            />
                            <span className="text-slate-700 dark:text-neutral-300 text-[11px]">
                              {isZh
                                ? '涂白遮盖原文字 (在文字下方垫上白色遮罩，确保不重叠)'
                                : 'Whiteout background (cleans underlying text to prevent overlap)'}
                            </span>
                          </label>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                            {inlineEditor.originalText ? (
                              <button
                                type="button"
                                onClick={handleEraseInlineText}
                                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/25 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                title="Wipe out this text with whiteout patch"
                              >
                                <Eraser className="w-3.5 h-3.5" />
                                <span>{isZh ? '擦除此文字' : 'Erase Text'}</span>
                              </button>
                            ) : (
                              <div></div>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setInlineEditor(prev => ({ ...prev, isOpen: false }))
                                }
                                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-300 font-bold text-xs cursor-pointer"
                              >
                                {isZh ? '取消' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveInlineEdit}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isZh ? '确定应用 (Enter)' : 'Apply (Enter)'}</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
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
    </AnimatePresence>
  );
};
