export type AssetCategory = 'FIAT' | 'COMMODITY' | 'TURKISH_GOLD';

export type EntryType = 'asset' | 'debt' | 'receivable';

export type AssetType = 
  | 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD' | 'NOK' | 'SEK' | 'DKK'
  | 'XAU' | 'XAG' | 'XPT' | 'XPD' | 'XCU'
  | 'HAS_GOLD' | 'GRAM_GOLD' | '22K_GOLD' | '14K_GOLD'
  | 'QUARTER_GOLD' | 'HALF_GOLD' | 'FULL_GOLD' 
  | 'REPUBLIC_GOLD' | 'GREMSE_GOLD' | 'RESAT_GOLD'
  | 'SILVER_GRAM' | 'PLATINUM_GRAM' | 'PALLADIUM_GRAM' | 'COPPER_GRAM';

export type TransactionType = 'ALIM' | 'SATIM';

export interface Purchase {
  id: string;
  purchaseDate: string;
  purchasePriceTRY: number;
  quantity: number;
  createdAt: number;
  transactionType?: TransactionType;
}

export interface AssetPortfolio {
  id: string;
  assetType: AssetType;
  category: AssetCategory;
  entryType: EntryType;
  history: Purchase[];
}

export interface MarketPrice {
  assetType: AssetType;
  priceTRY: number;
  lastUpdated: number;
}

export const ASSET_LABELS: Record<AssetType, string> = {
  TRY: 'Türk Lirası (TL)',
  USD: 'ABD Doları',
  EUR: 'Euro',
  GBP: 'İngiliz Sterlini',
  CHF: 'İsviçre Frangı',
  JPY: 'Japon Yeni',
  CAD: 'Kanada Doları',
  AUD: 'Avustralya Doları',
  NOK: 'Norveç Kronu',
  SEK: 'İsveç Kronu',
  DKK: 'Danimarka Kronu',
  XAU: 'Altın (Küresel)',
  XAG: 'Gümüş (Küresel)',
  XPT: 'Platin (Küresel)',
  XPD: 'Paladyum (Küresel)',
  XCU: 'Bakır (Küresel)',
  HAS_GOLD: 'Has Altın (24K)',
  GRAM_GOLD: 'Gram Altın',
  '22K_GOLD': '22 Ayar Bilezik',
  '14K_GOLD': '14 Ayar Altın',
  QUARTER_GOLD: 'Çeyrek Altın',
  HALF_GOLD: 'Yarım Altın',
  FULL_GOLD: 'Tam Altın (Ziynet)',
  REPUBLIC_GOLD: 'Cumhuriyet Altını (Ata)',
  GREMSE_GOLD: 'Gremse Altın (2.5\'luk)',
  RESAT_GOLD: 'Reşat Altın',
  SILVER_GRAM: 'Gümüş (Gram)',
  PLATINUM_GRAM: 'Platin (Gram)',
  PALLADIUM_GRAM: 'Paladyum (Gram)',
  COPPER_GRAM: 'Bakır (Gram)',
};
