import { AssetType } from '../types';

/**
 * Professional Financial Market Service
 * 
 * This service provides live fiat and commodity prices for a Turkish financial context.
 * It prioritizes official financial APIs (CollectAPI, Metals-API) over crypto exchanges.
 */

// API Endpoints
const COLLECT_API_GOLD = 'https://api.collectapi.com/economy/goldPrice';
const COLLECT_API_CURRENCY = 'https://api.collectapi.com/economy/allCurrency';
const EXCHANGERATE_API = 'https://open.er-api.com/v6/latest/USD';

// 1 Troy Ounce = 31.1034768 Grams
const TROY_OUNCE = 31.1034768;

export interface MarketData {
  prices: Record<AssetType, number>;
  timestamp: number;
  isFallback: boolean;
  source: string;
}

// Fallback values in case APIs are completely unreachable
const FALLBACK_PRICES: Record<AssetType, number> = {
  USD: 32.5,
  EUR: 35.2,
  GBP: 41.1,
  CHF: 36.5,
  JPY: 0.21,
  CAD: 24.1,
  AUD: 21.5,
  NOK: 3.1,
  SEK: 3.1,
  DKK: 4.7,
  XAU: 2350,
  XAG: 28,
  XPT: 1050,
  XPD: 950,
  XCU: 0.3,
  HAS_GOLD: 2450,
  GRAM_GOLD: 2450,
  '22K_GOLD': 2250,
  '14K_GOLD': 1450,
  QUARTER_GOLD: 4050,
  HALF_GOLD: 8100,
  FULL_GOLD: 16200,
  REPUBLIC_GOLD: 16800,
  GREMSE_GOLD: 40500,
  RESAT_GOLD: 16800,
  SILVER_GRAM: 30,
  PLATINUM_GRAM: 1100,
  PALLADIUM_GRAM: 1000,
  COPPER_GRAM: 0.3,
};

/**
 * Professional fetch with retry and cache busting.
 * Only adds headers if an API key is provided to avoid CORS preflight issues on public endpoints.
 */
async function fetchFinancial(url: string, apiKey?: string, retries = 2): Promise<Response> {
  const ts = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${separator}nocache=${ts}`;
  
  const headers: HeadersInit = {};

  if (apiKey) {
    headers['authorization'] = `apikey ${apiKey}`;
    headers['content-type'] = 'application/json';
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(finalUrl, {
        method: 'GET',
        // Use cache: 'no-store' instead of headers for simple requests
        cache: 'no-store',
        headers: Object.keys(headers).length > 0 ? headers : undefined
      });
      
      if (response.ok) return response;
      
      console.warn(`Financial fetch attempt ${i + 1} failed for ${url}: ${response.status}`);
    } catch (e) {
      console.warn(`Financial fetch attempt ${i + 1} errored for ${url}:`, e);
      if (i === retries - 1) throw e;
    }
    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
  }
  throw new Error(`Failed to fetch financial data from ${url}`);
}

/**
 * Centralized calculation for Turkish Gold types (if not provided by API)
 */
function calculateTurkishGold(gramGoldTry: number) {
  const quarterGoldTry = gramGoldTry * 1.75 * 1.05; // 1.75g 22K + 5% premium
  const republicGoldTry = gramGoldTry * 7.216 * 0.916 * 1.02; // Ata (7.216g 22K) + 2% premium
  
  return {
    HAS_GOLD: gramGoldTry,
    GRAM_GOLD: gramGoldTry,
    '22K_GOLD': gramGoldTry * 0.916,
    '14K_GOLD': gramGoldTry * (14 / 24),
    QUARTER_GOLD: quarterGoldTry,
    HALF_GOLD: quarterGoldTry * 2,
    FULL_GOLD: quarterGoldTry * 4,
    REPUBLIC_GOLD: republicGoldTry,
    GREMSE_GOLD: quarterGoldTry * 10,
    RESAT_GOLD: republicGoldTry,
  };
}

export async function fetchMarketPrices(): Promise<MarketData> {
  const collectApiKey = import.meta.env.VITE_COLLECT_API_KEY;
  let source = 'CANLI PİYASA';
  let isFallback = false;

  try {
    let usdTry = FALLBACK_PRICES.USD;
    let rates: Record<string, number> = {};
    let goldPrices: Partial<Record<AssetType, number>> = {};
    let hasCollectApiGold = false;

    // 1. Try CollectAPI Currency
    if (collectApiKey) {
      try {
        const curRes = await fetchFinancial(COLLECT_API_CURRENCY, collectApiKey);
        const curData = await curRes.json();
        if (curData.success && curData.result) {
          curData.result.forEach((item: any) => {
            if (item.name === 'USD') usdTry = parseFloat(item.selling || item.buying);
            rates[item.name] = parseFloat(item.selling || item.buying);
          });
        }
      } catch (e) {
        console.warn('CollectAPI Currency fetch failed:', e);
      }
    }

    // 2. Fallback Fiat Fetch (ExchangeRate-API) - Only if CollectAPI currency failed
    if (Object.keys(rates).length === 0) {
      try {
        const erRes = await fetchFinancial(EXCHANGERATE_API);
        const erData = await erRes.json();
        if (erData.rates && erData.rates.TRY) {
          usdTry = erData.rates.TRY;
          rates = erData.rates;
          source = 'CANLI PİYASA (EXCHANGERATE)';
        }
      } catch (e) {
        console.warn('ExchangeRate-API fallback failed:', e);
      }
    }

    // 3. Try CollectAPI Gold (STRICT DIRECT MAPPING)
    if (collectApiKey) {
      try {
        const goldRes = await fetchFinancial(COLLECT_API_GOLD, collectApiKey);
        const goldData = await goldRes.json();
        if (goldData.success && goldData.result) {
          goldData.result.forEach((item: any) => {
            // Use 'selling' as strictly requested by user
            const price = parseFloat(item.selling);
            if (isNaN(price)) return;

            if (item.name === 'Gram Altın') goldPrices['GRAM_GOLD'] = price;
            if (item.name === 'Has Altın') goldPrices['HAS_GOLD'] = price;
            if (item.name === '22 Ayar Bilezik') goldPrices['22K_GOLD'] = price;
            if (item.name === '14 Ayar Altın') goldPrices['14K_GOLD'] = price;
            if (item.name === 'Çeyrek Altın') goldPrices['QUARTER_GOLD'] = price;
            if (item.name === 'Yarım Altın') goldPrices['HALF_GOLD'] = price;
            if (item.name === 'Tam Altın') goldPrices['FULL_GOLD'] = price;
            if (item.name === 'Ata Altın') goldPrices['REPUBLIC_GOLD'] = price;
            if (item.name === 'Gremse Altın') goldPrices['GREMSE_GOLD'] = price;
            if (item.name === 'Reşat Altın') goldPrices['RESAT_GOLD'] = price;
            if (item.name === 'Gümüş') goldPrices['SILVER_GRAM'] = price;
          });
          
          if (goldPrices['GRAM_GOLD']) {
            hasCollectApiGold = true;
            source = 'COLLECTAPI (KAPALIÇARŞI)';
          }
        }
      } catch (e) {
        console.warn('CollectAPI Gold fetch failed:', e);
      }
    }

    // 4. Global Commodity Logic (ONLY IF COLLECTAPI GOLD FAILED)
    if (!hasCollectApiGold) {
      const xauUsd = FALLBACK_PRICES.XAU;
      const gramGoldTry = (xauUsd / TROY_OUNCE) * usdTry;
      const calculatedGold = calculateTurkishGold(gramGoldTry);
      
      goldPrices = {
        ...goldPrices,
        ...calculatedGold,
        XAU: gramGoldTry,
        XAG: (xauUsd / 85 / TROY_OUNCE) * usdTry,
        XPT: (xauUsd / 2.2 / TROY_OUNCE) * usdTry,
        XPD: (xauUsd / 2.5 / TROY_OUNCE) * usdTry,
        XCU: (xauUsd / 8000 / TROY_OUNCE) * usdTry,
      };
    }

    // Final Price Mapping
    const prices: Record<AssetType, number> = {
      USD: usdTry,
      EUR: usdTry / (rates.EUR || (usdTry / FALLBACK_PRICES.EUR)),
      GBP: usdTry / (rates.GBP || (usdTry / FALLBACK_PRICES.GBP)),
      CHF: usdTry / (rates.CHF || (usdTry / FALLBACK_PRICES.CHF)),
      JPY: usdTry / (rates.JPY || (usdTry / FALLBACK_PRICES.JPY)),
      CAD: usdTry / (rates.CAD || (usdTry / FALLBACK_PRICES.CAD)),
      AUD: usdTry / (rates.AUD || (usdTry / FALLBACK_PRICES.AUD)),
      NOK: usdTry / (rates.NOK || (usdTry / FALLBACK_PRICES.NOK)),
      SEK: usdTry / (rates.SEK || (usdTry / FALLBACK_PRICES.SEK)),
      DKK: usdTry / (rates.DKK || (usdTry / FALLBACK_PRICES.DKK)),
      
      // Commodities
      XAU: goldPrices['GRAM_GOLD'] || (FALLBACK_PRICES.XAU / TROY_OUNCE) * usdTry,
      XAG: goldPrices['SILVER_GRAM'] || (FALLBACK_PRICES.XAG / TROY_OUNCE) * usdTry,
      XPT: (FALLBACK_PRICES.XPT / TROY_OUNCE) * usdTry,
      XPD: (FALLBACK_PRICES.XPD / TROY_OUNCE) * usdTry,
      XCU: (FALLBACK_PRICES.XCU / TROY_OUNCE) * usdTry,
      
      // Turkish Gold Types
      HAS_GOLD: goldPrices['HAS_GOLD'] || goldPrices['GRAM_GOLD'] || FALLBACK_PRICES.HAS_GOLD,
      GRAM_GOLD: goldPrices['GRAM_GOLD'] || FALLBACK_PRICES.GRAM_GOLD,
      '22K_GOLD': goldPrices['22K_GOLD'] || FALLBACK_PRICES['22K_GOLD'],
      '14K_GOLD': goldPrices['14K_GOLD'] || FALLBACK_PRICES['14K_GOLD'],
      QUARTER_GOLD: goldPrices['QUARTER_GOLD'] || FALLBACK_PRICES.QUARTER_GOLD,
      HALF_GOLD: goldPrices['HALF_GOLD'] || FALLBACK_PRICES.HALF_GOLD,
      FULL_GOLD: goldPrices['FULL_GOLD'] || FALLBACK_PRICES.FULL_GOLD,
      REPUBLIC_GOLD: goldPrices['REPUBLIC_GOLD'] || FALLBACK_PRICES.REPUBLIC_GOLD,
      GREMSE_GOLD: goldPrices['GREMSE_GOLD'] || FALLBACK_PRICES.GREMSE_GOLD,
      RESAT_GOLD: goldPrices['RESAT_GOLD'] || FALLBACK_PRICES.RESAT_GOLD,
      
      SILVER_GRAM: goldPrices['SILVER_GRAM'] || FALLBACK_PRICES.SILVER_GRAM,
      PLATINUM_GRAM: (FALLBACK_PRICES.XPT / TROY_OUNCE) * usdTry,
      PALLADIUM_GRAM: (FALLBACK_PRICES.XPD / TROY_OUNCE) * usdTry,
      COPPER_GRAM: (FALLBACK_PRICES.XCU / TROY_OUNCE) * usdTry,
    };

    return {
      prices,
      timestamp: Date.now(),
      isFallback: false,
      source
    };
  } catch (error) {
    console.error('Critical Market Service Error:', error);
    return {
      prices: FALLBACK_PRICES,
      timestamp: Date.now(),
      isFallback: true,
      source: 'CANLI PİYASA (FALLBACK)'
    };
  }
}
