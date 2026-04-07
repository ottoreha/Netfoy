import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, Trash2, Calendar, DollarSign, Euro, PoundSterling, SwissFranc, Gem, Coins, Circle, Diamond, History, RefreshCw, Loader2, Activity, Settings, Clock, Check, Sun, Moon, ListFilter, ChevronDown, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Toaster, toast } from 'sonner';
import { AssetPortfolio, Purchase, AssetType, AssetCategory, ASSET_LABELS, EntryType } from './types';
import { MOCK_INVESTMENTS } from './constants';
import { cn, formatCurrency, formatPercent, formatDate } from './lib/utils';
import { fetchMarketPrices } from './services/marketService';
import { analyzePortfolio, PortfolioAnalysis } from './services/aiService';
import { translations, Language } from './i18n';

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
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'ALL'>('ALL');

  // AI Analysis State
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    const saved = localStorage.getItem('netfoy_auto_refresh');
    return saved ? JSON.parse(saved) : true;
  });
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('netfoy_refresh_interval');
    return saved ? JSON.parse(saved) : 1;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'VALUE' | 'PERFORMANCE_BEST' | 'PERFORMANCE_WORST' | 'NEWEST'>('VALUE');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isRatesPanelOpen, setIsRatesPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'ANALYSIS'>('PORTFOLIO');
  const [chartView, setChartView] = useState<'ASSET' | 'TYPE'>('ASSET');
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('netfoy_language');
    return (saved as Language) || 'tr';
  });
  const t = translations[language];
  const [theme, setTheme] = useState<'dark' | 'kahve' | 'yesil'>(() => {
    const saved = localStorage.getItem('netfoy_theme');
    if (saved === 'cozy') return 'kahve'; // Migration
    if (saved === 'light') return 'kahve'; // Migration
    return (saved as 'dark' | 'kahve' | 'yesil') || 'dark';
  });

  const [assetType, setAssetType] = useState<AssetType>('USD');
  const [entryType, setEntryType] = useState<EntryType>('asset');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const currentLivePrice = useMemo(() => {
    return marketPrices[assetType] || 0;
  }, [assetType, marketPrices]);

  const isStale = useMemo(() => {
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated > 10 * 60 * 1000; // 10 minutes
  }, [lastUpdated]);

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
    
    // Always refresh once on mount
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
          setInvestments(MOCK_INVESTMENTS);
        }
      } catch (e) {
        console.error('Failed to parse localStorage data:', e);
        setInvestments(MOCK_INVESTMENTS);
      }
    } else {
      setInvestments(MOCK_INVESTMENTS);
      localStorage.setItem('netfoy_investments', JSON.stringify(MOCK_INVESTMENTS));
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
    try {
      const result = await analyzePortfolio(investments, marketPrices, {
        totalCost: portfolioStats.totalCost,
        currentValue: portfolioStats.currentValue,
        totalPL: portfolioStats.totalPL,
        totalPLPercent: portfolioStats.totalPLPercent,
      });
      setAnalysis(result);
      setIsAnalysisModalOpen(true);
      toast.success(language === 'tr' ? 'Yapay Zeka Analizi tamamlandı!' : 'AI Analysis completed!');
    } catch (error) {
      toast.error(language === 'tr' ? 'Yapay Zeka Analizi başarısız oldu.' : 'AI Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !purchasePrice || !purchaseDate) {
      toast.error(t.fillAllFields);
      return;
    }

    const category: AssetCategory = 
      ['USD', 'EUR', 'GBP', 'CHF'].includes(assetType) ? 'FIAT' :
      ['XAU', 'XAG', 'XPT'].includes(assetType) ? 'COMMODITY' : 'TURKISH_GOLD';

    const newPurchase: Purchase = {
      id: crypto.randomUUID(),
      purchaseDate,
      purchasePriceTRY: parseFloat(purchasePrice),
      quantity: parseFloat(quantity),
      createdAt: Date.now(),
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

    setIsFormOpen(false);
    setPurchasePrice('');
    setQuantity('');
    toast.success(t.successAdd);
  };

  const handleDeleteAsset = (id: string) => {
    setInvestments(investments.filter(inv => inv.id !== id));
    toast.success(t.successDelete);
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
      const totalAssetCost = (asset.history || []).reduce((sum, p) => sum + (p.purchasePriceTRY * p.quantity), 0);
      const avgPrice = totalQuantity > 0 ? totalAssetCost / totalQuantity : 0;
      
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
    if (chartView === 'ASSET') {
      const total = portfolioStats.assetDetails.reduce((sum, a) => sum + a.value, 0);
      return portfolioStats.assetDetails
        .map(asset => ({
          name: ASSET_LABELS[asset.assetType],
          value: asset.value,
          percentage: total > 0 ? (asset.value / total) * 100 : 0
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    } else {
      const assets = portfolioStats.assetDetails.filter(a => a.entryType === 'asset').reduce((sum, a) => sum + a.value, 0);
      const debts = portfolioStats.assetDetails.filter(a => a.entryType === 'debt').reduce((sum, a) => sum + a.value, 0);
      const receivables = portfolioStats.assetDetails.filter(a => a.entryType === 'receivable').reduce((sum, a) => sum + a.value, 0);
      const total = assets + debts + receivables;

      return [
        { name: t.assets, value: assets, color: theme === 'kahve' ? '#A34324' : theme === 'yesil' ? '#047857' : '#06b6d4' },
        { name: t.debt, value: debts, color: '#ef4444' },
        { name: t.receivable, value: receivables, color: '#3b82f6' }
      ].filter(item => item.value > 0).map(item => ({
        ...item,
        percentage: total > 0 ? (item.value / total) * 100 : 0
      }));
    }
  }, [portfolioStats.assetDetails, chartView, t, theme]);

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
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-primary/30">
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
        {isStale && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 flex items-center justify-center gap-2">
            <Clock size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              {language === 'tr' ? 'VERİLER GÜNCEL DEĞİL (10 DK+)' : 'STALE DATA (10 MIN+)'}
            </span>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary/10 border border-accent-primary/20 rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/10 group overflow-hidden relative">
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
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary leading-none">{t.appName}</h1>
              <p className="text-[8px] text-text-secondary font-bold uppercase tracking-[0.2em] mt-1.5 hidden md:block">{t.appSubtitle}</p>
            </div>
          </div>
            <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsRatesPanelOpen(true)}
              className="p-2 md:p-2.5 text-text-secondary hover:text-accent-primary bg-bg-secondary rounded-full border border-border-primary transition-all active:scale-90"
              title={t.liveRates}
            >
              <Activity size={18} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "p-2 md:p-2.5 rounded-full border transition-all active:scale-90 flex items-center gap-2",
                autoRefreshEnabled 
                  ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary shadow-lg shadow-accent-primary/10" 
                  : "bg-bg-secondary border-border-primary text-text-secondary hover:text-text-primary"
              )}
              title={t.settings}
            >
              <div className="relative">
                <Settings size={18} className={cn(isRefreshing && "animate-spin")} />
                {autoRefreshEnabled && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
                )}
              </div>
              <span className="hidden lg:block text-[10px] font-bold uppercase tracking-wider">
                {autoRefreshEnabled ? `${refreshInterval} ${language === 'tr' ? 'DK' : 'MIN'}` : t.settings}
              </span>
            </button>
            <button 
              onClick={refreshPrices}
              disabled={isRefreshing}
              className="p-2 md:p-2.5 text-text-secondary hover:text-accent-primary bg-bg-secondary rounded-full border border-border-primary transition-all active:scale-90 disabled:opacity-50 flex items-center gap-2"
              title={t.updatePrices}
            >
              {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {lastUpdated && (
                <span className="hidden sm:block text-[10px] font-bold text-accent-primary/80">
                  {new Date(lastUpdated).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 pb-32 space-y-10">
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
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        isStale ? "bg-amber-500" : "bg-accent-primary"
                      )} />
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
                  className="group bg-bg-secondary border border-border-primary rounded-2xl overflow-hidden transition-all hover:border-accent-primary/30 shadow-lg"
                >
                  <div 
                    onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                    className="p-4 md:px-8 md:py-5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] items-center gap-4 md:gap-6 cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
                  >
                    {/* Col 1: Asset Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-bg-tertiary rounded-xl flex items-center justify-center font-bold border border-border-primary shadow-sm shrink-0">
                        {getAssetIcon(asset.assetType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-text-primary text-sm truncate">{ASSET_LABELS[asset.assetType]}</h4>
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(asset.id);
                      }}
                      className="hidden md:flex items-center justify-center p-2 text-text-secondary hover:text-red-500 transition-all md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Mobile View (Grid for mobile) */}
                    <div className="grid grid-cols-2 gap-4 md:hidden border-t border-border-primary/30 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1 leading-tight">{t.avgPrice}</span>
                        <span className="font-bold text-text-secondary text-xs">{formatCurrency(asset.avgPrice)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1 leading-tight">{t.cost}</span>
                        <span className="font-bold text-text-secondary text-xs">{formatCurrency(asset.cost)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1 leading-tight">{t.currentVal}</span>
                        <span className="font-bold text-text-primary text-sm">{asset.livePrice > 0 ? formatCurrency(asset.value) : '---'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-secondary opacity-60 uppercase font-bold tracking-widest mb-1 leading-tight">{t.pl}</span>
                        <div className={cn("font-bold flex items-center gap-1 text-sm", asset.pl >= 0 ? "text-profit-primary" : "text-red-500")}>
                          {asset.pl >= 0 ? '+' : ''}{formatCurrency(asset.pl)}
                          <span className="text-[9px] opacity-80">({formatPercent(asset.plPercent)})</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(asset.id);
                      }}
                      className="md:hidden flex items-center justify-center p-3 mt-2 bg-red-500/5 text-red-500 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-red-500/10"
                    >
                      <Trash2 size={14} className="mr-2" />
                      {language === 'tr' ? 'Varlığı Sil' : 'Delete Asset'}
                    </button>
                  </div>

                  {/* Purchase History */}
                  <AnimatePresence>
                    {expandedAsset === asset.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border-primary bg-bg-tertiary/30"
                      >
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                            <History size={14} className="text-accent-primary" />
                            {t.purchaseHistory}
                          </div>
                          <div className="space-y-2">
                            {(asset.history || []).map((purchase) => (
                              <div key={purchase.id} className="flex items-center justify-between py-2 px-4 bg-bg-secondary rounded-lg text-sm border border-border-primary">
                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-secondary uppercase font-bold">{t.date}</span>
                                    <span className="text-text-primary opacity-80">{formatDate(purchase.purchaseDate)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-secondary uppercase font-bold">{t.price}</span>
                                    <span className="text-text-primary opacity-80">{formatCurrency(purchase.purchasePriceTRY)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-secondary uppercase font-bold">{t.amount}</span>
                                    <span className="text-text-primary opacity-80">{purchase.quantity}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeletePurchase(asset.id, purchase.id)}
                                  className="text-text-secondary hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
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
                  <div className="flex p-1 bg-bg-tertiary/50 rounded-xl border border-border-primary">
                    <button
                      onClick={() => setChartView('ASSET')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        chartView === 'ASSET' ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {t.assets}
                    </button>
                    <button
                      onClick={() => setChartView('TYPE')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        chartView === 'TYPE' ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {language === 'tr' ? 'Tür' : 'Type'}
                    </button>
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
                        <Tooltip 
                          cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                          contentStyle={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            borderColor: 'var(--border-primary)',
                            borderRadius: '1.25rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                            padding: '12px',
                            borderWidth: '1px'
                          }}
                          itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          formatter={(value: number) => [formatCurrency(value), '']}
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
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
        <div className="flex items-center justify-center gap-3 pointer-events-auto">
          {/* Left: Live Rates */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsRatesPanelOpen(true)}
            className="w-12 h-12 rounded-full bg-bg-secondary/90 backdrop-blur-md flex items-center justify-center text-text-primary shadow-lg border border-border-primary"
          >
            <Activity size={20} className="text-accent-primary" />
          </motion.button>

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
                        const label = ASSET_LABELS[type as AssetType] || type;
                        
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
                  <div className="grid grid-cols-3 gap-3 p-1.5 bg-bg-tertiary/50 rounded-2xl border border-border-primary">
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all",
                        theme === 'dark' 
                          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full border border-white/20", theme === 'dark' ? "bg-white" : "bg-slate-900")} />
                      {t.dark}
                    </button>
                    <button
                      onClick={() => setTheme('kahve')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all",
                        theme === 'kahve' 
                          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full border border-white/20", theme === 'kahve' ? "bg-white" : "bg-[#A34324]")} />
                      {t.kahve}
                    </button>
                    <button
                      onClick={() => setTheme('yesil')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all",
                        theme === 'yesil' 
                          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full border border-white/20", theme === 'yesil' ? "bg-white" : "bg-[#047857]")} />
                      {t.yesil}
                    </button>
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
                      <input 
                        type="range"
                        min="1"
                        max="60"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        className="w-full accent-accent-primary bg-bg-tertiary h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  )}
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
        {isAnalysisModalOpen && analysis && (
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
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className="w-6 h-6 text-accent-primary"
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{t.appName} {t.aiAnalysis}</h3>
                    <div className={cn(
                      "mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border inline-block",
                      analysis.riskLevel === 'Low' ? "bg-profit-primary/10 border-profit-primary/20 text-profit-primary" :
                      analysis.riskLevel === 'Medium' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {t.risk}: {
                        analysis.riskLevel === 'Low' ? t.low : 
                        analysis.riskLevel === 'Medium' ? t.medium : t.high
                      }
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAnalysisModalOpen(false)} 
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1 h-3 bg-accent-primary rounded-full" />
                        {t.summary}
                      </h4>
                      <p className="text-text-primary opacity-80 leading-relaxed text-sm md:text-base">{analysis.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1 h-3 bg-accent-primary rounded-full" />
                        {t.performanceAssessment}
                      </h4>
                      <p className="text-text-primary opacity-80 leading-relaxed text-sm md:text-base">{analysis.performanceAssessment}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1 h-3 bg-accent-primary rounded-full" />
                      {t.aiRecommendations}
                    </h4>
                    <ul className="space-y-4">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm md:text-base text-text-primary opacity-80 bg-bg-tertiary/50 p-4 rounded-2xl border border-border-primary">
                          <div className="mt-1.5 w-1.5 h-1.5 bg-accent-primary rounded-full shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border-primary shrink-0">
                <button 
                  onClick={() => setIsAnalysisModalOpen(false)}
                  className="w-full py-3 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary font-bold rounded-xl transition-colors"
                >
                  {t.close}
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
                    <h3 className="text-lg font-bold text-text-primary">{t.addAssetTitle}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="p-1.5 text-text-secondary hover:text-text-primary bg-bg-tertiary/50 rounded-full transition-colors">✕</button>
                  </div>

                  {/* Entry Type Segmented Control */}
                  <div className="flex p-1 bg-bg-tertiary/50 rounded-2xl border border-border-primary mb-8 shrink-0">
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

                  <form onSubmit={handleAddInvestment} className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2 pb-32">
                    <StepperInput 
                      label={t.quantity}
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
                            <option value="USD">{language === 'tr' ? 'ABD Doları (USD)' : 'US Dollar (USD)'}</option>
                            <option value="EUR">Euro (EUR)</option>
                            <option value="GBP">{language === 'tr' ? 'İngiliz Sterlini (GBP)' : 'British Pound (GBP)'}</option>
                            <option value="CHF">{language === 'tr' ? 'İsviçre Frangı (CHF)' : 'Swiss Franc (CHF)'}</option>
                            <option value="JPY">Japon Yeni (JPY)</option>
                            <option value="CAD">Kanada Doları (CAD)</option>
                            <option value="AUD">Avustralya Doları (AUD)</option>
                            <option value="NOK">Norveç Kronu (NOK)</option>
                            <option value="SEK">İsveç Kronu (SEK)</option>
                            <option value="DKK">Danimarka Kronu (DKK)</option>
                          </optgroup>
                          <optgroup label={t.physicalGoldSilver} className="bg-bg-secondary">
                            <option value="HAS_GOLD">{language === 'tr' ? 'Has Altın (24K)' : 'Pure Gold (24K)'}</option>
                            <option value="GRAM_GOLD">{language === 'tr' ? 'Gram Altın' : 'Gold Gram'}</option>
                            <option value="22K_GOLD">{language === 'tr' ? '22 Ayar Bilezik' : '22K Gold Bracelet'}</option>
                            <option value="14K_GOLD">{language === 'tr' ? '14 Ayar Altın' : '14K Gold'}</option>
                            <option value="QUARTER_GOLD">{language === 'tr' ? 'Çeyrek Altın' : 'Quarter Gold'}</option>
                            <option value="HALF_GOLD">{language === 'tr' ? 'Yarım Altın' : 'Half Gold'}</option>
                            <option value="FULL_GOLD">{language === 'tr' ? 'Tam Altın (Ziynet)' : 'Full Gold'}</option>
                            <option value="REPUBLIC_GOLD">{language === 'tr' ? 'Cumhuriyet Altını (Ata)' : 'Republic Gold'}</option>
                            <option value="GREMSE_GOLD">{language === 'tr' ? 'Gremse Altın (2.5\'luk)' : 'Gremse Gold'}</option>
                            <option value="RESAT_GOLD">{language === 'tr' ? 'Reşat Altın' : 'Resat Gold'}</option>
                            <option value="SILVER_GRAM">{language === 'tr' ? 'Gümüş (Gram)' : 'Silver Gram'}</option>
                            <option value="PLATINUM_GRAM">{language === 'tr' ? 'Platin (Gram)' : 'Platinum Gram'}</option>
                            <option value="PALLADIUM_GRAM">{language === 'tr' ? 'Paladyum (Gram)' : 'Palladium Gram'}</option>
                            <option value="COPPER_GRAM">{language === 'tr' ? 'Bakır (Gram)' : 'Copper Gram'}</option>
                          </optgroup>
                          <optgroup label={t.globalCommodities} className="bg-bg-secondary">
                            <option value="XAU">{language === 'tr' ? 'Altın (XAU/USD)' : 'Gold (XAU/USD)'}</option>
                            <option value="XAG">{language === 'tr' ? 'Gümüş (XAG/USD)' : 'Silver (XAG/USD)'}</option>
                            <option value="XPT">{language === 'tr' ? 'Platin (XPT/USD)' : 'Platinum (XPT/USD)'}</option>
                            <option value="XPD">{language === 'tr' ? 'Paladyum (XPD/USD)' : 'Palladium (XPD/USD)'}</option>
                            <option value="XCU">{language === 'tr' ? 'Bakır (XCU/USD)' : 'Copper (XCU/USD)'}</option>
                          </optgroup>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={18} />
                      </div>
                      {currentLivePrice > 0 && (
                        <div className="flex items-center justify-between px-1 mt-1">
                          <p className="text-[10px] text-text-secondary font-medium">
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
                    </div>

                    <StepperInput 
                      label={t.purchasePriceTry}
                      value={purchasePrice}
                      onChange={setPurchasePrice}
                      step={100}
                      min={0}
                      placeholder="0.00"
                    />

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
                      {t.addToPortfolio}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            <a 
              href="#" 
              className="text-xs text-text-secondary hover:text-accent-primary transition-colors font-semibold"
            >
              {t.privacy}
            </a>
            <a 
              href="#" 
              className="text-xs text-text-secondary hover:text-accent-primary transition-colors font-semibold"
            >
              {t.terms}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
