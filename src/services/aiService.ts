import { GoogleGenAI, Type } from "@google/genai";

export interface AIAnalysisResult {
  ozet: string;
  riskSeviyesi: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'DÜŞÜK' | 'MEDIUM' | 'HIGH';
  tavsiyeler: string[];
  performans: string;
}

const MOCK_RESPONSE: AIAnalysisResult = {
  ozet: "Bu bir test analizidir. Portföyünüz genel hatlarıyla defansif varlıklara yoğunlaşmış görünmektedir.",
  riskSeviyesi: "DÜŞÜK",
  tavsiyeler: [
    "API Key eklenene kadar bu test verisini göreceksiniz.",
    "Nakit oranınızı artırarak likidite sağlayabilirsiniz.",
    "Sektörel dağılımı gözden geçirmekte fayda var."
  ],
  performans: "Enflasyona karşı koruma sağlayan stabil bir yapı."
};

/**
 * Analyzes the portfolio using Gemini AI or returns mock data if API key is missing.
 */
export async function analyzePortfolioWithAI(portfolioData: any): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Mock-First Approach: If API key is missing, return mock data after a delay
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is missing. Returning mock data.");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_RESPONSE);
      }, 2000);
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Sen 20 yıllık tecrübeye sahip, SADECE faizsiz finans prensiplerine ve geleneksel yatırıma sadık bir Portföy Yöneticisisin.\nKURALLAR: KESİNLİKLE faiz (mevduat, repo vb.), tahvil, bono, eurobond, geleneksel borsa/hisse senedi fonları, kripto para veya faiz/spekülasyon içeren hiçbir yatırım aracını TAVSİYE ETME. Bu kelimeleri kullanman yasaktır.\nTavsiyelerini SADECE fiziki altın, gümüş, döviz, gayrimenkul veya tamamen faizsiz/katılım esaslı geleneksel fiziki varlıklar üzerinden ver. (Örn: İşçilik maliyeti düşük fiziki altına geçiş, gümüş ile çeşitlendirme, döviz sepeti yapma vb.).\nKullanıcının varlık verilerini analiz edip Türkçe dilinde stratejik bir özet, risk değerlendirmesi ve tavsiyeler sunmalısın.`;

    const portfolioString = JSON.stringify(portfolioData);
    const prompt = `İşte portföy verilerim: ${portfolioString}\nLütfen analiz et.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ozet: { type: Type.STRING, description: "Genişletilmiş portföy özeti" },
            riskSeviyesi: { type: Type.STRING, description: "DÜŞÜK veya ORTA veya YÜKSEK" },
            tavsiyeler: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Kullanıcıya özel tavsiyeler listesi"
            },
            performans: { type: Type.STRING, description: "Performans değerlendirmesi" }
          },
          required: ["ozet", "riskSeviyesi", "tavsiyeler", "performans"]
        }
      }
    });

    const text = response.text;
    
    // Safety check just in case text is undefined
    if (!text) {
        throw new Error("AI response text is empty");
    }

    // Clean markdown code blocks if occasionally present despite responseMimeType
    const cleanJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    try {
      return JSON.parse(cleanJson) as AIAnalysisResult;
    } catch (parseError) {
      console.error("Gemini API JSON Parsing Error:", parseError, "Raw Response Text:", text);
      return {
        ozet: "Yapay zeka yanıtı anlaşılamadı. Format hatası oluştu.",
        riskSeviyesi: "ORTA",
        tavsiyeler: [
          "Verileriniz güvende, ancak AI sistemi beklenen formatta yanıt vermedi.",
          "Lütfen analizi tekrar çalıştırmayı deneyin."
        ],
        performans: "Bilinmiyor, AI yanıt formatı hatalı."
      };
    }
  } catch (error) {
    console.error("Gemini API Full Error:", error);
    throw new Error("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
  }
}
