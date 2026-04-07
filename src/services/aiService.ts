import { GoogleGenAI } from "@google/genai";
import { AssetPortfolio, AssetType, ASSET_LABELS } from "../types";
import { formatCurrency, formatPercent } from "../lib/utils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PortfolioAnalysis {
  summary: string;
  recommendations: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  performanceAssessment: string;
}

export async function analyzePortfolio(
  investments: AssetPortfolio[],
  marketPrices: Record<string, number>,
  stats: {
    totalCost: number;
    currentValue: number;
    totalPL: number;
    totalPLPercent: number;
  },
  language: 'tr' | 'en' = 'tr'
): Promise<PortfolioAnalysis> {
  if (investments.length === 0) {
    return {
      summary: language === 'tr' 
        ? "Portföyünüz şu anda boş. Kişiselleştirilmiş yapay zeka analizleri almak için varlık ekleyerek başlayın."
        : "Your portfolio is currently empty. Start by adding assets to receive personalized AI analysis.",
      recommendations: language === 'tr'
        ? ["Çeşitlendirmek için döviz ve emtia karışımı ekleyin.", "Performansı görmek için ilk işleminizi kaydedin."]
        : ["Add a mix of foreign currencies and commodities to diversify.", "Record your first transaction to see performance."],
      riskLevel: 'Low',
      performanceAssessment: language === 'tr' ? "Değerlendirilecek veri yok." : "No data to assess."
    };
  }

  const assetData = investments.map(asset => {
    const totalQuantity = (asset.history || []).reduce((sum, p) => sum + p.quantity, 0);
    const totalAssetCost = (asset.history || []).reduce((sum, p) => sum + (p.purchasePriceTRY * p.quantity), 0);
    const livePrice = marketPrices[asset.assetType] || 0;
    const value = livePrice * totalQuantity;
    const pl = value - totalAssetCost;
    const plPercent = totalAssetCost > 0 ? (pl / totalAssetCost) * 100 : 0;

    return {
      type: ASSET_LABELS[asset.assetType],
      entryType: asset.entryType,
      quantity: totalQuantity,
      avgCost: totalQuantity > 0 ? totalAssetCost / totalQuantity : 0,
      currentPrice: livePrice,
      value,
      pl,
      plPercent
    };
  });

  const prompt = `
    Analyze the following portfolio as an AI investment advisor for "Netfoy":
    
    Net Worth: ${formatCurrency(stats.currentValue)}
    Total Cost: ${formatCurrency(stats.totalCost)}
    Total Profit/Loss: ${formatCurrency(stats.totalPL)} (${formatPercent(stats.totalPLPercent)})
    
    Asset Distribution:
    ${assetData.map(a => `- ${a.type} (${a.entryType}): ${a.quantity} units, Avg. Cost: ${formatCurrency(a.avgCost)}, Current Price: ${formatCurrency(a.currentPrice)}, Value: ${formatCurrency(a.value)}, P/L: ${formatPercent(a.plPercent)}`).join('\n')}
    
    Current Market Context:
    - USD/TRY: ${formatCurrency(marketPrices['USD'] || 0)}
    - Gold (XAU/USD): ${formatCurrency(marketPrices['XAU'] || 0)}
    
    Please provide:
    1. A brief summary of the portfolio's health.
    2. 3-4 specific recommendations for the user.
    3. An overall risk level (Low, Medium, High).
    4. A brief performance assessment.
    
    CRITICAL: You MUST provide the analysis, summary, and recommendations STRICTLY in ${language === 'tr' ? 'Turkish' : 'English'} language.
    
    Return the response in JSON format with the following keys: summary, recommendations (array of strings), riskLevel (one of Low, Medium, High), performanceAssessment.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      summary: result.summary || (language === 'tr' ? "Özet oluşturulamadı." : "Summary could not be generated."),
      recommendations: result.recommendations || [],
      riskLevel: result.riskLevel || 'Medium',
      performanceAssessment: result.performanceAssessment || (language === 'tr' ? "Değerlendirme mevcut değil." : "Assessment not available.")
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: language === 'tr'
        ? "Yapay zeka şu anda portföyünüzü analiz edemiyor. Lütfen daha sonra tekrar deneyin."
        : "AI is currently unable to analyze your portfolio. Please try again later.",
      recommendations: language === 'tr'
        ? ["İnternet bağlantınızı kontrol edin.", "Varlıklarınızın doğru kaydedildiğinden emin olun."]
        : ["Check your internet connection.", "Ensure your assets are recorded correctly."],
      riskLevel: 'Medium',
      performanceAssessment: language === 'tr' ? "Analiz sırasında hata oluştu." : "An error occurred during analysis."
    };
  }
}
