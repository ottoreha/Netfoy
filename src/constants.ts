import { AssetPortfolio } from './types';

export const MOCK_INVESTMENTS: AssetPortfolio[] = [
  {
    id: 'usd-portfolio',
    assetType: 'USD',
    category: 'FIAT',
    entryType: 'asset',
    history: [
      {
        id: '1',
        purchaseDate: '2024-01-15',
        purchasePriceTRY: 30.15,
        quantity: 1000,
        createdAt: Date.now() - 1000000,
      }
    ]
  },
  {
    id: 'gram-gold-portfolio',
    assetType: 'GRAM_GOLD',
    category: 'TURKISH_GOLD',
    entryType: 'asset',
    history: [
      {
        id: '2',
        purchaseDate: '2024-02-10',
        purchasePriceTRY: 2050.00,
        quantity: 10,
        createdAt: Date.now() - 500000,
      }
    ]
  },
  {
    id: 'quarter-gold-portfolio',
    assetType: 'QUARTER_GOLD',
    category: 'TURKISH_GOLD',
    entryType: 'asset',
    history: [
      {
        id: '3',
        purchaseDate: '2024-03-01',
        purchasePriceTRY: 3500.00,
        quantity: 2,
        createdAt: Date.now() - 200000,
      }
    ]
  }
];

// Mock market prices for initial UI
export const MOCK_MARKET_PRICES: Record<string, number> = {
  USD: 32.45,
  EUR: 35.12,
  GBP: 41.05,
  CHF: 36.20,
  XAU: 2350.00, // USD
  XAG: 28.50, // USD
  XPT: 950.00, // USD
  GRAM_GOLD: 2450.00,
  '22K_GOLD': 2250.00,
  QUARTER_GOLD: 4050.00,
};
