import React, { useState } from 'react';
import { QuoteItem, QuoteRecord, Unit, UnitType } from '../types';
import { AuthContextType } from '../hooks/useFirebaseAuth';
import { useLanguage } from '../context/LanguageContext';
import { GoogleIcon } from './GoogleIcon';
import { copyToClipboard, formatQuotationText } from '../utils/clipboard';
import {
  formatDocumentMessage,
  openWhatsApp,
  openEmail,
  getDocumentSubject,
  DocumentType,
  downloadBlobOrFile,
  formatPDFCoverMessage,
  canShareNative,
  shareNative,
} from '../utils/messaging';
import { SendShareModal } from './SendShareModal';
import {
  generateQuotationPDF,
  generateInvoicePDF,
  generateReceiptPDF,
  createDocumentPDFFile,
} from '../utils/pdfGenerator';
import {
  FileText,
  Plus,
  Trash,
  Check,
  Copy,
  Download,
  Search,
  Cloud,
  FolderOpen,
  Ruler,
  MessageSquare,
  Mail,
  Share2,
  Phone,
  AtSign,
  Send,
  FileCheck,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

export const PRESET_ITEMS: Array<{ name: string; price: number }> = [
  { name: 'Laminated A4', price: 25 },
  { name: 'Laminated A3', price: 35 },
  { name: 'Standard Banner', price: 90 },
  { name: 'A1 Poster', price: 180 },
  { name: 'A1 Poster with Stand', price: 230 },
  { name: 'EasyRoll', price: 280 },
  { name: 'Menu Book', price: 85 },
  { name: 'Pricing Sticker', price: 50 },
  { name: 'On-Site Transformer Replacement', price: 180 },
  { name: 'On-Site Pricing Sticker Replacement', price: 80 },
  { name: 'On-Site Photoshoot Services', price: 200 },
  { name: 'Photoshoot Services', price: 40 },
  { name: 'T5 LED', price: 25 },
  { name: 'T8 LED', price: 30 },
  { name: 'Labour Charges', price: 180 },
];

interface QuotationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearAll: () => void;
  onAddCustomItem: (item: QuoteItem) => void;
  onUpdateItem: (id: string, updates: Partial<QuoteItem>) => void;
  auth: AuthContextType;
  onLoadQuoteRecord: (record: QuoteRecord) => void;
  onOpenDailySchedule?: (customerName?: string, customerAddress?: string) => void;
}

export const QuotationListModal: React.FC<QuotationListModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onAddCustomItem,
  onUpdateItem,
  auth,
  onLoadQuoteRecord,
  onOpenDailySchedule,
}) => {
  const { language, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'cloudRecords'>('active');
  const [formMode, setFormMode] = useState<'quote' | 'invoice' | 'receipt' | 'textPreview' | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [textFormat, setTextFormat] = useState<'whatsapp' | 'standard'>('whatsapp');
  const [toastMessage, setToastMessage] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Custom Item inputs
  const [customName, setCustomName] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [customUnit, setCustomUnit] = useState<UnitType>(Unit.IN);
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState('1');

  // Document Details
  const [docNo, setDocNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contact, setContact] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deposit, setDeposit] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PAYNOW');
  const [paymentTerms, setPaymentTerms] = useState('Due within 7 days');
  const [showSizes, setShowSizes] = useState(true);
  const [sendFormat, setSendFormat] = useState<'text' | 'pdf'>('text');

  // Send & Share Modal Target State
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendModalTarget, setSendModalTarget] = useState<{
    items: QuoteItem[];
    recordData: Partial<QuoteRecord>;
    grandTotal: number;
    discountAmount: number;
    finalTotal: number;
    docType: DocumentType;
  } | null>(null);
  const [textPreviewDocType, setTextPreviewDocType] = useState<DocumentType>('quote');

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [customDiscountInput, setCustomDiscountInput] = useState('');

  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);
  const discountAmount =
    discountType === 'percent'
      ? grandTotal * (discountValue / 100)
      : discountType === 'fixed'
      ? Math.min(grandTotal, discountValue)
      : 0;
  const finalTotal = Math.max(0, grandTotal - discountAmount);

  const { user, cloudQuotes, saveQuoteToCloud, deleteQuoteFromCloud, setAuthModalOpen } = auth || {};

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleSaveToCloud = async () => {
    if (items.length === 0) {
      showToast('Add items before saving to your account');
      return;
    }
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setIsSavingCloud(true);
    const generatedDocNo =
      docNo.trim() ||
      `HDH-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        100 + Math.random() * 900
      )}`;
    if (!docNo) setDocNo(generatedDocNo);

    const quotePayload: Partial<QuoteRecord> = {
      docNo: generatedDocNo,
      customerName: customerName || 'Valued Client',
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      discountType,
      discountValue,
      grandTotal,
      discountAmount,
      finalTotal,
      items: [...items],
      dateFormatted: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    try {
      await saveQuoteToCloud(quotePayload);
      showToast('Saved to Google Account successfully!');
    } catch (e) {
      console.error('Save error:', e);
      showToast('Failed to save to cloud');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleLoadRecord = (record: QuoteRecord) => {
    if (onLoadQuoteRecord) {
      onLoadQuoteRecord(record);
    }
    if (record.docNo) setDocNo(record.docNo);
    if (record.customerName) setCustomerName(record.customerName);
    if (record.customerAddress) setCustomerAddress(record.customerAddress);
    if (record.contact) setContact(record.contact);
    if (record.customerPhone) setCustomerPhone(record.customerPhone);
    if (record.customerEmail) setCustomerEmail(record.customerEmail);
    if (record.deposit !== undefined) setDeposit(record.deposit.toString());
    if (record.discountType) setDiscountType(record.discountType);
    if (record.discountValue !== undefined) {
      setDiscountValue(record.discountValue);
      if (record.discountType === 'fixed') {
        setCustomDiscountInput(record.discountValue > 0 ? record.discountValue.toString() : '');
      }
    }
    if (record.paymentMethod) setPaymentMethod(record.paymentMethod);
    if (record.paymentTerms) setPaymentTerms(record.paymentTerms);
    if (record.showSizes !== undefined) setShowSizes(record.showSizes);
    setActiveSubTab('active');
    showToast(`Loaded document #${record.docNo || 'Record'} into workspace!`);
  };

  const handleOpenSendModal = (
    docTypeParam: DocumentType = 'quote',
    recordOverride?: QuoteRecord
  ) => {
    if (recordOverride) {
      setSendModalTarget({
        items: recordOverride.items || [],
        recordData: recordOverride,
        grandTotal: recordOverride.grandTotal || 0,
        discountAmount: recordOverride.discountAmount || 0,
        finalTotal: recordOverride.finalTotal || recordOverride.grandTotal || 0,
        docType: docTypeParam,
      });
    } else {
      if (items.length === 0) {
        showToast('Add items before sending document');
        return;
      }
      setSendModalTarget({
        items,
        recordData: {
          docNo,
          customerName,
          customerAddress,
          contact,
          customerPhone,
          customerEmail,
          deposit: parseFloat(deposit) || 0,
          paymentMethod,
          paymentTerms,
          showSizes,
          docType: docTypeParam,
        },
        grandTotal,
        discountAmount,
        finalTotal,
        docType: docTypeParam,
      });
    }
    setSendModalOpen(true);
  };

  const handleQuickWhatsApp = async (
    docTypeParam: DocumentType = 'quote',
    formatMode: 'text' | 'pdf' = sendFormat,
    customData?: Partial<QuoteRecord>,
    customItems?: QuoteItem[]
  ) => {
    const activeItems = customItems || items;
    if (activeItems.length === 0) {
      showToast('Add items first before sending via WhatsApp');
      return;
    }
    const data: Partial<QuoteRecord> = customData || {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: docTypeParam,
    };
    const gTotal = customData?.grandTotal ?? grandTotal;
    const dAmount = customData?.discountAmount ?? discountAmount;
    const fTotal = customData?.finalTotal ?? finalTotal;
    const phoneToSend = data.customerPhone || data.contact || '';

    if (formatMode === 'pdf') {
      try {
        showToast('Generating official PDF document...');
        const pdfOutput = createDocumentPDFFile(docTypeParam, activeItems, data, gTotal, dAmount, fTotal);
        const pdfCover = formatPDFCoverMessage({
          data,
          finalTotal: fTotal,
          docType: docTypeParam,
          filename: pdfOutput.filename,
          format: 'whatsapp',
        });

        if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
          const shared = await shareNative({
            title: getDocumentSubject(data, docTypeParam),
            text: pdfCover,
            files: [pdfOutput.file],
          });
          if (shared) {
            showToast('Shared PDF directly to WhatsApp!');
            return;
          }
        }

        downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
        openWhatsApp({
          phone: phoneToSend,
          text: pdfCover,
        });
        showToast(`PDF downloaded! Attach ${pdfOutput.filename} in WhatsApp.`);
      } catch (err) {
        console.error('WhatsApp PDF error:', err);
        showToast('Failed to generate PDF for WhatsApp');
      }
      return;
    }

    const text = formatDocumentMessage({
      items: activeItems,
      data,
      grandTotal: gTotal,
      discountAmount: dAmount,
      finalTotal: fTotal,
      docType: docTypeParam,
      format: 'whatsapp',
    });

    openWhatsApp({
      phone: phoneToSend,
      text,
    });
    showToast(`Launching WhatsApp with ${docTypeParam === 'invoice' ? 'Invoice' : 'Quotation'} text...`);
  };

  const handleQuickEmail = async (
    docTypeParam: DocumentType = 'quote',
    formatMode: 'text' | 'pdf' = sendFormat,
    customData?: Partial<QuoteRecord>,
    customItems?: QuoteItem[]
  ) => {
    const activeItems = customItems || items;
    if (activeItems.length === 0) {
      showToast('Add items first before sending via Email');
      return;
    }
    const data: Partial<QuoteRecord> = customData || {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: docTypeParam,
    };
    const gTotal = customData?.grandTotal ?? grandTotal;
    const dAmount = customData?.discountAmount ?? discountAmount;
    const fTotal = customData?.finalTotal ?? finalTotal;
    const subject = getDocumentSubject(data, docTypeParam);

    if (formatMode === 'pdf') {
      try {
        showToast('Generating official PDF document...');
        const pdfOutput = createDocumentPDFFile(docTypeParam, activeItems, data, gTotal, dAmount, fTotal);
        const pdfCover = formatPDFCoverMessage({
          data,
          finalTotal: fTotal,
          docType: docTypeParam,
          filename: pdfOutput.filename,
          format: 'email',
        });

        if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
          const shared = await shareNative({
            title: subject,
            text: pdfCover,
            files: [pdfOutput.file],
          });
          if (shared) {
            showToast('Shared PDF directly to Mail!');
            return;
          }
        }

        downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
        openEmail({
          email: data.customerEmail || '',
          subject,
          body: pdfCover,
        });
        showToast(`PDF downloaded! Attach ${pdfOutput.filename} to your email draft.`);
      } catch (err) {
        console.error('Email PDF error:', err);
        showToast('Failed to generate PDF for Email');
      }
      return;
    }

    const body = formatDocumentMessage({
      items: activeItems,
      data,
      grandTotal: gTotal,
      discountAmount: dAmount,
      finalTotal: fTotal,
      docType: docTypeParam,
      format: 'email',
    });

    openEmail({
      email: data.customerEmail || '',
      subject,
      body,
    });
    showToast(`Opening email client for ${docTypeParam === 'invoice' ? 'Invoice' : 'Quotation'}...`);
  };

  const handleCopyAllQuotes = async (
    formatOverride?: 'whatsapp' | 'standard' | 'email',
    docTypeOverride?: DocumentType
  ) => {
    if (items.length === 0) return;
    const resolvedDocType = docTypeOverride || (formMode === 'invoice' ? 'invoice' : 'quote');
    const data: Partial<QuoteRecord> = {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: resolvedDocType,
    };
    const format = formatOverride || textFormat;
    const text = formatDocumentMessage({
      items,
      data,
      grandTotal,
      discountAmount,
      finalTotal,
      docType: resolvedDocType,
      format,
    });
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      showToast(`${resolvedDocType === 'invoice' ? 'Invoice' : 'Quotation'} text copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPreviewText = () => {
    return formatDocumentMessage({
      items,
      data: {
        docNo,
        customerName,
        customerAddress,
        contact,
        customerPhone,
        customerEmail,
        deposit: parseFloat(deposit) || 0,
        paymentMethod,
        paymentTerms,
        showSizes,
      },
      grandTotal,
      discountAmount,
      finalTotal,
      docType: textPreviewDocType,
      format: textFormat,
    });
  };

  const handleSendAsWhatsAppFromPreview = () => {
    if (items.length === 0) {
      showToast('Add items first before sending via WhatsApp');
      return;
    }
    const text = getPreviewText();
    const phoneToSend = customerPhone || contact || '';
    openWhatsApp({
      phone: phoneToSend,
      text,
    });
    showToast(`Launching WhatsApp with ${textPreviewDocType === 'invoice' ? 'Invoice' : 'Quotation'} text...`);
  };

  const handleSendAsEmailFromPreview = () => {
    if (items.length === 0) {
      showToast('Add items first before sending via Email');
      return;
    }
    const text = getPreviewText();
    const data: Partial<QuoteRecord> = {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: textPreviewDocType,
    };
    const subject = getDocumentSubject(data, textPreviewDocType);
    openEmail({
      email: customerEmail || '',
      subject,
      body: text,
    });
    showToast(`Opening email client for ${textPreviewDocType === 'invoice' ? 'Invoice' : 'Quotation'}...`);
  };

  const handleCopySingleItem = async (item: QuoteItem, index: number) => {
    let desc = `${index + 1}. ${item.title.toUpperCase()}`;
    if (item.originalWidth > 0) {
      desc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
    }
    const priceStr = item.totalPrice === 0 ? 'FOC' : `$${(item.totalPrice * item.quantity).toFixed(2)}`;
    const itemText = `${desc} x${item.quantity} = ${priceStr}`;
    const success = await copyToClipboard(itemText);
    if (success) {
      setCopiedItemId(item.id);
      showToast(`Copied item #${index + 1} to clipboard!`);
      setTimeout(() => setCopiedItemId(null), 1800);
    }
  };

  const handleAddCustom = () => {
    const price = parseFloat(customPrice);
    const qty = parseInt(customQuantity) || 1;
    const w = parseFloat(customWidth);
    const h = parseFloat(customHeight);
    const hasDimensions = !isNaN(w) && !isNaN(h) && w > 0 && h > 0;

    let finalTitle = customName.trim();
    if (!finalTitle) {
      if (hasDimensions) {
        finalTitle = `Custom Signage (${w}×${h} ${customUnit})`;
      } else if (!isNaN(price)) {
        finalTitle = 'Custom Signage / Item';
      } else {
        showToast('Please enter an item description or price.');
        return;
      }
    }

    const finalPrice = isNaN(price) || price < 0 ? 0 : price;

    onAddCustomItem({
      id: Date.now().toString(),
      timestamp: Date.now(),
      quantity: qty,
      title: finalTitle,
      totalPrice: finalPrice,
      widthInches: 0,
      heightInches: 0,
      unit: hasDimensions ? customUnit : Unit.IN,
      originalWidth: hasDimensions ? w : 0,
      originalHeight: hasDimensions ? h : 0,
      colorTheme: 'blue',
    });

    setCustomName('');
    setCustomPrice('');
    setCustomWidth('');
    setCustomHeight('');
    setCustomQuantity('1');
    showToast(`Added "${finalTitle}" to quote list!`);
  };

  const handleExport = (action: 'view' | 'save') => {
    const data = {
      docNo,
      customerName,
      customerAddress,
      contact,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
    };

    try {
      if (formMode === 'quote') {
        generateQuotationPDF(items, data, grandTotal, discountAmount, finalTotal, action);
      } else if (formMode === 'invoice') {
        generateInvoicePDF(items, data, grandTotal, discountAmount, finalTotal, action);
      } else {
        generateReceiptPDF(items, data, grandTotal, discountAmount, finalTotal, action);
      }
    } catch (e) {
      console.error('PDF export failed:', e);
    }
  };

  const filteredCloudRecords = (cloudQuotes || []).filter(q => {
    const searchLower = recordSearch.toLowerCase();
    const docMatch = (q.docNo || '').toLowerCase().includes(searchLower);
    const clientMatch = (q.customerName || '').toLowerCase().includes(searchLower);
    const itemsMatch = (q.items || []).some(it => (it.title || '').toLowerCase().includes(searchLower));
    return docMatch || clientMatch || itemsMatch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-6 bg-black/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl h-[96vh] sm:h-[90vh] bg-white dark:bg-[#0a0f24] rounded-xl sm:rounded-2xl shadow-2xl border border-black/10 dark:border-indigo-500/25 flex flex-col overflow-hidden relative"
      >
        {/* Ambient Cyber Neon Crown Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90 shrink-0"></div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 sm:gap-2 border border-white/20 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {toastMessage}
          </div>
        )}

        {/* macOS Window Top Bar */}
        <div className="min-h-[38px] sm:min-h-[44px] px-2.5 sm:px-4 py-1 sm:py-1.5 bg-slate-50 dark:bg-[#0c122c] border-b border-slate-200/90 dark:border-indigo-500/20 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 flex items-center justify-center text-black/60"
            ></button>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27C93F]"></span>
          </div>

          {/* Center Navigation Tabs: Active Quote vs Google Cloud Records */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSubTab('active');
                setFormMode(null);
              }}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
                activeSubTab === 'active'
                  ? 'bg-white dark:bg-[#141d44] shadow-sm text-slate-900 dark:text-cyan-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? '当前清单' : 'Active'} ({items.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('cloudRecords');
                setFormMode(null);
              }}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
                activeSubTab === 'cloudRecords'
                  ? 'bg-white dark:bg-[#141d44] shadow-sm text-slate-900 dark:text-cyan-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              <GoogleIcon className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? '云端存档' : 'Cloud'} ({cloudQuotes?.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {activeSubTab === 'active' && !formMode && (
              <>
                <button
                  onClick={handleSaveToCloud}
                  disabled={isSavingCloud || items.length === 0}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-slate-50 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-40"
                  title={language === 'zh' ? '保存当前报价单至云端' : 'Save current quote to Google Account'}
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">
                    {isSavingCloud
                      ? (language === 'zh' ? '保存中...' : 'Saving...')
                      : (language === 'zh' ? '存云端' : 'Save')}
                  </span>
                </button>
                <button
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    showCustomForm
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-200 hover:bg-slate-300'
                  }`}
                  title={language === 'zh' ? '切换自定义项目添加抽屉' : 'Toggle Custom Item drawer'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {showCustomForm
                      ? (language === 'zh' ? '收起表单' : 'Hide Form')
                      : (language === 'zh' ? '+ 自定义项' : '+ Custom')}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: ACTIVE QUOTE WORKSPACE */}
        {activeSubTab === 'active' &&
          (!formMode ? (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#070b19]/60">
              {/* Compact Custom Item Drawer */}
              {showCustomForm && (
                <div className="p-2 sm:p-3 bg-white dark:bg-[#0c122c] border-b border-black/10 dark:border-indigo-500/20 space-y-1.5 sm:space-y-2 animate-fade-in shrink-0">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={
                        language === 'zh'
                          ? '项目描述 (例如: 3D 亚克力发光字、现场安装费、吊车费)'
                          : 'Item description (e.g. 3D Acrylic Lettering, Installation Fee)'
                      }
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      className="flex-1 min-w-0 px-2.5 py-1 sm:py-1.5 text-xs rounded-lg bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 focus:ring-1 focus:ring-cyan-500 outline-none text-neutral-900 dark:text-white"
                    />
                    {/* Beside Item Description: Preset Items Dropdown */}
                    <select
                      id="preset-items-dropdown"
                      value=""
                      onChange={e => {
                        const selected = PRESET_ITEMS.find(p => p.name === e.target.value);
                        if (selected) {
                          const localizedName = language === 'zh' && (t.quotationList.presets as any)?.[selected.name]
                            ? (t.quotationList.presets as any)[selected.name]
                            : selected.name;
                          setCustomName(localizedName);
                          setCustomPrice(selected.price.toString());
                          showToast(`${language === 'zh' ? '已选择' : 'Selected'}: ${localizedName} ($${selected.price})`);
                        }
                      }}
                      className="w-32 sm:w-44 px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-blue-50 dark:bg-[#080d22] border border-blue-300 dark:border-cyan-800/60 text-blue-700 dark:text-cyan-300 outline-none hover:border-cyan-500 transition-colors cursor-pointer shrink-0 truncate"
                      title={language === 'zh' ? '快捷预设项目' : 'Preset Items'}
                    >
                      <option value="" disabled>
                        ⚡ {language === 'zh' ? '快捷预设' : 'Presets'} ({PRESET_ITEMS.length})
                      </option>
                      {PRESET_ITEMS.map(item => {
                        const displayName = language === 'zh' && (t.quotationList.presets as any)?.[item.name]
                          ? (t.quotationList.presets as any)[item.name]
                          : item.name;
                        return (
                          <option
                            key={item.name}
                            value={item.name}
                            className="bg-white dark:bg-[#080d22] text-neutral-900 dark:text-neutral-100 font-normal"
                          >
                            {displayName} — ${item.price}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={language === 'zh' ? '宽' : 'W'}
                        value={customWidth}
                        onChange={e => setCustomWidth(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-11 sm:w-16 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 outline-none text-neutral-900 dark:text-white text-center"
                        title={language === 'zh' ? '宽度' : 'Width'}
                      />
                      <span className="text-[10px] text-neutral-400">×</span>
                      <input
                        type="number"
                        placeholder={language === 'zh' ? '高' : 'H'}
                        value={customHeight}
                        onChange={e => setCustomHeight(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-11 sm:w-16 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 outline-none text-neutral-900 dark:text-white text-center"
                        title={language === 'zh' ? '高度' : 'Height'}
                      />
                      <select
                        value={customUnit}
                        onChange={e => setCustomUnit(e.target.value as UnitType)}
                        className="px-1 py-1 text-xs rounded-md bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 outline-none text-neutral-800 dark:text-neutral-200"
                      >
                        <option value={Unit.IN}>in</option>
                        <option value={Unit.FT}>ft</option>
                        <option value={Unit.CM}>cm</option>
                        <option value={Unit.MM}>mm</option>
                        <option value={Unit.M}>m</option>
                      </select>
                    </div>

                    <input
                      type="number"
                      placeholder={language === 'zh' ? '数量' : 'Qty'}
                      value={customQuantity}
                      onChange={e => setCustomQuantity(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      className="w-10 sm:w-14 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 outline-none text-neutral-900 dark:text-white text-center"
                      title={language === 'zh' ? '数量' : 'Quantity'}
                    />

                    <div className="flex items-center bg-neutral-100 dark:bg-[#050817] px-1.5 py-1 rounded-md border border-black/10 dark:border-indigo-500/25">
                      <span className="text-[11px] text-neutral-500 mr-0.5">$</span>
                      <input
                        type="number"
                        placeholder={language === 'zh' ? '金额' : 'Price'}
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-14 sm:w-20 bg-transparent text-xs font-mono outline-none text-neutral-900 dark:text-white font-bold"
                        title={language === 'zh' ? '单价金额' : 'Price'}
                      />
                    </div>

                    <button
                      onClick={handleAddCustom}
                      className="px-3 py-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 ml-auto transition-transform active:scale-95 shadow-sm shrink-0"
                    >
                      {language === 'zh' ? '添加项目' : 'Add Item'}
                    </button>
                  </div>
                </div>
              )}

              {/* Themed Table Column Header Bar */}
              {items.length > 0 && (
                <div className="px-3 sm:px-4 py-1.5 bg-slate-100/90 dark:bg-[#080d22] border-b border-slate-200/90 dark:border-indigo-500/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-300 flex items-center justify-between gap-2 shrink-0 select-none">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-5 text-center font-mono">#</span>
                    <span className="flex-1">{language === 'zh' ? '项目名称与尺寸' : 'Item Description & Size'}</span>
                    <span className="hidden sm:inline-block w-28 text-center">{language === 'zh' ? '单价' : 'Unit Price'}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                    <span className="w-16 sm:w-20 text-center">{language === 'zh' ? '数量' : 'Qty'}</span>
                    <span className="w-16 sm:w-20 text-right">{language === 'zh' ? '小计' : 'Total'}</span>
                    <span className="w-14 sm:w-16 text-center">{language === 'zh' ? '操作' : 'Action'}</span>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1.5 sm:space-y-2 mac-scrollbar min-h-0">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-6 sm:py-10 px-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 sm:mb-3">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-neutral-100">
                      {language === 'zh' ? '当前报价单为空' : 'Your quotation list is empty.'}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 max-w-sm mt-1 leading-relaxed">
                      {language === 'zh'
                        ? '添加项目方法：在主界面计算任何招牌并点击"+ 加入报价单"，或在上方选择常用预设项 / 输入自定义项目后点击"添加项目"。'
                        : 'To add items: calculate any signage on the main screen & click "+ Add to Quote", or choose a preset item / enter custom details above and click "Add Item".'}
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-[#0d1433]/85 hover:dark:bg-[#121c45] border border-slate-200/80 dark:border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 shadow-sm hover:border-cyan-500/40 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="w-5 text-center text-xs font-mono text-slate-400 dark:text-cyan-400/80 font-bold">{index + 1}.</span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => onUpdateItem(item.id, { title: e.target.value })}
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-cyan-500 flex-1 min-w-0"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5 sm:mt-1 ml-3 sm:ml-5">
                          {item.originalWidth > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40 text-[10px] sm:text-xs font-semibold">
                              {item.originalWidth} × {item.originalHeight} {item.unit}
                            </span>
                          )}
                          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#050817] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-indigo-500/25 hover:border-cyan-500/50 focus-within:border-cyan-500 transition-colors">
                            <span className="text-slate-500 dark:text-cyan-400/80 font-bold text-[10px] sm:text-xs">$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.totalPrice === 0 ? '' : item.totalPrice}
                              placeholder="0.00"
                              onChange={e => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdateItem(item.id, { totalPrice: isNaN(val) ? 0 : val });
                              }}
                              className="w-12 sm:w-16 bg-transparent text-[10px] sm:text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                              title="Click to edit unit price"
                            />
                            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-neutral-400">/unit</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-indigo-500/15">
                        {/* Qty */}
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/60 dark:bg-[#050817] p-0.5 rounded-lg border border-slate-200/60 dark:border-indigo-500/20">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white dark:bg-white/10 flex items-center justify-center font-bold hover:bg-neutral-200 text-xs text-neutral-800 dark:text-neutral-200 active:scale-95"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const q = parseInt(e.target.value);
                              onUpdateItem(item.id, { quantity: isNaN(q) || q < 1 ? 1 : q });
                            }}
                            className="w-6 sm:w-7 text-center font-mono font-bold text-xs text-neutral-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-cyan-500"
                            title="Edit quantity"
                          />
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white dark:bg-white/10 flex items-center justify-center font-bold hover:bg-neutral-200 text-xs text-neutral-800 dark:text-neutral-200 active:scale-95"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[60px] sm:w-20">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-cyan-300">
                            ${(item.totalPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Action Buttons: Copy Item & Delete */}
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => handleCopySingleItem(item, index)}
                            className={`p-1 sm:p-1.5 rounded-md border transition-all ${
                              copiedItemId === item.id
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'text-neutral-400 hover:text-cyan-400 border-transparent hover:bg-neutral-100 dark:hover:bg-white/10'
                            }`}
                            title="Copy this line item"
                          >
                            {copiedItemId === item.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-neutral-400 hover:text-red-400 p-1 sm:p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 transition-all"
                            title="Delete item"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Compact Footer & Export bar */}
              <div className="p-2 sm:p-4 bg-white dark:bg-[#0c122c] border-t border-slate-200/90 dark:border-indigo-500/20 flex flex-col gap-1.5 sm:gap-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-neutral-400">
                      {language === 'zh' ? '折扣:' : 'Disc:'}
                    </span>
                    <button
                      onClick={() => {
                        setDiscountType('percent');
                        setDiscountValue(5);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'percent' && discountValue === 5
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      5%
                    </button>
                    <button
                      onClick={() => {
                        setDiscountType('percent');
                        setDiscountValue(10);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'percent' && discountValue === 10
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      10%
                    </button>
                    <button
                      onClick={() => {
                        setDiscountType('none');
                        setDiscountValue(0);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'none'
                          ? 'bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white shadow-inner font-bold'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      0%
                    </button>

                    {/* Customize discount amount ($) */}
                    <div
                      className={`inline-flex items-center rounded transition-all border ${
                        discountType === 'fixed'
                          ? 'border-blue-500/70 bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 shadow-sm'
                          : 'border-transparent bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('fixed');
                          const val = parseFloat(customDiscountInput);
                          setDiscountValue(!isNaN(val) && val > 0 ? val : 0);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                          discountType === 'fixed'
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-200/80 dark:hover:bg-white/10'
                        }`}
                        title={language === 'zh' ? '自定义扣减金额 ($)' : 'Customize discount amount ($)'}
                      >
                        {language === 'zh' ? '自定义$' : 'Custom $'}
                      </button>
                      {discountType === 'fixed' && (
                        <div className="flex items-center px-1.5 py-0.5 animate-fade-in">
                          <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mr-0.5">$</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={customDiscountInput}
                            onChange={e => {
                              const valStr = e.target.value;
                              setCustomDiscountInput(valStr);
                              const num = parseFloat(valStr);
                              setDiscountValue(!isNaN(num) && num >= 0 ? num : 0);
                            }}
                            placeholder="0.00"
                            autoFocus
                            className="w-14 sm:w-16 text-[10px] sm:text-xs font-mono font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-blue-400/50"
                          />
                          {customDiscountInput && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomDiscountInput('');
                                setDiscountValue(0);
                              }}
                              className="ml-1 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white text-[10px]"
                              title="Clear"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show / Hide Sizes quick toggle */}
                    <button
                      type="button"
                      onClick={() => setShowSizes(!showSizes)}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs rounded font-semibold border transition-all flex items-center gap-1 ${
                        showSizes
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-500 border-slate-200 dark:border-white/10'
                      }`}
                      title={showSizes ? 'Dimensions included on PDF' : 'Dimensions hidden on PDF'}
                    >
                      <Ruler className="w-3 h-3" />
                      <span>{language === 'zh' ? (showSizes ? '尺寸:开' : '无尺寸') : (showSizes ? 'Sizes' : 'No Size')}</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 uppercase font-bold tracking-wider">
                        {language === 'zh' ? '总计:' : 'Total:'}
                      </span>
                      <div className="text-base sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                        ${finalTotal.toFixed(2)}
                      </div>
                    </div>
                    {discountAmount > 0 && (
                      <div className="text-[9px] sm:text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {language === 'zh' ? '已减' : 'Disc'}: -${discountAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Grid: 3 columns even on mobile */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-0.5 sm:pt-1">
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('textPreview')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#0e1638] hover:bg-slate-200 dark:hover:bg-[#142050] text-slate-800 dark:text-cyan-300 font-bold text-[10px] sm:text-xs disabled:opacity-40 transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-indigo-500/25 active:scale-95 shadow-sm"
                  >
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{language === 'zh' ? '文本预览' : 'Preview'}</span>
                  </button>
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('quote')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-[10px] sm:text-xs hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-500/25 active:scale-95"
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{language === 'zh' ? '报价单 PDF' : 'Quote PDF'}</span>
                  </button>
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('invoice')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[10px] sm:text-xs hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/25 active:scale-95"
                  >
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{language === 'zh' ? '发票 PDF' : 'Invoice PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : formMode === 'textPreview' ? (
            /* Text Preview & Copy Mode */
            <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-indigo-500/20 shrink-0">
                <button
                  onClick={() => setFormMode(null)}
                  className="text-sm text-cyan-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  {language === 'zh' ? '← 返回清单' : '← Back to List'}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Doc Type Selector */}
                  <div className="flex p-0.5 rounded-lg bg-neutral-200/70 dark:bg-[#0c122c] border dark:border-indigo-500/20 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTextPreviewDocType('quote')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textPreviewDocType === 'quote'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'zh' ? '报价单' : 'Quotation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextPreviewDocType('invoice')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textPreviewDocType === 'invoice'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'zh' ? '发票' : 'Invoice'}
                    </button>
                  </div>

                  {/* Sizes Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSizes(!showSizes)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      showSizes
                        ? 'bg-blue-500/10 text-blue-600 dark:text-cyan-400 border-blue-500/30 dark:border-cyan-500/30'
                        : 'bg-neutral-100 dark:bg-[#0c122c] text-neutral-500 border-black/10 dark:border-indigo-500/20'
                    }`}
                    title={showSizes ? 'Item dimensions included' : 'Item dimensions excluded'}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? (showSizes ? '尺寸: 显示' : '尺寸: 隐藏') : (showSizes ? 'Sizes: ON' : 'Sizes: OFF')}</span>
                  </button>

                  <div className="flex p-0.5 rounded-lg bg-neutral-100 dark:bg-[#0c122c] border dark:border-indigo-500/20 text-xs font-semibold">
                    <button
                      onClick={() => setTextFormat('whatsapp')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textFormat === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setTextFormat('standard')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textFormat === 'standard'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'zh' ? '纯文本' : 'Standard Plain'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase text-neutral-400">
                    {textPreviewDocType === 'invoice'
                      ? (language === 'zh' ? '发票文本内容' : 'Tax Invoice Text Output')
                      : (language === 'zh' ? '报价单文本内容' : 'Quotation Text Output')}:
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {language === 'zh' ? '可直接复制或一键发送' : 'Ready to send directly or paste'}
                  </span>
                </div>
                <textarea
                  readOnly
                  value={getPreviewText()}
                  className="flex-1 w-full p-4 rounded-xl font-mono text-xs bg-neutral-100/80 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/25 outline-none text-neutral-800 dark:text-neutral-200 resize-none leading-relaxed mac-scrollbar select-all"
                />
              </div>

              {/* Recipient Quick Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-100/80 dark:bg-[#0c122c] border border-slate-200/80 dark:border-indigo-500/20 shrink-0">
                <div className="flex items-center gap-2 px-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder={language === 'zh' ? '接收人 WhatsApp (如: +65 9123 4567)' : 'Recipient WhatsApp (+65 9123 4567)'}
                    className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder={language === 'zh' ? '接收人邮箱 (client@company.com)' : 'Recipient Email (client@company.com)'}
                    className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              {/* Action Buttons: WhatsApp, Email, Copy */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSendAsWhatsAppFromPreview}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{language === 'zh' ? '发送至 WhatsApp' : 'Send as WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendAsEmailFromPreview}
                  className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>{language === 'zh' ? '发送邮件' : 'Send as Email'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAllQuotes(textFormat, textPreviewDocType)}
                  className="py-3 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-black/5 dark:border-white/10 active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? (language === 'zh' ? '已复制！' : 'Copied!') : (language === 'zh' ? '复制格式化文本' : 'Copy Formatted Text')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* PDF Details Configuration Form */
            <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4 mac-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <button
                  onClick={() => setFormMode(null)}
                  className="text-sm text-blue-500 font-semibold flex items-center gap-1 hover:underline"
                >
                  {language === 'zh' ? '← 返回清单' : '← Back to List'}
                </button>
                <span className="text-xs uppercase font-bold text-neutral-400">
                  {language === 'zh'
                    ? `生成${formMode === 'invoice' ? '发票' : formMode === 'receipt' ? '收据' : '报价单'}`
                    : `Generate ${formMode}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {language === 'zh' ? '客户 / 公司名称' : 'Customer / Company Name'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder={language === 'zh' ? '输入客户姓名或公司名称' : 'Client name'}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {language === 'zh' ? '单据编号' : 'Document No'}
                  </label>
                  <input
                    type="text"
                    value={docNo}
                    onChange={e => setDocNo(e.target.value)}
                    placeholder="e.g. QT-2026-001"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm font-mono outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-neutral-500">
                  {language === 'zh' ? '地址 / 安装施工地点' : 'Address / Location'}
                </label>
                <textarea
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder={language === 'zh' ? '施工现场或收货送货地址' : 'Site or delivery location'}
                  className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 h-20 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {language === 'zh' ? '联系人 / 经手人' : 'Attention / Contact'}
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder={language === 'zh' ? '联系人姓名' : 'Contact person'}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {formMode === 'receipt'
                      ? (language === 'zh' ? '实收金额 ($)' : 'Amount Received ($)')
                      : formMode === 'invoice'
                      ? (language === 'zh' ? '已收定金 ($)' : 'Deposit / Paid ($)')
                      : (language === 'zh' ? '预收定金 ($)' : 'Deposit Amount ($)')}
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    placeholder={formMode === 'receipt' ? finalTotal.toFixed(2) : "0.00"}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm font-mono outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Direct Messaging Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{language === 'zh' ? 'WhatsApp 手机号 (例如: +65 9123 4567)' : 'WhatsApp Mobile No. (e.g. +65 9123 4567)'}</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+65 9123 4567"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === 'zh' ? '客户电子邮箱' : 'Client Email Address'}</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Payment Method & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {language === 'zh' ? '付款方式 / 渠道' : 'Payment Method / Mode'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white font-medium"
                  >
                    <option value="PAYNOW">PayNow (UEN: 201826136D)</option>
                    <option value="BANK TRANSFER">{language === 'zh' ? '银行转账 (OCBC 华侨银行)' : 'Bank Transfer (OCBC)'}</option>
                    <option value="CHEQUE">{language === 'zh' ? '支票 (Halo Design Hub)' : 'Cheque (Halo Design Hub)'}</option>
                    <option value="CASH">{language === 'zh' ? '现金 (货到付款)' : 'Cash on Delivery'}</option>
                    <option value="CREDIT CARD">{language === 'zh' ? '信用卡 / 在线支付' : 'Credit Card / Online'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {language === 'zh' ? '付款条款' : 'Payment Terms'}
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder={language === 'zh' ? '例如: 7天内付清 / 交付时结清' : 'e.g. Due within 7 days'}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#050817] border border-black/10 dark:border-indigo-500/20 text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Show / Hide Dimensions Option Card */}
              <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-[#0c122c] border border-black/10 dark:border-indigo-500/20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-all ${showSizes ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-neutral-500/10 text-neutral-400'}`}>
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>{language === 'zh' ? '项目规格与尺寸标注' : 'Item Dimensions & Sizes'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        showSizes 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border border-neutral-500/20'
                      }`}>
                        {showSizes
                          ? (language === 'zh' ? '显示尺寸' : 'Showing Sizes')
                          : (language === 'zh' ? '尺寸已隐藏' : 'Sizes Hidden')}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {showSizes 
                        ? (language === 'zh' ? '在文档的项目名称旁附带打印尺寸 (例如 [120X36 IN])。' : 'Dimensions (e.g. [120X36 IN]) are printed next to item names in the document.')
                        : (language === 'zh' ? '隐藏具体尺寸 (仅打印项目名称，不显示尺寸规格)。' : 'Dimensions are omitted (prints item names only without size specifications).')}
                    </p>
                  </div>
                </div>

                <div className="flex p-0.5 rounded-xl bg-white dark:bg-[#070b19] border border-black/10 dark:border-indigo-500/25 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSizes(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      showSizes
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'zh' ? '显示尺寸' : 'Show Sizes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSizes(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !showSizes
                        ? 'bg-neutral-700 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'zh' ? '隐藏尺寸' : 'Hide Sizes'}
                  </button>
                </div>
              </div>

              {/* Payment Breakdown Card Preview */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-neutral-700 dark:text-neutral-300">
                    {language === 'zh' ? 'PDF 付款摘要:' : 'Payment Summary on PDF:'}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {language === 'zh' ? '方式: ' : 'Mode: '}
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{paymentMethod}</span> | {language === 'zh' ? '条款: ' : 'Terms: '}
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{paymentTerms || (language === 'zh' ? '标准条款' : 'Standard')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">
                      {language === 'zh' ? '总金额' : 'Total'}
                    </div>
                    <div className="font-bold text-sm text-neutral-900 dark:text-white font-mono">${finalTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">
                      {language === 'zh' ? '已付 / 定金' : 'Paid / Deposit'}
                    </div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      ${(parseFloat(deposit) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">
                      {language === 'zh' ? '应付尾款' : 'Balance Due'}
                    </div>
                    <div className="font-bold text-sm text-red-600 dark:text-red-400 font-mono">
                      ${Math.max(0, finalTotal - (parseFloat(deposit) || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Send Format Selector: Text vs PDF */}
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-[#0c122c]/70 border border-black/10 dark:border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${sendFormat === 'pdf' ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-200/50 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'}`}>
                    {sendFormat === 'pdf' ? <FileCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {language === 'zh'
                        ? `发送格式: ${sendFormat === 'pdf' ? '正式 PDF 单据' : '格式化文本清单'}`
                        : `Send Format: ${sendFormat === 'pdf' ? 'Official PDF Document' : 'Formatted Text Summary'}`}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {sendFormat === 'pdf'
                        ? (language === 'zh' ? '生成带公司标识、抬头及 PayNow 付款二维码的正式高品质 PDF' : 'Prepares high-resolution PDF document with branding and PayNow instructions')
                        : (language === 'zh' ? '生成清晰整齐的文本报价明细，直接粘贴或发送至对话窗口' : 'Sends clean, copyable text breakdown directly into chat or email')}
                    </div>
                  </div>
                </div>

                <div className="flex p-0.5 rounded-xl bg-white dark:bg-[#070b19] border border-black/10 dark:border-indigo-500/25 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => setSendFormat('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sendFormat === 'text'
                        ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '纯文本' : 'Send as Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendFormat('pdf')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sendFormat === 'pdf'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? 'PDF 单据' : 'Send as PDF'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                {/* Tier 1: Primary Output Actions (Print, Download, Copy) */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport('view')}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 active:scale-95"
                    title={language === 'zh' ? '在浏览器新标签页打开 PDF 供预览和打印' : 'Open PDF in new tab to view and print'}
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === 'zh' ? '打印单据' : 'Print Form'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport('save')}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-white/15 dark:hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    title={language === 'zh' ? '下载矢量 PDF 文件到电脑' : 'Download Vector PDF file'}
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>{language === 'zh' ? '下载 PDF' : 'Download PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAllQuotes(textFormat, formMode === 'invoice' ? 'invoice' : 'quote')}
                    className="py-3 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-white/10 active:scale-95 shrink-0"
                    title={language === 'zh' ? '复制格式化文本清单' : 'Copy formatted text summary'}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? (language === 'zh' ? '已复制！' : 'Copied!') : (language === 'zh' ? '复制文本' : 'Copy Text')}</span>
                  </button>
                </div>

                {/* Tier 2: Communication & Workflows (WhatsApp, Email, Share Hub, Schedule) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickWhatsApp(formMode === 'invoice' ? 'invoice' : 'quote', sendFormat)}
                    className="py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    title={sendFormat === 'pdf' ? 'Send PDF via WhatsApp' : 'Send text summary via WhatsApp'}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="truncate">WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickEmail(formMode === 'invoice' ? 'invoice' : 'quote', sendFormat)}
                    className="py-2.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    title={sendFormat === 'pdf' ? 'Send PDF via Email' : 'Send text summary via Email'}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{language === 'zh' ? '邮件' : 'Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSendModal(formMode === 'invoice' ? 'invoice' : 'quote')}
                    className="py-2.5 px-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    title="Send & Share Hub"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    <span className="truncate">{language === 'zh' ? '分享中心' : 'Share Hub'}</span>
                  </button>

                  {onOpenDailySchedule && (
                    <button
                      type="button"
                      onClick={() => onOpenDailySchedule(customerName, customerAddress)}
                      className="py-2.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/25 transition-all active:scale-95"
                      title={language === 'zh' ? '填入每日外出安装排程表' : 'Open in Daily Outside Schedule'}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">{language === 'zh' ? '排程表' : 'Schedule'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

        {/* TAB 2: CLOUD SAVED RECORDS */}
        {activeSubTab === 'cloudRecords' && (
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50 dark:bg-[#070b19]/60 p-4 sm:p-6 space-y-4">
            {user ? (
              <>
                {/* Search & Cloud Status Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder={language === 'zh' ? '搜索已存报价 (按单号、客户姓名、项目内容)...' : 'Search saved quotes by Doc #, customer name, items...'}
                      value={recordSearch}
                      onChange={e => setRecordSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0d1433] border border-slate-200 dark:border-indigo-500/20 focus:ring-2 focus:ring-cyan-500 outline-none text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-mono">
                      {language === 'zh'
                        ? `${cloudQuotes?.length || 0} 条存档 (${user.email})`
                        : `${cloudQuotes?.length || 0} Records on ${user.email}`}
                    </span>
                  </div>
                </div>

                {/* Records List */}
                <div className="flex-1 overflow-y-auto space-y-3 mac-scrollbar">
                  {filteredCloudRecords.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16">
                      <Cloud className="w-12 h-12 opacity-20 mb-2" />
                      <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        {recordSearch
                          ? (language === 'zh' ? '未找到匹配的报价记录' : 'No matching quotations found')
                          : (language === 'zh' ? '您的 Google 账号中暂无云端存档' : 'No saved records in your Google Account yet')}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                        {language === 'zh'
                          ? '切换至"当前清单"并点击"存云端"即可将报价永久备份至云端。'
                          : 'Switch to the "Active Quote" tab and click "Save to Cloud" to backup your quotes permanently.'}
                      </p>
                    </div>
                  ) : (
                    filteredCloudRecords.map(record => (
                      <div
                        key={record.id}
                        className="p-4 rounded-2xl bg-white dark:bg-[#0d1433] border border-slate-200/80 dark:border-indigo-500/20 hover:border-cyan-500/40 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[11px] font-mono font-bold">
                              {record.docNo || 'NO-DOC-ID'}
                            </span>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {record.customerName || (language === 'zh' ? '贵客' : 'Valued Client')}
                            </h4>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {record.dateFormatted ||
                                new Date(record.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                            {(record.items || []).map(i => `${i.quantity}x ${i.title}`).join(', ')}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono mt-1.5">
                            <span>{record.items?.length || 0} {language === 'zh' ? '项内容' : 'Items'}</span>
                            {record.deposit !== undefined && record.deposit > 0 && (
                              <span>{language === 'zh' ? '定金' : 'Deposit'}: ${Number(record.deposit).toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Pricing & Record Actions */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                              {language === 'zh' ? '总额' : 'Total'}
                            </span>
                            <span className="text-lg font-black font-mono text-neutral-900 dark:text-white">
                              ${Number(record.finalTotal || record.grandTotal || 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {/* Load into Workspace */}
                            <button
                              onClick={() => handleLoadRecord(record)}
                              className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              title={language === 'zh' ? '打开并将此报价载入计算器' : 'Open and load this quote back into the calculator'}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>{language === 'zh' ? '载入报价' : 'Open Record'}</span>
                            </button>

                            {/* Copy Text */}
                            <button
                              onClick={async () => {
                                const txt = formatQuotationText(
                                  record.items || [],
                                  record,
                                  record.grandTotal || 0,
                                  record.discountAmount || 0,
                                  record.finalTotal || 0,
                                  'whatsapp'
                                );
                                await copyToClipboard(txt);
                                showToast(`${language === 'zh' ? '已复制单据文本' : 'Copied quote text'}: #${record.docNo}`);
                              }}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-700 dark:text-neutral-300 transition-all"
                              title={language === 'zh' ? '复制报价文本' : 'Copy quote text'}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete from Cloud */}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    language === 'zh'
                                      ? `确定从您的 Google 云端账号中删除单据 #${record.docNo || '此记录'} 吗？`
                                      : `Delete quote #${record.docNo || 'this record'} from your Google account?`
                                  )
                                ) {
                                  deleteQuoteFromCloud(record.id);
                                  showToast(language === 'zh' ? '已从云端删除' : 'Deleted from Google Cloud');
                                }
                              }}
                              className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              title={language === 'zh' ? '删除记录' : 'Delete record'}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Not Logged In State for Cloud Tab */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-white dark:bg-[#24242a] shadow-xl border border-black/10 dark:border-white/10 flex items-center justify-center">
                  <GoogleIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {language === 'zh' ? '登录以查看云端存档' : 'Sign In to View Cloud Records'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    {language === 'zh'
                      ? '使用 Google 账号登录，可将所有客户报价单、发票单号、定制尺寸与价格明细在您的所有设备间实时同步。'
                      : 'Log in with your Google account to keep all customer quotations, invoice numbers, custom sizing, and pricing records synced across all your devices.'}
                  </p>
                </div>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>{language === 'zh' ? '使用 Google 账号登录' : 'Sign In with Google'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp / Email / PDF Send & Share Modal */}
      {sendModalOpen && (
        <SendShareModal
          isOpen={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setSendModalTarget(null);
          }}
          items={sendModalTarget?.items || items}
          recordData={
            sendModalTarget?.recordData || {
              docNo,
              customerName,
              customerAddress,
              contact,
              customerPhone,
              customerEmail,
              deposit: parseFloat(deposit) || 0,
              paymentMethod,
              paymentTerms,
              showSizes,
            }
          }
          grandTotal={sendModalTarget?.grandTotal ?? grandTotal}
          discountAmount={sendModalTarget?.discountAmount ?? discountAmount}
          finalTotal={sendModalTarget?.finalTotal ?? finalTotal}
          docType={sendModalTarget?.docType || (formMode === 'invoice' ? 'invoice' : 'quote')}
          initialSendFormat={sendFormat}
        />
      )}
    </div>
  );
};
