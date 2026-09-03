import { Unit, UnitType, RatesConfig } from '../types';
import { CM_PER_INCH, MM_PER_INCH, INCHES_PER_FOOT, LED_STRIP_DIVISOR_W, LED_STRIP_DIVISOR_H, DEFAULT_RATES } from '../data/presets';

export const convertToInches = (value: number, unit: UnitType): number => {
  switch (unit) {
    case Unit.IN: return value;
    case Unit.FT: return value * INCHES_PER_FOOT;
    case Unit.CM: return value / CM_PER_INCH;
    case Unit.MM: return value / MM_PER_INCH;
    case Unit.M: return (value * 100) / CM_PER_INCH;
    default: return 0;
  }
};

export const convertFromInches = (valueInches: number, targetUnit: UnitType): number => {
  switch (targetUnit) {
    case Unit.FT: return valueInches / INCHES_PER_FOOT;
    case Unit.CM: return valueInches * CM_PER_INCH;
    case Unit.MM: return valueInches * MM_PER_INCH;
    case Unit.M: return (valueInches * CM_PER_INCH) / 100;
    case Unit.IN: return valueInches;
    default: return valueInches;
  }
};

export interface CalculatedResults {
  areaSqFt: number;
  prices: {
    lightbox: number;
    lightboxBacklit: number;
    backlit: number;
    trans: number;
    printed3d: number;
    vinylSticker: number;
    ledStrip: number;
    acrylic: number;
  };
  dimensions: {
    w_in: number;
    h_in: number;
    w_ft: number;
    h_ft: number;
    w_cm: number;
    h_cm: number;
    w_mm: number;
    h_mm: number;
    w_m: number;
    h_m: number;
  };
}

export const calculatePrices = (
  widthVal: number,
  heightVal: number,
  unit: UnitType,
  customRates: RatesConfig = DEFAULT_RATES
): CalculatedResults => {
  const RATES_USE = customRates || DEFAULT_RATES;

  if (widthVal <= 0 || heightVal <= 0) {
    return {
      areaSqFt: 0,
      prices: {
        lightbox: 0,
        lightboxBacklit: 0,
        backlit: 0,
        trans: 0,
        printed3d: 0,
        vinylSticker: 0,
        ledStrip: 0,
        acrylic: 0,
      },
      dimensions: { w_in: 0, h_in: 0, w_ft: 0, h_ft: 0, w_cm: 0, h_cm: 0, w_mm: 0, h_mm: 0, w_m: 0, h_m: 0 }
    };
  }

  const w_in = convertToInches(widthVal, unit);
  const h_in = convertToInches(heightVal, unit);

  const w_ft = convertFromInches(w_in, Unit.FT);
  const h_ft = convertFromInches(h_in, Unit.FT);

  const w_cm = convertFromInches(w_in, Unit.CM);
  const h_cm = convertFromInches(h_in, Unit.CM);

  const w_mm = convertFromInches(w_in, Unit.MM);
  const h_mm = convertFromInches(h_in, Unit.MM);

  const w_m = convertFromInches(w_in, Unit.M);
  const h_m = convertFromInches(h_in, Unit.M);

  const areaSqFt = w_ft * h_ft;

  return {
    areaSqFt,
    prices: {
      lightbox: areaSqFt * (RATES_USE.LIGHTBOX !== undefined ? RATES_USE.LIGHTBOX : 50),
      lightboxBacklit: areaSqFt * (RATES_USE.LIGHTBOX_W_BACKLIT !== undefined ? RATES_USE.LIGHTBOX_W_BACKLIT : 85),
      backlit: areaSqFt * (RATES_USE.BACKLIT !== undefined ? RATES_USE.BACKLIT : 35),
      trans: areaSqFt * (RATES_USE.TRANS !== undefined ? RATES_USE.TRANS : 45),
      printed3d: areaSqFt * (RATES_USE.PRINTED_3D !== undefined ? RATES_USE.PRINTED_3D : 120),
      vinylSticker: areaSqFt * (RATES_USE.VINYL_STICKER !== undefined ? RATES_USE.VINYL_STICKER : 20),
      ledStrip: (w_in / LED_STRIP_DIVISOR_W) * (h_in / LED_STRIP_DIVISOR_H) * (RATES_USE.LED_STRIP !== undefined ? RATES_USE.LED_STRIP : 17),
      acrylic: areaSqFt * (RATES_USE.ACRYLIC !== undefined ? RATES_USE.ACRYLIC : 15),
    },
    dimensions: { w_in, h_in, w_ft, h_ft, w_cm, h_cm, w_mm, h_mm, w_m, h_m }
  };
};
