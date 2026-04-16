import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, Trash2, Calendar, DollarSign, Euro, PoundSterling, SwissFranc, Gem, Coins, Circle, Diamond, History, RefreshCw, Loader2, Activity, Settings, Clock, Check, Sun, Moon, ListFilter, ChevronDown, Sparkles, X, Pencil, Coffee, Leaf, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Toaster, toast } from 'sonner';
import { AssetPortfolio, Purchase, AssetType, AssetCategory, ASSET_LABELS, EntryType, TransactionType } from './types';
import { cn, formatCurrency, formatPercent, formatDate } from './lib/utils';
import { fetchMarketPrices } from './services/marketService';
import { analyzePortfolioWithAI, AIAnalysisResult } from './services/aiService';
import { translations, Language } from './i18n';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';
import { ZakatPlanner } from './components/ZakatPlanner';

const StepperInput = ({ value, onChange, label, step = 1, min = 0, placeholder }: { 
  value: string; 
  onChange: (val: string) => void; 
  label: string; 
  step?: number; 
  min?: number;
  placeholder?: string;
}) => {
  const handleIncrement = () => {
    const current = parseFloat(value) || 0;
    onChange((current + step).toString());
  };

  const handleDecrement = () => {
    const current = parseFloat(value) || 0;
    onChange(Math.max(min, current - step).toString());
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">{label}</label>
      <div className="flex items-center justify-between w-full bg-bg-tertiary/50 border border-border-primary rounded-2xl overflow-hidden focus-within:border-accent-primary/50 transition-all group h-14">
        <button 
          type="button"
          onClick={handleDecrement}
          className="h-full px-5 text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary transition-all active:scale-90 flex items-center justify-center shrink-0"
        >
          <Minus size={18} />
        </button>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9.,]*"
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(',', '.');
            // Only allow numbers and a single decimal point
            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
              onChange(val);
            }
          }}
          placeholder={placeholder}
          className="flex-1 w-full bg-transparent text-center font-bold text-base md:text-lg focus:outline-none placeholder:text-text-secondary/30 h-full"
        />
        <button 
          type="button"
          onClick={handleIncrement}
          className="h-full px-5 text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary transition-all active:scale-90 flex items-center justify-center shrink-0"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

const Tooltip = ({ children, text, side = 'bottom' }: { children: React.ReactNode; text: string; side?: 'top' | 'bottom' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: side === 'bottom' ? 5 : -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'bottom' ? 5 : -5, scale: 0.95 }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-bg-secondary border border-border-primary rounded-xl text-[10px] font-bold text-text-primary whitespace-nowrap shadow-2xl z-[100] pointer-events-none backdrop-blur-md min-h-fit",
              side === 'bottom' ? "top-full mt-2" : "bottom-full mb-2"
            )}
          >
            {text}
            <div className={cn(
              "absolute left-1/2 -translate-x-1/2 border-4 border-transparent",
              side === 'bottom' ? "bottom-full border-b-border-primary" : "top-full border-t-border-primary"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ErrorFallback = ({ language }: { language: string }) => {
  const isTr = language === 'tr';
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-red-500/5">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-bg-secondary border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
          <AlertTriangle className="text-red-500 w-12 h-12 relative z-10" />
        </div>
        <h2 className="text-2xl font-black text-text-primary mb-3">
          {isTr ? 'Bir Şeyler Ters Gitti' : 'Something Went Wrong'}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          {isTr 
            ? 'Uygulama yüklenirken bir sorun oluştu. Merak etmeyin, verileriniz güvende.' 
            : 'An error occurred while loading the application. Don\'t worry, your data is safe.'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} />
          {isTr ? 'Sayfayı Yeniden Yükle' : 'Reload Page'}
        </button>
      </motion.div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode; language: string }, { hasError: boolean }> {
  public state: { hasError: boolean };
  public props: { children: React.ReactNode; language: string };

  constructor(props: { children: React.ReactNode; language: string }) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback language={this.props.language} />;
    }
    return this.props.children;
  }
}

const CustomTooltip = ({ active, payload, label, language }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Safely parse percentage from custom data.percentage or recharts data.percent
    const rawVal = data.percentage !== undefined ? data.percentage : (data.percent ? data.percent * 100 : 0);
    const num = Number(rawVal);
    const safePercentNum = isNaN(num) ? 0 : num;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-bg-secondary/90 backdrop-blur-xl border border-border-primary rounded-2xl p-4 shadow-2xl min-w-[160px]"
      >
        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 border-b border-border-primary pb-2">
          {label || data.name}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase">{language === 'tr' ? 'Değer' : 'Value'}</span>
            <span className="text-xs font-bold text-text-primary">{formatCurrency(data.value)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase">{language === 'tr' ? 'Pay' : 'Share'}</span>
            <span className="text-xs font-bold text-accent-primary">%{safePercentNum.toFixed(1)}</span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

export default function App() {
  const [investments, setInvestments] = useState<AssetPortfolio[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [marketSource, setMarketSource] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisModalTab, setAnalysisModalTab] = useState<'AI' | 'ZAKAT'>('AI');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'ALL'>('ALL');

  // AI Analysis State
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    const saved = localStorage.getItem('netfoy_auto_refresh');
    return saved ? JSON.parse(saved) : false;
  });
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('netfoy_refresh_interval');
    return saved ? JSON.parse(saved) : 30;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'VALUE' | 'PERFORMANCE_BEST' | 'PERFORMANCE_WORST' | 'NEWEST'>('VALUE');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isRatesPanelOpen, setIsRatesPanelOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'ANALYSIS'>('PORTFOLIO');
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('netfoy_language');
    return (saved as Language) || 'tr';
  });
  const t = translations[language];

  // Helper to safely get translated asset display name handling legacy names from localStorage
  const getAssetDisplayName = (assetType: unknown, assetName?: string) => {
    // 1. Prioritize direct i18n map lookup by assetType
    if (assetType && t.assetsMap && (t.assetsMap as any)[assetType as string]) {
      return (t.assetsMap as any)[assetType as string];
    }
    
    // 2. Fallback to Legacy names directly translating them via English equivalents map
    if (assetName) {
      const legacyToKey: Record<string, string> = {
        'Türk Lirası (TL)': 'TRY',
        'ABD Doları': 'USD',
        'Euro': 'EUR',
        'İngiliz Sterlini': 'GBP',
        'İsviçre Frangı': 'CHF',
        'Japon Yeni': 'JPY',
        'Kanada Doları': 'CAD',
        'Avustralya Doları': 'AUD',
        'Norveç Kronu': 'NOK',
        'İsveç Kronu': 'SEK',
        'Danimarka Kronu': 'DKK',
        'Altın (Küresel)': 'XAU',
        'Gümüş (Küresel)': 'XAG',
        'Platin (Küresel)': 'XPT',
        'Paladyum (Küresel)': 'XPD',
        'Bakır (Küresel)': 'XCU',
        'Has Altın (24K)': 'HAS_GOLD',
        'Gram Altın': 'GRAM_GOLD',
        '22 Ayar Bilezik': '22K_GOLD',
        '14 Ayar Altın': '14K_GOLD',
        'Çeyrek Altın': 'QUARTER_GOLD',
        'Yarım Altın': 'HALF_GOLD',
        'Tam Altın (Ziynet)': 'FULL_GOLD',
        'Cumhuriyet Altını (Ata)': 'REPUBLIC_GOLD',
        'Gremse Altın (2.5\'luk)': 'GREMSE_GOLD',
        'Reşat Altın': 'RESAT_GOLD',
        'Gümüş (Gram)': 'SILVER_GRAM',
        'Platin (Gram)': 'PLATINUM_GRAM',
        'Paladyum (Gram)': 'PALLADIUM_GRAM',
        'Bakır (Gram)': 'COPPER_GRAM',
      };
      const key = legacyToKey[assetName];
      if (key && t.assetsMap && (t.assetsMap as any)[key]) {
        return (t.assetsMap as any)[key];
      }
      return assetName;
    }

    // 3. Fallback to constant ASSET_LABELS
    return ASSET_LABELS[assetType as AssetType] || assetType as string;
  };
  const [theme, setTheme] = useState<'dark' | 'kahve' | 'yesil'>(() => {
    const saved = localStorage.getItem('netfoy_theme');
    if (saved === 'cozy') return 'kahve'; // Migration
    if (saved === 'light') return 'kahve'; // Migration
    return (saved as 'dark' | 'kahve' | 'yesil') || 'yesil';
  });

  const [assetType, setAssetType] = useState<AssetType>('USD');
  const [entryType, setEntryType] = useState<EntryType>('asset');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState<TransactionType>('ALIM');

  const currentLivePrice = useMemo(() => {
    return marketPrices[assetType] || 0;
  }, [assetType, marketPrices]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'kahve', 'yesil');
    document.documentElement.classList.add(theme);
    localStorage.setItem('netfoy_theme', theme);
  }, [theme]);

  // Save language
  useEffect(() => {
    localStorage.setItem('netfoy_language', language);
  }, [language]);

  // Auto-refresh logic (Polling)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Always refresh once on mount (Service handles caching)
    refreshPrices();

    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        refreshPrices();
      }, refreshInterval * 60 * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshInterval]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('netfoy_auto_refresh', JSON.stringify(autoRefreshEnabled));
    localStorage.setItem('netfoy_refresh_interval', JSON.stringify(refreshInterval));
  }, [autoRefreshEnabled, refreshInterval]);

  // Scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const getAssetIcon = (type: AssetType) => {
    const iconSize = 18;
    
    // Custom Gold Bar (Külçe) SVG
    const GoldBarIcon = ({ className }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("w-5 h-5", className)}>
        <path d="M2 17h20L18 7H6L2 17z" fill="currentColor" fillOpacity="0.2" />
        <path d="M6 7l-4 10h20l-4-10H6z" />
        <path d="M7 11h10" opacity="0.5" />
        <path d="M8 14h8" opacity="0.5" />
      </svg>
    );

    // Custom Silver Bar (Külçe) SVG
    const SilverBarIcon = ({ className }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("w-5 h-5", className)}>
        <path d="M2 17h20L18 7H6L2 17z" fill="currentColor" fillOpacity="0.2" />
        <path d="M6 7l-4 10h20l-4-10H6z" />
        <path d="M7 11h10" opacity="0.5" />
        <path d="M8 14h8" opacity="0.5" />
      </svg>
    );

    switch (type) {
      case 'TRY': return <Coins size={iconSize} className="text-amber-600" />;
      case 'USD': return <DollarSign size={iconSize} className="text-profit-primary" />;
      case 'EUR': return <Euro size={iconSize} className="text-blue-500" />;
      case 'GBP': return <PoundSterling size={iconSize} className="text-indigo-500" />;
      case 'CHF': return <SwissFranc size={iconSize} className="text-rose-500" />;
      case 'XAU':
      case 'HAS_GOLD':
      case 'GRAM_GOLD':
      case '22K_GOLD':
      case '14K_GOLD':
      case 'QUARTER_GOLD':
      case 'HALF_GOLD':
      case 'FULL_GOLD':
      case 'REPUBLIC_GOLD':
      case 'GREMSE_GOLD':
      case 'RESAT_GOLD':
        return <GoldBarIcon className="text-amber-500" />;
      case 'XAG':
      case 'SILVER_GRAM':
        return <SilverBarIcon className="text-slate-400" />;
      case 'XPT':
      case 'PLATINUM_GRAM':
        return <Diamond size={iconSize} className="text-cyan-300" />;
      default:
        return <Wallet size={iconSize} className="text-accent-primary" />;
    }
  };

  // Load from LocalStorage
  useEffect(() => {
    // İsim güncellendi: netfoy_investments
    const saved = localStorage.getItem('netfoy_investments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Safety check: Ensure every investment has a history array (new structure)
        const isValid = Array.isArray(parsed) && parsed.every(item => Array.isArray(item.history));
        
        if (isValid) {
          setInvestments(parsed);
        } else {
          console.warn('Old data structure detected in localStorage. Resetting to defaults...');
          localStorage.removeItem('netfoy_investments');
          setInvestments([]);
        }
      } catch (e) {
        console.error('Failed to parse localStorage data:', e);
        setInvestments([]);
      }
    } else {
      setInvestments([]);
      localStorage.setItem('netfoy_investments', JSON.stringify([]));
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('netfoy_investments', JSON.stringify(investments));
    }
  }, [investments, isLoaded]);

  const refreshPrices = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchMarketPrices();
      setMarketPrices(data.prices);
      setLastUpdated(data.timestamp);
      setMarketSource(data.source);
      setIsFallback(data.isFallback);
      
      if (data.isFallback) {
        toast.warning(language === 'tr' ? 'Piyasa verileri alınamadı, varsayılan fiyatlar kullanılıyor.' : 'Market data could not be fetched, using fallback prices.');
      }
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      toast.error(t.dataUpdateFailed);
    } finally {
      setIsRefreshing(false);
    }
  };

  const runAIAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisModalTab('AI');
    setIsAnalysisModalOpen(true);
    
    try {
      // Small delay for better UX transition
      await new Promise(r => setTimeout(r, 400));
      
      const result = await analyzePortfolioWithAI({
        assets: investments,
        stats: {
          totalCost: portfolioStats.totalCost,
          currentValue: portfolioStats.currentValue,
          totalPL: portfolioStats.totalPL,
          totalPLPercent: portfolioStats.totalPLPercent,
        }
      });
      setAnalysis(result);
      if (!process.env.GEMINI_API_KEY) {
        toast.info(language === 'tr' ? 'Demo verileri gösteriliyor (API Anahtarı eksik).' : 'Showing demo data (API Key missing).');
      } else {
        toast.success(language === 'tr' ? 'Yapay Zeka Analizi tamamlandı!' : 'AI Analysis completed!');
      }
    } catch (error) {
      console.error(error);
      setAnalysisError(error instanceof Error ? error.message : "Analiz başarısız oldu.");
      toast.error(language === 'tr' ? 'Yapay Zeka Analizi başarısız oldu.' : 'AI Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || (assetType !== 'TRY' && !purchasePrice) || !purchaseDate) {
      toast.error(t.fillAllFields);
      return;
    }

    const finalPurchasePrice = assetType === 'TRY' ? 1 : parseFloat(purchasePrice);
    const finalQuantity = transactionType === 'SATIM' ? -Math.abs(parseFloat(quantity)) : Math.abs(parseFloat(quantity));

    const category: AssetCategory = 
      ['TRY', 'USD', 'EUR', 'GBP', 'CHF'].includes(assetType) ? 'FIAT' :
      ['XAU', 'XAG', 'XPT'].includes(assetType) ? 'COMMODITY' : 'TURKISH_GOLD';

    if (editingAssetId && editingPurchaseId) {
      setInvestments(prev => prev.map(asset => {
        if (asset.id === editingAssetId) {
          const newHistory = (asset.history || []).map(p => 
            p.id === editingPurchaseId 
              ? { ...p, purchaseDate, purchasePriceTRY: finalPurchasePrice, quantity: finalQuantity, transactionType }
              : p
          );
          return { ...asset, history: newHistory };
        }
        return asset;
      }));
      toast.success(language === 'tr' ? 'Başarıyla güncellendi!' : 'Successfully updated!');
    } else {
      const newPurchase: Purchase = {
        id: crypto.randomUUID(),
        purchaseDate,
        purchasePriceTRY: finalPurchasePrice,
        quantity: finalQuantity,
        createdAt: Date.now(),
        transactionType,
      };

      setInvestments(prev => {
        const existingAsset = prev.find(a => a.assetType === assetType && a.entryType === entryType);
        if (existingAsset) {
          return prev.map(a => (a.assetType === assetType && a.entryType === entryType)
            ? { ...a, history: [newPurchase, ...(a.history || [])].sort((a, b) => b.createdAt - a.createdAt) } 
            : a
          );
        } else {
          const newAsset: AssetPortfolio = {
            id: crypto.randomUUID(),
            assetType,
            category,
            entryType,
            history: [newPurchase],
          };
          return [newAsset, ...prev];
        }
      });
      toast.success(t.successAdd);
    }

    setIsFormOpen(false);
    setEditingAssetId(null);
    setEditingPurchaseId(null);
    setPurchasePrice('');
    setQuantity('');
  };

  const handleEditPurchase = (asset: AssetPortfolio, purchase: Purchase) => {
    setEditingAssetId(asset.id);
    setEditingPurchaseId(purchase.id);
    setAssetType(asset.assetType);
    setEntryType(asset.entryType);
    setPurchasePrice(purchase.purchasePriceTRY.toString());
    setQuantity(Math.abs(purchase.quantity).toString());
    setPurchaseDate(purchase.purchaseDate);
    setTransactionType(purchase.transactionType || 'ALIM');
    setIsFormOpen(true);
  };

  const handleResetDefaults = () => {
    setAutoRefreshEnabled(false);
    setRefreshInterval(30);
    setTheme('yesil');
    setLanguage('tr');
    toast.success(language === 'tr' ? 'Ayarlar varsayılana sıfırlandı.' : 'Settings reset to defaults.');
  };

  const handleDeleteAsset = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteAsset = () => {
    if (deleteConfirmId) {
      setInvestments(investments.filter(inv => inv.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      toast.success(t.successDelete);
    }
  };

  const handleDeletePurchase = (assetId: string, purchaseId: string) => {
    setInvestments(prev => prev.map(asset => {
      if (asset.id === assetId) {
        const newHistory = (asset.history || []).filter(p => p.id !== purchaseId);
        return { ...asset, history: newHistory };
      }
      return asset;
    }).filter(asset => (asset.history?.length || 0) > 0));
  };

  // Calculations
  const portfolioStats = useMemo(() => {
    let totalCost = 0;
    let currentValue = 0;

    const assetDetails = investments.map(asset => {
      const livePrice = marketPrices[asset.assetType] || 0;

      const totalQuantity = (asset.history || []).reduce((sum, p) => sum + p.quantity, 0);
      const totalAssetCost = (asset.history || []).reduce((sum, p) => {
        // Only ALIM counts towards cost for average calculation in simplified logic
        // But user wants Net worth = Sum of all ALIM values + Sum of all SATIM (neg) values
        return sum + (p.purchasePriceTRY * p.quantity);
      }, 0);
      
      // Calculate Average Cost based on ALIM only for better clarity if needed, 
      // but sticking strictly to user's net worth request.
      const buyTransactions = (asset.history || []).filter(p => !p.transactionType || p.transactionType === 'ALIM');
      const totalBuyQuantity = buyTransactions.reduce((sum, p) => sum + p.quantity, 0);
      const totalBuyCost = buyTransactions.reduce((sum, p) => sum + (p.purchasePriceTRY * p.quantity), 0);
      const avgPrice = totalBuyQuantity > 0 ? totalBuyCost / totalBuyQuantity : 0;
      
      const value = livePrice * totalQuantity;
      const pl = value - totalAssetCost;
      const plPercent = totalAssetCost > 0 ? (pl / totalAssetCost) * 100 : 0;

      const lastPurchaseDate = (asset.history || []).length > 0 
        ? (asset.history || []).reduce((latest, p) => {
            return new Date(p.purchaseDate) > new Date(latest) ? p.purchaseDate : latest;
          }, (asset.history || [])[0].purchaseDate)
        : null;

      if (asset.entryType === 'debt') {
        totalCost -= totalAssetCost;
        currentValue -= value;
      } else {
        totalCost += totalAssetCost;
        currentValue += value;
      }

      return {
        ...asset,
        totalQuantity,
        avgPrice,
        livePrice,
        cost: totalAssetCost,
        value,
        pl,
        plPercent,
        lastPurchaseDate,
      };
    });

    const totalPL = currentValue - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    return {
      totalCost,
      currentValue,
      totalPL,
      totalPLPercent,
      assetDetails,
    };
  }, [investments, marketPrices]);

  const CHART_COLORS = useMemo(() => {
    if (theme === 'kahve') {
      return ['#A34324', '#795548', '#3E2723', '#DED0C1', '#A3B18A', '#8B4513', '#D2691E', '#CD853F'];
    }
    if (theme === 'yesil') {
      return ['#047857', '#064E3B', '#166534', '#C8D6CC', '#A3B18A', '#2D6A4F', '#40916C', '#52B788'];
    }
    return ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#334155', '#475569', '#64748b'];
  }, [theme]);

  const chartData = useMemo(() => {
    const total = portfolioStats.assetDetails.reduce((sum, a) => sum + a.value, 0);
    return portfolioStats.assetDetails
      .map(asset => ({
        name: getAssetDisplayName(asset.assetType, (asset as any).name),
        value: asset.value,
        percentage: total > 0 ? (asset.value / total) * 100 : 0
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolioStats.assetDetails, t, theme]);

  const sortedAssets = useMemo(() => {
    const filtered = portfolioStats.assetDetails.filter(asset => categoryFilter === 'ALL' || asset.category === categoryFilter);
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'VALUE':
          return b.value - a.value;
        case 'PERFORMANCE_BEST':
          return b.plPercent - a.plPercent;
        case 'PERFORMANCE_WORST':
          return a.plPercent - b.plPercent;
        case 'NEWEST':
          const aNewest = Math.max(...(a.history || []).map(p => new Date(p.purchaseDate).getTime()));
          const bNewest = Math.max(...(b.history || []).map(p => new Date(p.purchaseDate).getTime()));
          return bNewest - aNewest;
        default:
          return 0;
      }
    });
  }, [portfolioStats.assetDetails, categoryFilter, sortBy]);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-primary/30">
      <Toaster 
        position="top-center" 
        expand={false} 
        richColors 
        theme={theme}
        toastOptions={{
          style: {
            borderRadius: '1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(16px)',
          }
        }}
      />

      {/* Header */}
      <header className="border-b border-border-primary bg-bg-secondary/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary/10 border border-accent-primary/20 rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/10 group overflow-hidden relative shrink-0">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-6 h-6 text-accent-primary transition-transform group-hover:scale-110"
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-text-primary leading-none truncate">{t.appName}</h1>
              <p className="text-[8px] text-text-secondary font-bold uppercase tracking-[0.2em] mt-1.5 hidden md:block">{t.appSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center bg-bg-secondary/50 border border-border-primary rounded-full shadow-sm p-1">
            {/* Live Rates */}
            <Tooltip text={t.liveRates} side="bottom">
              <button 
                onClick={() => setIsRatesPanelOpen(true)}
                className="p-2 md:px-3 md:py-2 text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary rounded-full transition-all active:scale-95"
              >
                <Activity size={18} />
              </button>
            </Tooltip>

            {/* Add Asset */}
            <Tooltip text={t.addAsset} side="bottom">
              <button 
                onClick={() => {
                  setEditingAssetId(null);
                  setEditingPurchaseId(null);
                  setPurchasePrice('');
                  setQuantity('');
                  setPurchaseDate(new Date().toISOString().split('T')[0]);
                  setIsFormOpen(true);
                }}
                className="p-2 md:px-3 md:py-2 text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary rounded-full transition-all active:scale-95"
              >
                <Plus size={18} />
              </button>
            </Tooltip>

            {/* Settings */}
            <Tooltip text={t.settings} side="bottom">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "p-2 md:px-3 md:py-2 transition-all active:scale-95 rounded-full hover:bg-bg-tertiary flex items-center justify-center",
                  autoRefreshEnabled 
                    ? "text-accent-primary bg-accent-primary/10" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Settings size={18} className={cn(isRefreshing && "animate-spin")} />
              </button>
            </Tooltip>

            {/* Update Prices / Timer */}
            <Tooltip text={t.updatePrices} side="bottom">
              <button 
                onClick={refreshPrices}
                disabled={isRefreshing}
                className="p-2 md:px-3 md:py-2 text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {lastUpdated && (
                  <span className="hidden sm:block text-[10px] font-bold text-accent-primary/80 whitespace-nowrap pr-1">
                    {new Date(lastUpdated).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <ErrorBoundary language={language}>
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 pb-32 md:pb-40 space-y-10">
        {activeTab === 'PORTFOLIO' ? (
          <>
            {/* Portfolio Overview Dashboard - Simplified for Portfolio Tab */}
            <section>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-border-primary rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-accent-primary" />
                      <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">{t.totalPortfolioValue}</p>
                      {lastUpdated && (
                        <span className="text-[8px] text-text-secondary opacity-40 font-mono ml-auto">
                          {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                      {formatCurrency(portfolioStats.currentValue)}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:w-1/2">
                    <div className="bg-bg-tertiary/50 p-4 rounded-2xl border border-border-primary/50">
                      <span className="text-[9px] text-text-secondary opacity-50 uppercase font-bold tracking-widest mb-1 block">{t.totalPL}</span>
                      <div className={cn(
                        "flex items-center gap-1.5 font-bold text-base whitespace-nowrap",
                        portfolioStats.totalPL >= 0 ? "text-profit-primary" : "text-red-500"
                      )}>
                        {portfolioStats.totalPL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatCurrency(portfolioStats.totalPL)}
                      </div>
                    </div>
                    <div className="bg-bg-tertiary/50 p-4 rounded-2xl border border-border-primary/50">
                      <span className="text-[9px] text-text-secondary opacity-50 uppercase font-bold tracking-widest mb-1 block">{t.totalReturn}</span>
                      <div className={cn(
                        "font-bold text-base whitespace-nowrap",
                        portfolioStats.totalPLPercent >= 0 ? "text-profit-primary" : "text-red-500"
                      )}>
                        {formatPercent(portfolioStats.totalPLPercent)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Asset List */}
            <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-bg-secondary/30 p-4 rounded-3xl border border-border-primary/50">
            <div className="flex items-center justify-between md:justify-start gap-6">
              <h3 className="text-lg font-bold flex items-center gap-3 text-text-primary">
                {t.yourPortfolio}
                <span className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-primary/20">
                  {investments.length}
                </span>
              </h3>

              {/* Sorting Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border-primary rounded-2xl text-text-secondary hover:text-text-primary transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm hover:border-accent-primary/30"
                >
                  <ListFilter size={14} className="text-accent-primary" />
                  <span className="hidden sm:inline">{t.sortBy}:</span> {
                    sortBy === 'VALUE' ? t.sortValue :
                    sortBy === 'PERFORMANCE_BEST' ? t.sortBest :
                    sortBy === 'PERFORMANCE_WORST' ? t.sortWorst : t.sortNewest
                  }
                  <ChevronDown size={12} className={cn("transition-transform duration-300", isSortMenuOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {isSortMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-bg-secondary border border-border-primary rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl"
                      >
                        {[
                          { id: 'VALUE', label: t.sortValue },
                          { id: 'PERFORMANCE_BEST', label: t.sortBest },
                          { id: 'PERFORMANCE_WORST', label: t.sortWorst },
                          { id: 'NEWEST', label: t.sortNewest }
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id as any);
                              setIsSortMenuOpen(false);
                            }}
                            className={cn(
                              "w-full px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-bg-tertiary flex items-center justify-between",
                              sortBy === option.id ? "text-accent-primary bg-accent-primary/5" : "text-text-secondary"
                            )}
                          >
                            {option.label}
                            {sortBy === option.id && <Check size={14} />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-bg-secondary p-1.5 rounded-2xl border border-border-primary overflow-x-auto no-scrollbar">
              {(['ALL', 'FIAT', 'COMMODITY', 'TURKISH_GOLD'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    categoryFilter === cat 
                      ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  )}
                >
                  {cat === 'ALL' ? t.all : cat === 'FIAT' ? t.fiat : cat === 'COMMODITY' ? t.commodity : t.goldTr}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {/* Asset List Header (Desktop Only) */}
            <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-6 px-8 mb-1">
              <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">{t.assets}</div>
              <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">{t.avgPrice}</div>
              <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">{t.cost}</div>
              <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">{t.currentVal}</div>
              <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">{t.pl}</div>
              <div></div>
            </div>

            <AnimatePresence mode="popLayout">
              {sortedAssets.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group bg-bg-secondary border border-border-primary rounded-2xl transition-all hover:border-accent-primary/30 shadow-lg overflow-visible"
                >
                  <div 
                    onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                    className="p-4 md:px-8 md:py-5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] items-center gap-4 md:gap-6 cursor-pointer hover:bg-bg-tertiary/50 transition-colors rounded-2xl"
                  >
                    {/* Col 1: Asset Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-bg-tertiary rounded-xl flex items-center justify-center font-bold border border-border-primary shadow-sm shrink-0">
                        {getAssetIcon(asset.assetType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-text-primary text-sm truncate">{getAssetDisplayName(asset.assetType, (asset as any).name)}</h4>
                          {asset.entryType !== 'asset' && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border",
                              asset.entryType === 'debt' 
                                ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            )}>
                              {asset.entryType === 'debt' ? t.debt : t.receivable}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-text-secondary font-medium tracking-wide">
                            {t.quantity}: <span className="text-text-primary font-bold">{asset.totalQuantity.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Unit Cost (Desktop) */}
                    <div className="hidden md:flex flex-col items-end">
                      <span className="font-bold text-text-secondary text-xs">
                        {formatCurrency(asset.avgPrice)}
                      </span>
                    </div>

                    {/* Col 3: Total Cost (Desktop) */}
                    <div className="hidden md:flex flex-col items-end">
                      <span className="font-bold text-text-secondary text-xs">
                        {formatCurrency(asset.cost)}
                      </span>
                    </div>

                    {/* Col 4: Current Value (Desktop) */}
                    <div className="hidden md:flex flex-col items-end">
                      <span className="font-bold text-text-primary text-sm">
                        {asset.livePrice > 0 ? formatCurrency(asset.value) : '---'}
                      </span>
                    </div>

                    {/* Col 5: P/L (Desktop) */}
                    <div className="hidden md:flex flex-col items-end">
                      <div className={cn(
                        "font-bold flex items-center gap-1 text-sm whitespace-nowrap",
                        asset.pl >= 0 ? "text-profit-primary" : "text-red-500"
                      )}>
                        {asset.pl >= 0 ? '+' : ''}{formatCurrency(asset.pl)}
                        <span className="text-[9px] opacity-80">({formatPercent(asset.plPercent)})</span>
                      </div>
                    </div>

                    {/* Col 6: Delete (Desktop) */}
                    <Tooltip text={language === 'tr' ? 'Varlığı Sil' : 'Delete Asset'} side="top">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                        className="hidden md:flex items-center justify-center p-2 text-text-secondary hover:text-red-500 transition-all md:opacity-0 group-hover:opacity-100 rounded-lg hover:bg-red-500/5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>

                    {/* Mobile Summary View */}
                    <div className="md:hidden flex items-center justify-between w-full border-t border-border-primary/30 pt-4 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-0.5">{t.currentVal}</span>
                        <span className="font-bold text-text-primary text-xs">{asset.livePrice > 0 ? formatCurrency(asset.value) : '---'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-0.5">{t.pl}</span>
                        <div className={cn("font-bold flex items-center gap-1 text-xs", asset.pl >= 0 ? "text-profit-primary" : "text-red-500")}>
                          {asset.pl >= 0 ? '+' : ''}{formatCurrency(asset.pl)}
                          <span className="text-[8px] opacity-80">({formatPercent(asset.plPercent)})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase History & Actions */}
                  <AnimatePresence>
                    {expandedAsset === asset.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border-primary bg-bg-tertiary/30"
                      >
                        <div className="p-5 space-y-5">
                          {/* Mobile Detailed Info */}
                          <div className="grid grid-cols-2 gap-4 md:hidden pb-4 border-b border-border-primary/30">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1">{t.avgPrice}</span>
                              <span className="font-bold text-text-secondary text-xs">{formatCurrency(asset.avgPrice)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1">{t.cost}</span>
                              <span className="font-bold text-text-secondary text-xs">{formatCurrency(asset.cost)}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                              <History size={14} className="text-accent-primary" />
                              {t.transactionHistory}
                            </div>
                            <div className="space-y-2">
                              {(asset.history || []).map((purchase) => {
                                const isSale = purchase.transactionType === 'SATIM' || purchase.quantity < 0;
                                return (
                                  <div key={purchase.id} className="flex items-center justify-between py-3 px-4 bg-bg-secondary rounded-xl text-sm border border-border-primary shadow-sm group/purchase relative overflow-hidden transition-all hover:bg-bg-tertiary">
                                    <div className={cn(
                                      "absolute left-0 top-0 bottom-0 w-1",
                                      isSale ? "bg-red-500" : "bg-emerald-500"
                                    )} />
                                    <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar">
                                      <div className="flex flex-col shrink-0">
                                        <span className="text-[8px] text-text-secondary uppercase font-bold tracking-wider">{t.date}</span>
                                        <span className="text-text-primary font-medium text-xs">{formatDate(purchase.purchaseDate)}</span>
                                      </div>
                                      <div className="flex flex-col shrink-0">
                                        <span className="text-[8px] text-text-secondary uppercase font-bold tracking-wider">
                                          {isSale ? t.sellPrice : t.buyPrice}
                                        </span>
                                        <span className={cn(
                                          "font-medium text-xs",
                                          isSale ? "text-red-500" : "text-emerald-500"
                                        )}>
                                          {formatCurrency(purchase.purchasePriceTRY)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col shrink-0">
                                        <span className="text-[8px] text-text-secondary uppercase font-bold tracking-wider">
                                          {isSale ? t.sellQuantity : t.buyQuantity}
                                        </span>
                                        <span className="text-text-primary font-bold text-xs">
                                          {isSale ? '-' : '+'}{Math.abs(purchase.quantity).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 md:opacity-0 group-hover/purchase:opacity-100 transition-opacity">
                                      <Tooltip text={language === 'tr' ? 'Düzenle' : 'Edit'} side="top">
                                        <button 
                                          onClick={() => handleEditPurchase(asset, purchase)}
                                          className="p-2 text-text-secondary hover:text-accent-primary transition-colors hover:bg-bg-tertiary rounded-lg"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                      </Tooltip>
                                      <Tooltip text={language === 'tr' ? 'Sil' : 'Delete'} side="top">
                                        <button 
                                          onClick={() => handleDeletePurchase(asset.id, purchase.id)}
                                          className="p-2 text-text-secondary hover:text-red-500 transition-colors hover:bg-bg-tertiary rounded-lg"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </Tooltip>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mobile Delete Button */}
                          <div className="md:hidden pt-2">
                            <Tooltip text={language === 'tr' ? 'Varlığı Sil' : 'Delete Asset'} side="top">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAsset(asset.id);
                                }}
                                className="w-full flex items-center justify-center p-4 bg-red-500/5 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest border border-red-500/10 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={16} className="mr-2" />
                                {language === 'tr' ? 'Varlığı Sil' : 'Delete Asset'}
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Empty state */}
            {investments.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-border-primary rounded-3xl flex flex-col items-center justify-center space-y-4">
                <p className="text-text-secondary">{t.noInvestments}</p>
                <button 
                  onClick={() => {
                    setPurchaseDate(new Date().toISOString().split('T')[0]);
                    setIsFormOpen(true);
                  }}
                  className="px-6 py-2 bg-bg-tertiary hover:bg-bg-tertiary/80 text-accent-primary rounded-full text-sm font-semibold transition-colors"
                >
                  {t.addFirstAsset}
                </button>
              </div>
            )}
          </div>
        </section>
      </>
    ) : (
      <div className="space-y-10">
            {/* Charts Section */}
            <section className="grid md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-border-primary rounded-[2.5rem] p-8 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-accent-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">{t.distribution}</h3>
                  </div>
                </div>

                <div className="flex-1 min-h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        barSize={32}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-primary)" opacity={0.3} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
                          width={80}
                        />
                        <RechartsTooltip 
                          content={<CustomTooltip language={language} />}
                          cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px', color: 'var(--text-secondary)' }}
                          formatter={(value, entry, index) => <span className="text-text-secondary">{value}</span>}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 16, 16, 0]}
                          animationDuration={1500}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                          <LabelList 
                            dataKey="percentage" 
                            position="right" 
                            formatter={(val: number) => `%${val.toFixed(1)}`}
                            style={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 'bold' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary/30 italic text-sm">
                      {t.noInvestments}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-bg-secondary border border-border-primary rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-accent-secondary/10 rounded-3xl flex items-center justify-center border border-accent-secondary/20 shadow-xl shadow-accent-secondary/10">
                  <Sparkles size={40} className="text-accent-secondary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{t.aiAnalysis}</h3>
                  <p className="text-sm text-text-secondary max-w-xs">{language === 'tr' ? 'Portföyünüzü yapay zeka ile analiz edin ve kişiselleştirilmiş tavsiyeler alın.' : 'Analyze your portfolio with AI and get personalized investment advice.'}</p>
                </div>
                <button
                  onClick={runAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full max-w-xs py-4 bg-accent-secondary text-white rounded-2xl font-bold shadow-lg shadow-accent-secondary/30 hover:bg-accent-secondary/80 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {t.aiAnalysis}
                </button>
                
                {analysis && (
                  <button
                    onClick={() => setIsAnalysisModalOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-accent-secondary hover:text-accent-secondary/80 transition-colors"
                  >
                    {t.lastAnalysis}
                  </button>
                )}
              </motion.div>
            </section>

            {/* Zakat Planner Standalone Card */}
            <section className="mt-8">
              <ZakatPlanner investments={investments} marketPrices={marketPrices} language={language} />
            </section>
          </div>
        )}
      </main>
      </ErrorBoundary>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
        <div className="flex items-center justify-center gap-3 pointer-events-auto">
          {/* Left: Live Rates */}
          <Tooltip text={t.liveRates} side="top">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsRatesPanelOpen(true)}
              className="w-12 h-12 rounded-full bg-bg-secondary/90 backdrop-blur-md flex items-center justify-center text-text-primary shadow-lg border border-border-primary"
            >
              <Activity size={20} className="text-accent-primary" />
            </motion.button>
          </Tooltip>

          {/* Center: Tabs */}
          <div className="flex items-center p-1 bg-bg-secondary/90 backdrop-blur-md rounded-full shadow-lg border border-border-primary">
            <button
              onClick={() => setActiveTab('PORTFOLIO')}
              className={cn(
                "px-5 py-2 rounded-full text-sm transition-all duration-300",
                activeTab === 'PORTFOLIO' 
                  ? "bg-accent-primary text-white font-semibold shadow-sm" 
                  : "text-text-secondary font-medium hover:text-text-primary"
              )}
            >
              {t.portfolio}
            </button>
            <button
              onClick={() => setActiveTab('ANALYSIS')}
              className={cn(
                "px-5 py-2 rounded-full text-sm transition-all duration-300",
                activeTab === 'ANALYSIS' 
                  ? "bg-accent-primary text-white font-semibold shadow-sm" 
                  : "text-text-secondary font-medium hover:text-text-primary"
              )}
            >
              {t.analysis}
            </button>
          </div>

          {/* Right: Add Entry */}
          <Tooltip text={t.addAsset} side="top">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setPurchaseDate(new Date().toISOString().split('T')[0]);
                setIsFormOpen(true);
              }}
              className="w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-white shadow-lg shadow-accent-primary/20"
            >
              <Plus size={24} />
            </motion.button>
          </Tooltip>
        </div>
      </div>

      {/* Live Rates Panel (Bottom Sheet) */}
      <AnimatePresence>
        {isRatesPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRatesPanelOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-primary rounded-t-[2.5rem] z-[70] max-h-[80dvh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                      <Activity size={18} className="text-accent-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{t.liveRates}</h3>
                      {marketSource && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1 h-1 bg-profit-primary rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                            {t.source}: {marketSource}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                <button onClick={() => setIsRatesPanelOpen(false)} className="p-2 hover:bg-bg-tertiary rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {Object.entries(marketPrices).map(([type, price]) => {
                        const p = price as number;
                        const label = getAssetDisplayName(type);
                        
                        return (
                          <div key={type} className="bg-bg-tertiary/50 border border-border-primary p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider truncate">{label}</span>
                            <span className="text-sm font-bold text-text-primary">
                              {formatCurrency(p)}
                              {['XAU', 'XAG', 'XPT', 'XPD', 'XCU', 'GRAM_GOLD', 'HAS_GOLD', '22K_GOLD', '14K_GOLD', 'SILVER_GRAM', 'PLATINUM_GRAM', 'PALLADIUM_GRAM', 'COPPER_GRAM'].includes(type) && (
                                <span className="text-[10px] ml-1 opacity-50">/ gr</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-bg-secondary border border-border-primary rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bg-tertiary rounded-xl flex items-center justify-center">
                    <Settings className="text-accent-primary w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t.settings}</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="text-text-secondary hover:text-text-primary">✕</button>
              </div>

              <div className="p-6 space-y-8">
                {/* Language Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">
                    <Activity size={14} className="text-accent-primary/50" />
                    {t.language}
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-bg-tertiary/50 rounded-2xl border border-border-primary">
                    <button
                      onClick={() => setLanguage('tr')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        language === 'tr' 
                          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {t.turkish}
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        language === 'en' 
                          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {t.english}
                    </button>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">
                    <Sun size={14} className="text-accent-primary/50" />
                    {t.theme}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'dark', label: t.dark, icon: Moon, color: 'bg-slate-900', accent: 'bg-blue-500' },
                      { id: 'kahve', label: t.kahve, icon: Coffee, color: 'bg-[#A34324]', accent: 'bg-[#F59E0B]' },
                      { id: 'yesil', label: t.yesil, icon: Leaf, color: 'bg-[#047857]', accent: 'bg-[#10B981]' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setTheme(item.id as any)}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 p-4 rounded-[2rem] border-2 transition-all duration-300",
                          theme === item.id 
                            ? "bg-bg-tertiary border-accent-primary shadow-xl shadow-accent-primary/10 scale-[1.02]" 
                            : "bg-bg-tertiary/30 border-transparent hover:border-border-primary hover:bg-bg-tertiary/50"
                        )}
                      >
                        {/* Swatch Preview */}
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-inner">
                          <div className={cn("absolute inset-0", item.color)} />
                          <div className={cn("absolute bottom-0 right-0 w-1/2 h-1/2 rounded-tl-xl", item.accent)} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <item.icon size={18} className={cn(
                              "transition-transform duration-500 group-hover:scale-110",
                              theme === item.id ? "text-white" : "text-white/40"
                            )} />
                          </div>
                        </div>
                        
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest transition-colors",
                          theme === item.id ? "text-text-primary" : "text-text-secondary"
                        )}>
                          {item.label}
                        </span>

                        {/* Selected Indicator */}
                        {theme === item.id && (
                          <motion.div 
                            layoutId="theme-active"
                            className="absolute -top-1 -right-1 w-5 h-5 bg-accent-primary rounded-full flex items-center justify-center shadow-lg border-2 border-bg-secondary"
                          >
                            <Check size={10} className="text-white" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Refresh Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">
                      <RefreshCw size={14} className="text-accent-primary/50" />
                      {t.autoRefresh}
                    </div>
                    <button 
                      onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative p-1",
                        autoRefreshEnabled ? "bg-accent-primary" : "bg-bg-tertiary border border-border-primary"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full transition-all shadow-sm",
                        autoRefreshEnabled ? "bg-white translate-x-6" : "bg-text-secondary translate-x-0"
                      )} />
                    </button>
                  </div>
                  
                  {autoRefreshEnabled && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                        <span>{t.refreshInterval}</span>
                        <span className="text-accent-primary">{refreshInterval} {language === 'tr' ? 'DK' : 'MIN'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[15, 20, 25, 30, 45, 60].map((val) => (
                          <button
                            key={val}
                            onClick={() => setRefreshInterval(val)}
                            className={cn(
                              "py-2 rounded-xl text-[10px] font-bold transition-all border",
                              refreshInterval === val 
                                ? "bg-accent-primary text-white border-accent-primary shadow-lg shadow-accent-primary/20" 
                                : "bg-bg-tertiary/50 text-text-secondary border-border-primary hover:text-text-primary"
                            )}
                          >
                            {val}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset Button */}
                <div className="pt-2">
                  <button
                    onClick={handleResetDefaults}
                    className="w-full py-3 px-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    {t.resetToDefaults}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-bg-secondary/50 border-t border-border-primary">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-4 bg-accent-primary text-white font-bold rounded-2xl hover:bg-accent-primary/80 transition-all shadow-lg shadow-accent-primary/20"
                >
                  {t.ok}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Insights Modal */}
      <AnimatePresence>
        {isAnalysisModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAnalysisModalOpen(false)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-bg-secondary border border-border-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-border-primary flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    {isAnalyzing ? (
                      <RefreshCw size={24} className="text-accent-primary animate-spin" />
                    ) : (
                      <Sparkles size={24} className="text-accent-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{t.appName} {t.aiAnalysis}</h3>
                    {analysis && !isAnalyzing && (
                      <div className={cn(
                        "mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border inline-block",
                        (analysis.riskSeviyesi === 'DÜŞÜK' || analysis.riskSeviyesi === 'LOW') ? "bg-profit-primary/10 border-profit-primary/20 text-profit-primary" :
                        (analysis.riskSeviyesi === 'ORTA' || analysis.riskSeviyesi === 'MEDIUM') ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        "bg-red-500/10 border-red-500/20 text-red-500"
                      )}>
                        {t.risk}: {
                          (analysis.riskSeviyesi === 'DÜŞÜK' || analysis.riskSeviyesi === 'LOW') ? t.low : 
                          (analysis.riskSeviyesi === 'ORTA' || analysis.riskSeviyesi === 'MEDIUM') ? t.medium : t.high
                        }
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsAnalysisModalOpen(false)} 
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar min-h-[400px]">
                {isAnalyzing ? (
                  <div className="w-full flex justify-center py-2 animate-pulse">
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-10">
                        {/* Summary Skeleton */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-4 bg-accent-primary/40 rounded-full" />
                            <div className="h-3 w-20 bg-bg-tertiary rounded-full" />
                          </div>
                          <div className="space-y-3">
                            <div className="h-2.5 w-full bg-bg-tertiary rounded-full" />
                            <div className="h-2.5 w-[90%] bg-bg-tertiary rounded-full" />
                            <div className="h-2.5 w-[95%] bg-bg-tertiary rounded-full" />
                            <div className="h-2.5 w-[70%] bg-bg-tertiary rounded-full" />
                          </div>
                        </div>
                        {/* Performance Skeleton */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-4 bg-accent-primary/40 rounded-full" />
                            <div className="h-3 w-32 bg-bg-tertiary rounded-full" />
                          </div>
                          <div className="space-y-3">
                            <div className="h-2.5 w-[85%] bg-bg-tertiary rounded-full" />
                            <div className="h-2.5 w-full bg-bg-tertiary rounded-full" />
                            <div className="h-2.5 w-[60%] bg-bg-tertiary rounded-full" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Recommendations Skeleton */}
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-1 h-4 bg-accent-primary/40 rounded-full" />
                          <div className="h-3 w-40 bg-bg-tertiary rounded-full" />
                        </div>
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-4 p-5 bg-bg-tertiary/30 rounded-2xl border border-border-primary/50">
                              <div className="mt-1.5 w-1.5 h-1.5 bg-accent-primary/40 rounded-full shrink-0" />
                              <div className="space-y-3 w-full mt-1">
                                <div className="h-2.5 w-full bg-bg-tertiary rounded-full" />
                                <div className="h-2.5 w-[80%] bg-bg-tertiary rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Centered pulsing indicator to show it's working */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 pointer-events-none opacity-80 backdrop-blur-md bg-bg-secondary/50 p-6 rounded-3xl border border-border-primary/50 shadow-2xl">
                      <Sparkles size={32} className="text-accent-primary animate-pulse" />
                      <p className="text-[10px] font-bold text-accent-primary uppercase tracking-widest animate-pulse whitespace-nowrap">
                        {language === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...'}
                      </p>
                    </div>
                  </div>
                ) : analysisError ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                      <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <p className="text-text-primary font-bold">{analysisError}</p>
                    <button 
                      onClick={runAIAnalysis}
                      className="px-6 py-2 bg-accent-primary text-white rounded-xl font-bold text-sm"
                    >
                      {t.refresh}
                    </button>
                  </div>
                ) : analysis ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <div className="w-1 h-3 bg-accent-primary rounded-full" />
                          {t.summary}
                        </h4>
                        <p className="text-text-primary opacity-80 leading-relaxed text-sm md:text-base">{analysis.ozet}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <div className="w-1 h-3 bg-accent-primary rounded-full" />
                          {t.performanceAssessment}
                        </h4>
                        <p className="text-text-primary opacity-80 leading-relaxed text-sm md:text-base">{analysis.performans}</p>
                      </div>
                    </div>
                    <div className="bg-bg-tertiary/30 rounded-3xl p-5 md:p-6 border border-border-primary/50 shadow-sm h-full flex flex-col">
                      <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-accent-primary/20 shadow-inner">
                          <Lightbulb size={16} className="text-accent-primary" />
                        </div>
                        {t.aiRecommendations}
                      </h4>
                      <div className="flex flex-col mt-2">
                        {analysis.tavsiyeler.map((rec, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "flex items-start gap-4 py-4 text-sm md:text-base text-text-primary opacity-80",
                              i !== analysis.tavsiyeler.length - 1 ? "border-b border-border-primary/50" : "pb-0"
                            )}
                          >
                            <div className="mt-2 w-1.5 h-1.5 bg-accent-primary rounded-full shrink-0 shadow-[0_0_8px_rgba(var(--accent-primary),0.8)]" />
                            <p className="leading-relaxed break-words whitespace-normal">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </div>

              <div className="p-6 border-t border-border-primary shrink-0 bg-bg-secondary/50">
                <button 
                  onClick={() => setIsAnalysisModalOpen(false)}
                  className="w-full py-4 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary font-bold rounded-2xl transition-all border border-border-primary"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-bg-secondary border border-border-primary rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">
                {language === 'tr' ? 'Varlığı Sil' : 'Delete Asset'}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-8">
                {language === 'tr' 
                  ? 'Bu varlığı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' 
                  : 'Are you sure you want to delete this asset? This action cannot be undone.'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-4 bg-bg-tertiary text-text-primary font-bold rounded-2xl hover:bg-bg-tertiary/80 transition-all"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button 
                  onClick={confirmDeleteAsset}
                  className="py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-500/80 transition-all shadow-lg shadow-red-500/20"
                >
                  {language === 'tr' ? 'Sil' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Asset Bottom Sheet */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
            />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                  "relative w-full max-w-2xl bg-bg-secondary rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90dvh] max-h-[90dvh] transition-colors duration-500",
                  entryType === 'debt' ? "bg-red-500/[0.02]" : "bg-accent-primary/[0.02]"
                )}
              >
                {/* Background Tint Overlay */}
                <div className={cn(
                  "absolute inset-0 pointer-events-none transition-opacity duration-500",
                  entryType === 'debt' ? "bg-red-500/[0.03] opacity-100" : "bg-accent-primary/[0.03] opacity-100"
                )} />

                {/* Handle bar */}
                <div className="w-full flex justify-center pt-4 pb-2 shrink-0 relative z-10">
                  <div className="w-10 h-1 bg-bg-tertiary rounded-full" />
                </div>

                <div className="px-8 flex flex-col h-full overflow-hidden relative z-10">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-text-primary">
                      {editingAssetId ? (language === 'tr' ? 'Varlığı Düzenle' : 'Edit Asset') : t.addAssetTitle}
                    </h3>
                    <button onClick={() => {
                      setIsFormOpen(false);
                      setEditingAssetId(null);
                      setEditingPurchaseId(null);
                    }} className="p-1.5 text-text-secondary hover:text-text-primary bg-bg-tertiary/50 rounded-full transition-colors">✕</button>
                  </div>

                  {/* Entry Type & Transaction Type Control Group */}
                  <div className="flex flex-col gap-4 mb-8 shrink-0">
                    <div className="flex p-1 bg-bg-tertiary/50 rounded-2xl border border-border-primary">
                      {(['asset', 'debt', 'receivable'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEntryType(type)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10",
                            entryType === type 
                              ? type === 'debt' 
                                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                                : "bg-accent-primary text-white shadow-lg shadow-accent-primary/20"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {type === 'asset' ? t.assets : type === 'debt' ? t.debt : t.receivable}
                        </button>
                      ))}
                    </div>

                    {entryType === 'asset' && (
                      <div className="flex p-1 bg-bg-tertiary/50 rounded-2xl border border-border-primary">
                        {(['ALIM', 'SATIM'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTransactionType(type)}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10",
                              transactionType === type 
                                ? type === 'SATIM' 
                                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {type === 'ALIM' ? <Plus size={12} /> : <Minus size={12} />}
                              {type === 'ALIM' ? t.buyAction : t.sellAction}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddInvestment} className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2 pb-32">
                    <StepperInput 
                      label={transactionType === 'SATIM' ? t.sellQuantity : t.buyQuantity}
                      value={quantity}
                      onChange={setQuantity}
                      step={1}
                      min={0}
                      placeholder="0.00"
                    />

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-text-secondary opacity-60 uppercase tracking-widest ml-1">{t.assetType}</label>
                      <div className="relative">
                        <select 
                          value={assetType}
                          onChange={(e) => setAssetType(e.target.value as AssetType)}
                          className="w-full bg-bg-tertiary/50 border border-border-primary rounded-2xl px-5 py-4 text-text-primary text-sm focus:ring-2 focus:ring-accent-primary/30 transition-all appearance-none cursor-pointer font-bold"
                        >
                          <optgroup label={t.fiatCurrencies} className="bg-bg-secondary">
                            {(['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NOK', 'SEK', 'DKK'] as const).map(k => (
                              <option key={k} value={k}>{getAssetDisplayName(k)}</option>
                            ))}
                          </optgroup>
                          <optgroup label={t.physicalGoldSilver} className="bg-bg-secondary">
                            {(['HAS_GOLD', 'GRAM_GOLD', '22K_GOLD', '14K_GOLD', 'QUARTER_GOLD', 'HALF_GOLD', 'FULL_GOLD', 'REPUBLIC_GOLD', 'GREMSE_GOLD', 'RESAT_GOLD', 'SILVER_GRAM', 'PLATINUM_GRAM', 'PALLADIUM_GRAM', 'COPPER_GRAM'] as const).map(k => (
                              <option key={k} value={k}>{getAssetDisplayName(k)}</option>
                            ))}
                          </optgroup>
                          <optgroup label={t.globalCommodities} className="bg-bg-secondary">
                            {(['XAU', 'XAG', 'XPT', 'XPD', 'XCU'] as const).map(k => (
                              <option key={k} value={k}>{getAssetDisplayName(k)}</option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={18} />
                      </div>
                    </div>

                    {assetType !== 'TRY' && (
                      <>
                        <StepperInput 
                          label={transactionType === 'SATIM' ? t.sellPrice : t.buyPrice}
                          value={purchasePrice}
                          onChange={setPurchasePrice}
                          step={100}
                          min={0}
                          placeholder="0.00"
                        />

                        {currentLivePrice > 0 && (
                          <div className="flex items-center justify-between px-1 -mt-5 mb-2">
                            <p className="text-sm text-text-secondary font-medium">
                              {t.currentPrice}: <span className="text-text-primary font-bold">{formatCurrency(currentLivePrice)}</span>
                            </p>
                            <button 
                              type="button"
                              onClick={() => setPurchasePrice(currentLivePrice.toFixed(2))}
                              className="text-[10px] text-accent-primary hover:text-accent-primary/80 font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                            >
                              <TrendingDown size={10} className="rotate-180" />
                              {t.useThis}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">{t.purchaseDate}</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-primary" size={18} />
                        <input 
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full bg-bg-tertiary/50 border border-border-primary rounded-2xl py-4 pl-12 pr-4 text-text-primary font-bold focus:outline-none focus:border-accent-primary transition-all appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-bg-secondary border-t border-border-primary z-10 pb-safe">
                    <button 
                      type="submit"
                      className="w-full bg-accent-primary text-white font-bold py-4 rounded-2xl hover:bg-accent-primary/80 transition-all active:scale-[0.98] shadow-xl shadow-accent-primary/20"
                    >
                      {editingAssetId ? (language === 'tr' ? 'Güncelle' : 'Update') : t.addToPortfolio}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PrivacyPolicyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
        t={t} 
      />

      <TermsOfServiceModal 
        isOpen={isTermsModalOpen} 
        onClose={() => setIsTermsModalOpen(false)} 
        t={t} 
      />

      {/* Modern & Functional Footer */}
      <footer className="mt-auto border-t border-border-primary bg-bg-secondary/30 backdrop-blur-sm pb-28 md:pb-32">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-accent-primary/10 border border-accent-primary/20 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-accent-primary" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>
              </div>
              <span className="font-bold text-text-primary text-sm tracking-tight">{t.appName}</span>
            </div>
            <p className="text-xs text-text-secondary font-medium">
              {t.copyright}
            </p>
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-xs text-text-secondary hover:text-accent-primary transition-colors font-semibold"
            >
              {t.privacy}
            </button>
            <button 
              onClick={() => setIsTermsModalOpen(true)}
              className="text-xs text-text-secondary hover:text-accent-primary transition-colors font-semibold"
            >
              {t.terms}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
