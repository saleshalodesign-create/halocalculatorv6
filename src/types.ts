export const Unit = {
  IN: 'in',
  FT: 'ft',
  CM: 'cm',
  MM: 'mm',
  M: 'm',
} as const;

export type UnitType = typeof Unit[keyof typeof Unit];

export const Theme = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;

export type ThemeType = typeof Theme[keyof typeof Theme];

export const Language = {
  EN: 'en',
  ZH: 'zh',
} as const;

export type LanguageType = typeof Language[keyof typeof Language];

export interface RatesConfig {
  LIGHTBOX: number;
  LIGHTBOX_W_BACKLIT: number;
  BACKLIT: number;
  TRANS: number;
  PRINTED_3D: number;
  VINYL_STICKER: number;
  LED_STRIP: number;
  ACRYLIC: number;
  [key: string]: number;
}

export interface QuoteItem {
  id: string;
  title: string;
  totalPrice: number;
  quantity: number;
  widthInches: number;
  heightInches: number;
  unit: UnitType;
  originalWidth: number;
  originalHeight: number;
  colorTheme?: string;
  timestamp?: number;
  rate?: number;
  rateUnit?: string;
  priceKey?: string;
}

export interface QuoteRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  docNo: string;
  customerName: string;
  customerAddress?: string;
  contact?: string;
  customerPhone?: string;
  customerEmail?: string;
  docType?: 'quote' | 'invoice' | 'receipt';
  deposit?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  bankDetails?: string;
  showSizes?: boolean;
  discountType?: 'none' | 'percent' | 'fixed';
  discountValue?: number;
  grandTotal: number;
  discountAmount: number;
  finalTotal: number;
  items: QuoteItem[];
  createdAt?: number;
  updatedAt?: number;
  dateFormatted?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}
