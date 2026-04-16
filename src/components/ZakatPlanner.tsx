import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, AlertCircle, CheckCircle2, Clock, Info, ChevronDown, ChevronUp, History } from 'lucide-react';
import { AssetPortfolio } from '../types';
import { Language, translations } from '../i18n';
import { formatCurrency, cn } from '../lib/utils';

interface ZakatPlannerProps {
  investments: AssetPortfolio[];
  marketPrices: Record<string, number>;
  language: Language;
}

const ELIGIBLE_ASSET_TYPES = [
  'TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NOK', 'SEK', 'DKK',
  'XAU', 'XAG', 'HAS_GOLD', 'GRAM_GOLD', '22K_GOLD', '14K_GOLD', 'QUARTER_GOLD', 
  'HALF_GOLD', 'FULL_GOLD', 'REPUBLIC_GOLD', 'GREMSE_GOLD', 'RESAT_GOLD', 'SILVER_GRAM'
];

export const ZakatPlanner: React.FC<ZakatPlannerProps> = ({ investments, marketPrices, language }) => {
  const isTr = language === 'tr';
  const [isExpanded, setIsExpanded] = useState(false);

  const t = {
    title: isTr ? "Zekat Planlayıcı" : "Zakat Planner",
    nisabStatus: isTr ? "Nisab Durumu" : "Nisab Status",
    aboveNisab: isTr ? "Nisab Üzeri" : "Above Nisab",
    belowNisab: isTr ? "Nisab Altı" : "Below Nisab",
    maturedAsset: isTr ? "Olgunlaşmış Varlık" : "Matured Asset",
    inProgressAsset: isTr ? "Süreç Devam Ediyor" : "In Progress",
    daysLeft: isTr ? "gün kaldı" : "days left",
    daysElapsedText: isTr ? "gün" : "days",
    estimatedZakat: isTr ? "Tahmini Zekat (1/40)" : "Estimated Zakat (1/40)",
    totalMatured: isTr ? "Zekata Tabi Varlık" : "Zakat-Eligible Assets",
    totalWealth: isTr ? "Toplam İlgili Varlık" : "Total Relevant Wealth",
    disclaimer: isTr 
      ? "Bu veriler yol gösterici bir ön bilgilendirme niteliğindedir. En sağlıklı sonuç için; buraya dahil edilmeyen varlıklarınızı, borçlarınızı ve asli ihtiyaçlarınızı gözeterek son hesaplamayı kendi özel durumunuza göre yapmanızı öneririz."
      : "These data are for guidance and preliminary information purposes. For the most accurate result, we recommend making the final calculation according to your specific situation, taking into account your assets, debts, and essential needs not included here.",
    emptyState: isTr ? "Zekata tabi varlık bulunamadı (Altın, Gümüş, Nakit)." : "No zakat-eligible assets found (Gold, Silver, Cash).",
    nisabDesc: isTr ? "Asgari zenginlik sınırı (80.18gr Altın)" : "Minimum wealth threshold (80.18g Gold)",
    viewDetails: isTr ? "Detayları Gör" : "View Details",
    hideDetails: isTr ? "Detayları Gizle" : "Hide Details",
    fiqhNote: isTr ? "(Hanefi Fıkhı)" : "(Hanafi Fiqh)",
  };

  const assetsMap = translations[language].assetsMap as Record<string, string>;

  const { nisabThreshold, totalEligibleValue, totalMaturedValue, estimatedZakat, assetsByMaturity } = useMemo(() => {
    // 1. Calculate Nisab Threshold
    const gramGoldPrice = marketPrices['HAS_GOLD'] || marketPrices['GRAM_GOLD'] || (marketPrices['XAU'] ? (marketPrices['XAU'] * (marketPrices['USD'] || 30)) / 31.1034768 : 2500);
    const nisabThreshold = 80.18 * gramGoldPrice;

    // 2. Extract Eligible Assets
    const items: Array<{
      id: string;
      assetType: string;
      value: number;
      daysElapsed: number;
      maturityPercent: number;
      isMatured: boolean;
      daysLeft: number;
    }> = [];

    const msPerDay = 1000 * 60 * 60 * 24;
    const now = new Date();

    investments.forEach(inv => {
      // Process only strictly owned assets (skip debts/receivables) that are Gold/Silver/Cash
      if (inv.entryType === 'asset' && ELIGIBLE_ASSET_TYPES.includes(inv.assetType)) {
        const livePrice = marketPrices[inv.assetType] || 0;
        
        (inv.history || []).forEach((purchase, idx) => {
          if (purchase.quantity <= 0) return;
          
          const value = purchase.quantity * livePrice;
          const pDate = new Date(purchase.purchaseDate);
          
          // Reset time to start of day for accurate day diff
          const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
          const pDateUTC = Date.UTC(pDate.getFullYear(), pDate.getMonth(), pDate.getDate());
          
          const daysElapsed = Math.max(0, Math.floor((nowUTC - pDateUTC) / msPerDay));
          const isMatured = daysElapsed >= 354;
          const maturityPercent = Math.min(100, Math.max(0, (daysElapsed / 354) * 100));
          const daysLeft = Math.max(0, 354 - daysElapsed);

          items.push({
            id: `${inv.assetType}-${purchase.id || idx}`,
            assetType: inv.assetType,
            value,
            daysElapsed,
            maturityPercent,
            isMatured,
            daysLeft
          });
        });
      }
    });

    const totalEligibleValue = items.reduce((sum, item) => sum + item.value, 0);
    const totalMaturedValue = items.reduce((sum, item) => sum + (item.isMatured ? item.value : 0), 0);
    const isAboveNisab = totalEligibleValue >= nisabThreshold;
    const estimatedZakat = isAboveNisab ? (totalMaturedValue / 40) : 0;

    // Sort by largest values, and matured first
    items.sort((a, b) => {
      if (a.isMatured && !b.isMatured) return -1;
      if (!a.isMatured && b.isMatured) return 1;
      return b.value - a.value;
    });

    return { nisabThreshold, totalEligibleValue, totalMaturedValue, estimatedZakat, assetsByMaturity: items };
  }, [investments, marketPrices]);

  const nisabPercent = Math.min(100, (totalEligibleValue / nisabThreshold) * 100) || 0;
  const isAboveNisab = totalEligibleValue >= nisabThreshold;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary border border-border-primary rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
    >
      {/* HEADER SECTION - Clickable for toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 md:p-8 flex items-center justify-between group transition-colors hover:bg-bg-tertiary/20"
      >
        <div className="flex flex-col items-start">
          <h3 className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
            <Scale size={24} />
            {t.title}
            <span className="text-[10px] font-bold text-text-secondary opacity-60 ml-1">{t.fiqhNote}</span>
          </h3>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">{t.nisabDesc}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{isTr ? "TOPLAM VARLIK" : "TOTAL WEALTH"}</span>
            <span className="text-sm font-black text-text-primary">{formatCurrency(totalEligibleValue)}</span>
          </div>
          <div className={cn(
            "p-2 rounded-xl border border-border-primary bg-bg-tertiary/50 transition-all",
            isExpanded ? "bg-accent-primary text-white" : "text-text-secondary group-hover:bg-bg-tertiary"
          )}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </button>

      <div className="px-6 md:px-8 pb-8">
        {assetsByMaturity.length === 0 ? (
          <div className="py-8 flex flex-col justify-center items-center opacity-40">
            <Info size={24} className="mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">{t.emptyState}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* NISAB GAUGE - Always Visible as Summary */}
            <div className="bg-emerald-900/5 border border-emerald-500/10 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-60">{t.nisabStatus}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-base md:text-lg font-black text-text-primary">
                      {formatCurrency(totalEligibleValue)}
                    </span>
                    <span className="text-xs font-bold text-text-secondary opacity-40">/</span>
                    <span className="text-xs md:text-sm font-bold text-text-secondary opacity-60">
                      {formatCurrency(nisabThreshold)}
                    </span>
                  </div>
                </div>
                
                {isAboveNisab ? (
                  <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" /> {t.aboveNisab}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-amber-500" /> {t.belowNisab}
                  </span>
                )}
              </div>
              
              {/* Progress Bar Container */}
              <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden relative border border-border-primary/50 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${nisabPercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={`absolute left-0 top-0 bottom-0 shadow-[0_0_12px_rgba(0,0,0,0.1)] ${isAboveNisab ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </div>
            </div>

            {/* EXPANDABLE SECTION */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="overflow-hidden space-y-8"
                >
                  {/* ESTIMATED ZAKAT BOX */}
                  {isAboveNisab && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Scale size={120} />
                      </div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                          <Scale size={32} className="text-white" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-1">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">{t.estimatedZakat}</p>
                          <p className="text-3xl md:text-4xl font-black text-text-primary tracking-tighter">{formatCurrency(estimatedZakat)}</p>
                          <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
                            <History size={12} className="text-text-secondary" />
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.totalMatured}: <span className="text-text-primary ml-1">{formatCurrency(totalMaturedValue)}</span></p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ASSETS TIMELINE */}
                  <div>
                    <div className="flex items-center gap-2 mb-6 border-b border-border-primary/50 pb-3">
                      <Clock size={16} className="text-emerald-600/60" />
                      <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
                        {isTr ? "Havl-i Havelan (Aylık Olgunlaşma) Çizelgesi" : "Havl-i Havelan (Monthly Maturity) Timeline"}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assetsByMaturity.map((item) => (
                        <div key={item.id} className="bg-bg-tertiary/30 border border-border-primary/40 rounded-3xl p-5 transition-all hover:bg-bg-tertiary/50 hover:border-emerald-500/20 group/item">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-border-primary/50 transition-colors",
                                item.isMatured ? "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/5" : "bg-sky-500/10 text-sky-600 shadow-sky-500/5"
                              )}>
                                {item.isMatured ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-text-primary leading-tight">{assetsMap[item.assetType] || item.assetType}</span>
                                <span className="text-[10px] font-bold text-text-secondary opacity-60 uppercase tracking-tighter">{item.assetType}</span>
                              </div>
                            </div>
                            <span className="text-sm sm:text-base font-black text-text-primary font-mono tracking-tight">{formatCurrency(item.value)}</span>
                          </div>
                          
                          {/* Item Progress Bar */}
                          <div className="space-y-3">
                            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden relative shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.maturityPercent}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={cn(
                                  "absolute left-0 top-0 bottom-0 transition-all",
                                  item.isMatured 
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                                    : "bg-gradient-to-r from-sky-400 to-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.2)]"
                                )}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className={cn(
                                "text-[10px] sm:text-xs font-black tracking-widest uppercase flex items-center gap-1.5",
                                item.isMatured ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600"
                              )}>
                                {item.isMatured ? (
                                  <>{t.maturedAsset}</>
                                ) : (
                                  <>{t.inProgressAsset}</>
                                )}
                              </div>
                              <span className="text-[10px] sm:text-xs font-bold text-text-secondary/90 bg-bg-secondary px-2.5 py-1 rounded-lg">
                                {item.isMatured 
                                  ? `${item.daysElapsed} ${t.daysElapsedText}` 
                                  : `%${item.maturityPercent.toFixed(0)} — ${item.daysLeft} ${t.daysLeft}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MANDATORY DISCLAIMER */}
                  <div className="pt-8 border-t border-border-primary/50">
                    <div className="bg-bg-tertiary/20 border border-border-primary/30 rounded-2xl p-4 flex gap-4 text-emerald-600/70 dark:text-emerald-400/70 items-start">
                      <AlertCircle size={20} className="shrink-0 mt-0.5 opacity-60" />
                      <p className="text-xs leading-relaxed font-medium italic">
                        {t.disclaimer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isExpanded && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="w-full py-4 border-t border-border-primary/30 text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary hover:text-accent-primary transition-all flex items-center justify-center gap-2 group"
              >
                {t.viewDetails}
                <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
