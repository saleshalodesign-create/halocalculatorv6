import { LanguageType } from '../types';

export interface Translations {
  // Menu Bar
  appTitle: string;
  quotationSheet: string;
  installApp: string;
  calculator: string;
  shapeInspector: string;
  itemsUnit: string;
  signInWithGoogle: string;
  signedInAs: string;
  themeDark: string;
  themeLight: string;
  language: string;
  langName: string;
  langShort: string;
  switchToLang: string;

  // Dock
  dockQuotes: string;
  dockCloud: string;
  dockLogin: string;
  dockCalc: string;
  dockShape: string;
  dockWallpaper: string;
  dockDark: string;
  dockLight: string;
  dockLang: string;
  dockLangTitle: string;

  // Main Window & Toolbar
  calcWindowTitle: string;
  dimLabel: string;
  widthPlaceholder: string;
  heightPlaceholder: string;
  resetRates: string;
  resetRatesTooltip: string;
  shapeHorizontal: string;
  shapeVertical: string;
  shapeSquare: string;
  shapeCustom: string;
  shapeInspectTooltip: string;

  // Signage Pricing Cards
  cardLightbox: string;
  cardLightboxBacklit: string;
  cardBacklit: string;
  cardTrans: string;
  card3dPrinted: string;
  cardVinylSticker: string;
  cardLedStrip: string;
  cardAcrylic: string;
  sqFtUnit: string;
  ftUnit: string;
  clickToEditRate: string;
  clickToInspect: string;

  // Quotation Item Modal
  modalSpecTitle: string;
  modalSignageSpec: string;
  modalItemTitlePlaceholder: string;
  modalMathFormula: string;
  modalCopyFormula: string;
  modalCopied: string;
  modalLedStripRule: string;
  modalStandardAreaRule: string;
  modalStep1Conversion: string;
  modalStep1Input: string;
  modalStep2Area: string;
  modalStep2Multiplier: string;
  modalFinalEquation: string;
  modalRateLabel: string;
  modalDimensions: string;
  modalCalculatedArea: string;
  modalUnitPrice: string;
  modalEditableHint: string;
  modalAddToQuote: string;
  modalAdded: string;
  modalCopyText: string;
  modalCopiedText: string;

  // Quotation Sheet & List Modal
  quoteHubTitle: string;
  tabActiveItems: string;
  tabCloudRecords: string;
  clearAllItems: string;
  emptyQuotePrompt: string;
  quickAddPresets: string;
  customItemSection: string;
  customItemName: string;
  customItemPrice: string;
  customItemQty: string;
  btnAddCustom: string;
  clientInfoTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientContact: string;
  docNoLabel: string;
  docTypeQuote: string;
  docTypeInvoice: string;
  docTypeReceipt: string;
  subtotal: string;
  discount: string;
  grandTotal: string;
  depositPaid: string;
  balanceDue: string;
  btnExportPdf: string;
  btnQuotePdf: string;
  btnInvoicePdf: string;
  btnReceiptPdf: string;
  btnSendWhatsApp: string;
  btnCopyQuotation: string;
  btnSaveToCloud: string;
  savedToCloudSuccess: string;

  // Shape Modal
  shapeModalTitle: string;
  shapeDaylight: string;
  shapeNight: string;
  shapeLightsOff: string;
  shapeHumanScale: string;
  shapeAspectRatio: string;
  shapeRealDimensions: string;
  shapeClose: string;

  // Math Calculator
  mathCalcTitle: string;
  mathCalcHistory: string;
  mathCalcClear: string;

  // Additional Quotation & Toolbar keys
  appName: string;
  dimensions: string;
  width: string;
  height: string;
  activeTab: string;
  cloudTab: string;
  cloudSaving: string;
  save: string;
  hideForm: string;
  addCustom: string;
  customItemDescPlaceholder: string;
  quickPresets: string;
  widthLabel: string;
  heightLabel: string;
  quantityLabel: string;
  priceLabel: string;
  addItem: string;
  emptyQuoteTitle: string;
  emptyQuoteDesc: string;
  textPreview: string;
  quotePDF: string;
  invoicePDF: string;
}

export const translations: Record<LanguageType, Translations> = {
  en: {
    appName: 'Halo Design Hub',
    dimensions: 'Dimensions',
    width: 'Width',
    height: 'Height',
    activeTab: 'Active',
    cloudTab: 'Cloud',
    cloudSaving: 'Saving...',
    save: 'Save',
    hideForm: 'Hide',
    addCustom: 'Custom',
    customItemDescPlaceholder: 'Item description or select preset...',
    quickPresets: 'Quick Presets',
    widthLabel: 'Width',
    heightLabel: 'Height',
    quantityLabel: 'Quantity',
    priceLabel: 'Price',
    addItem: 'Add Item',
    emptyQuoteTitle: 'Quotation Sheet is Empty',
    emptyQuoteDesc: 'Click any pricing card on the desktop, use quick presets above, or add a custom item.',
    textPreview: 'Text Preview',
    quotePDF: 'Quote PDF',
    invoicePDF: 'Invoice PDF',
    appTitle: 'Halo Design Hub',
    quotationSheet: 'Quotation Sheet',
    installApp: 'Install App (iOS / Android)',
    calculator: 'Calculator',
    shapeInspector: 'Shape',
    itemsUnit: 'items',
    signInWithGoogle: 'Sign in with Google',
    signedInAs: 'Signed in as',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    language: 'Language',
    langName: 'English',
    langShort: 'EN',
    switchToLang: 'Switch to Chinese (中文)',

    dockQuotes: 'Quotes',
    dockCloud: 'Cloud',
    dockLogin: 'Login',
    dockCalc: 'Calc',
    dockShape: 'Shape',
    dockWallpaper: 'Wallpaper',
    dockDark: 'Dark',
    dockLight: 'Light',
    dockLang: '中文',
    dockLangTitle: 'Switch to Chinese / 切换至中文',

    calcWindowTitle: 'Calculator',
    dimLabel: 'DIM:',
    widthPlaceholder: 'Width',
    heightPlaceholder: 'Height',
    resetRates: 'Reset Rates',
    resetRatesTooltip: 'Reset all rates to defaults',
    shapeHorizontal: 'Horizontal',
    shapeVertical: 'Vertical',
    shapeSquare: 'Square',
    shapeCustom: 'Custom',
    shapeInspectTooltip: 'Lightbox Shape Inspector - Click to inspect',

    cardLightbox: 'LIGHTBOX',
    cardLightboxBacklit: 'LIGHTBOX W BACKLIT',
    cardBacklit: 'BACKLIT',
    cardTrans: 'TRANS',
    card3dPrinted: '3D PRINTED',
    cardVinylSticker: 'VINYL STICKER',
    cardLedStrip: 'LED STRIP',
    cardAcrylic: 'ACRYLIC',
    sqFtUnit: '/SQ FT',
    ftUnit: '/FT',
    clickToEditRate: 'Click to edit rate',
    clickToInspect: 'Click to inspect calculation and add to quote',

    modalSpecTitle: 'Signage Spec & Quotation',
    modalSignageSpec: 'Signage Spec',
    modalItemTitlePlaceholder: 'Signage item title',
    modalMathFormula: 'Mathematical Formula',
    modalCopyFormula: 'Copy Formula',
    modalCopied: 'Copied',
    modalLedStripRule: 'LED Strip Rule: (Width in ÷ 39) × (Height in ÷ 5) × Rate ($/ft)',
    modalStandardAreaRule: 'Standard Area Rule: Width (ft) × Height (ft) × Rate ($/sq ft)',
    modalStep1Conversion: '1. Size & Unit Conversion',
    modalStep1Input: 'Input:',
    modalStep2Area: '2. Calculated Area',
    modalStep2Multiplier: '2. Module Multiplier',
    modalFinalEquation: 'Final Equation',
    modalRateLabel: 'Rate:',
    modalDimensions: 'Dimensions',
    modalCalculatedArea: 'Calculated Area',
    modalUnitPrice: 'Unit Price ($)',
    modalEditableHint: 'Editable before adding',
    modalAddToQuote: 'Add to Quote',
    modalAdded: 'Added',
    modalCopyText: 'Copy Text',
    modalCopiedText: 'Copied!',

    quoteHubTitle: 'Quotation & Invoice Hub',
    tabActiveItems: 'Active Items',
    tabCloudRecords: 'Cloud Records',
    clearAllItems: 'Clear All',
    emptyQuotePrompt: 'No items in quotation yet. Click any pricing card or use quick add below.',
    quickAddPresets: 'Quick Add Preset Items',
    customItemSection: 'Add Custom Item',
    customItemName: 'Item Description / Name',
    customItemPrice: 'Price ($)',
    customItemQty: 'Qty',
    btnAddCustom: 'Add to Sheet',
    clientInfoTitle: 'Client & Project Details',
    clientName: 'Client Name',
    clientPhone: 'Phone / WhatsApp',
    clientEmail: 'Email Address',
    clientAddress: 'Site Address',
    clientContact: 'Attn / Contact Person',
    docNoLabel: 'Doc No / Quote #',
    docTypeQuote: 'Quotation',
    docTypeInvoice: 'Tax Invoice',
    docTypeReceipt: 'Receipt',
    subtotal: 'Subtotal',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    depositPaid: 'Deposit Paid',
    balanceDue: 'Balance Due',
    btnExportPdf: 'Export PDF',
    btnQuotePdf: 'Quotation PDF',
    btnInvoicePdf: 'Tax Invoice PDF',
    btnReceiptPdf: 'Receipt PDF',
    btnSendWhatsApp: 'WhatsApp',
    btnCopyQuotation: 'Copy Text',
    btnSaveToCloud: 'Save to Cloud',
    savedToCloudSuccess: 'Saved to Google Account successfully!',

    shapeModalTitle: 'Lightbox Proportion & Scale Inspector',
    shapeDaylight: 'Daylight',
    shapeNight: 'Night Glow',
    shapeLightsOff: 'Lights Off',
    shapeHumanScale: 'Human Scale (1.75m)',
    shapeAspectRatio: 'Aspect Ratio',
    shapeRealDimensions: 'Real-World Dimensions',
    shapeClose: 'Close',

    mathCalcTitle: 'iOS Calculator',
    mathCalcHistory: 'History',
    mathCalcClear: 'AC',
  },
  zh: {
    appName: 'Halo 标识设计中心',
    dimensions: '工程尺寸',
    width: '宽度',
    height: '高度',
    activeTab: '清单明细',
    cloudTab: '云端归档',
    cloudSaving: '正在归档...',
    save: '保存',
    hideForm: '收起',
    addCustom: '自定义项',
    customItemDescPlaceholder: '输入项目描述或从右侧选择常用预设...',
    quickPresets: '常用预设',
    widthLabel: '宽度',
    heightLabel: '高度',
    quantityLabel: '数量',
    priceLabel: '价格',
    addItem: '添加项目',
    emptyQuoteTitle: '当前报价单暂无项目',
    emptyQuoteDesc: '点击桌面任意定价卡片、使用上方快速预设或添加自定义施工项目。',
    textPreview: '文本预览',
    quotePDF: '报价单 PDF',
    invoicePDF: '税务发票 PDF',
    appTitle: 'Halo 标识设计中心',
    quotationSheet: '报价清单',
    installApp: '安装应用 (iOS / 安卓)',
    calculator: '计算器',
    shapeInspector: '形状比例',
    itemsUnit: '项',
    signInWithGoogle: 'Google 账号登录',
    signedInAs: '已登录:',
    themeDark: '深色模式',
    themeLight: '浅色模式',
    language: '语言',
    langName: '中文',
    langShort: '中',
    switchToLang: '切换为英文 (English)',

    dockQuotes: '报价单',
    dockCloud: '云同步',
    dockLogin: '登录',
    dockCalc: '计算器',
    dockShape: '形状比例',
    dockWallpaper: '壁纸',
    dockDark: '深色',
    dockLight: '浅色',
    dockLang: 'EN',
    dockLangTitle: 'Switch to English / 切换至英文',

    calcWindowTitle: '价格计算器',
    dimLabel: '尺寸:',
    widthPlaceholder: '宽度',
    heightPlaceholder: '高度',
    resetRates: '重置单价',
    resetRatesTooltip: '将所有广告材质单价恢复为默认值',
    shapeHorizontal: '横版',
    shapeVertical: '竖版',
    shapeSquare: '正方形',
    shapeCustom: '自定义',
    shapeInspectTooltip: '灯箱形状比例检查器 - 点击预览',

    cardLightbox: '超薄灯箱',
    cardLightboxBacklit: '背发光灯箱',
    cardBacklit: '背发光字',
    cardTrans: '内发光字',
    card3dPrinted: '3D打印发光字',
    cardVinylSticker: '户外车贴/贴纸',
    cardLedStrip: 'LED灯带',
    cardAcrylic: '亚克力标识',
    sqFtUnit: '/平方尺',
    ftUnit: '/英尺',
    clickToEditRate: '点击直接修改单价',
    clickToInspect: '点击查看计算明细并加入报价单',

    modalSpecTitle: '广告标识规格与报价',
    modalSignageSpec: '标识规格明细',
    modalItemTitlePlaceholder: '标识项目名称',
    modalMathFormula: '数学计算公式',
    modalCopyFormula: '复制公式',
    modalCopied: '已复制',
    modalLedStripRule: 'LED灯带公式: (宽英寸 ÷ 39) × (高英寸 ÷ 5) × 单价 ($/英尺)',
    modalStandardAreaRule: '常规面积公式: 宽(英尺) × 高(英尺) × 单价 ($/平方尺)',
    modalStep1Conversion: '1. 尺寸与单位换算',
    modalStep1Input: '输入尺寸:',
    modalStep2Area: '2. 计算面积',
    modalStep2Multiplier: '2. 模块倍率',
    modalFinalEquation: '最终计算公式',
    modalRateLabel: '单价:',
    modalDimensions: '规格尺寸',
    modalCalculatedArea: '计算面积',
    modalUnitPrice: '单价 ($)',
    modalEditableHint: '加入报价前可直接修改单价',
    modalAddToQuote: '加入报价单',
    modalAdded: '已加入',
    modalCopyText: '复制报价文本',
    modalCopiedText: '已复制!',

    quoteHubTitle: '报价单与账单中心',
    tabActiveItems: '当前报价明细',
    tabCloudRecords: '云端归档记录',
    clearAllItems: '清空全部',
    emptyQuotePrompt: '当前报价单暂无项目。点击主页材质卡片或使用下方快捷预设添加。',
    quickAddPresets: '快捷添加常用施工项目',
    customItemSection: '添加自定义项目',
    customItemName: '项目名称 / 规格说明',
    customItemPrice: '单价 ($)',
    customItemQty: '数量',
    btnAddCustom: '加入清单',
    clientInfoTitle: '客户与工程信息',
    clientName: '客户姓名 / 公司',
    clientPhone: '电话 / WhatsApp',
    clientEmail: '电子邮箱',
    clientAddress: '安装地址 / 现场',
    clientContact: '联系人',
    docNoLabel: '单号 / 报价编号',
    docTypeQuote: '正式报价单 (Quote)',
    docTypeInvoice: '税务发票 (Invoice)',
    docTypeReceipt: '收据 (Receipt)',
    subtotal: '项目小计',
    discount: '折扣优惠',
    grandTotal: '最终总额',
    depositPaid: '已付定金',
    balanceDue: '结欠余款',
    btnExportPdf: '导出 PDF',
    btnQuotePdf: '报价单 PDF',
    btnInvoicePdf: '税务发票 PDF',
    btnReceiptPdf: '收据 PDF',
    btnSendWhatsApp: '发至 WhatsApp',
    btnCopyQuotation: '复制文本',
    btnSaveToCloud: '保存到云端',
    savedToCloudSuccess: '已成功归档至 Google 云端账号！',

    shapeModalTitle: '灯箱比例预览与真实人体参照',
    shapeDaylight: '日间效果',
    shapeNight: '夜间发光',
    shapeLightsOff: '熄灯外观',
    shapeHumanScale: '人体参照 (1.75米)',
    shapeAspectRatio: '长宽比例',
    shapeRealDimensions: '实际工程尺寸',
    shapeClose: '关闭',

    mathCalcTitle: '科学计算器',
    mathCalcHistory: '历史记录',
    mathCalcClear: '清除',
  },
};

export const getTranslation = (lang?: LanguageType | string): Translations => {
  if (lang === 'zh') {
    return translations.zh;
  }
  return translations.en;
};
