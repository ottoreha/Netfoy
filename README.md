# Netfoy - AI-Powered Investment Tracker

Netfoy is a smart investment tracking application that allows users to manage their forex, gold, and silver portfolios with real-time market data and AI-driven insights.

## Features
- **Multi-Asset Tracking**: Support for Fiat (USD, EUR, GBP, CHF), Commodities (Gold, Silver, Platinum), and Turkish Physical Gold types.
- **Live Market Data**: Real-time price integration via Frankfurter and Binance APIs.
- **AI Portfolio Analysis**: Personalized insights, risk assessment, and recommendations powered by Gemini AI.
- **Deep Fintech UI**: A modern, slate-and-cyan themed dashboard with smooth animations.
- **Local Persistence**: All data is stored securely in your browser's LocalStorage.

## Project Structure
- `src/types.ts`: Core data models and type definitions.
- `src/services/marketService.ts`: Live data fetching and Turkish gold calculation logic.
- `src/services/aiService.ts`: Gemini AI integration for portfolio analysis.
- `src/App.tsx`: Main dashboard UI and application logic.
- `src/lib/utils.ts`: Formatting and styling utilities.

## Setup & Integration
1. **Environment Variables**:
   - Ensure `GEMINI_API_KEY` is set in your environment (AI Studio handles this automatically).
2. **Installation**:
   - Run `npm install` to install dependencies.
3. **Development**:
   - Run `npm run dev` to start the development server.
4. **Build**:
   - Run `npm run build` to create a production-ready build.

## AI Integration
The AI Analysis module uses the `gemini-3-flash-preview` model to process your portfolio distribution, average costs, and current market trends. It generates a JSON-structured response containing:
- **Summary**: A high-level overview of your portfolio health.
- **Recommendations**: Actionable steps to optimize your investments.
- **Risk Level**: An assessment of your current exposure (Low, Medium, High).
- **Performance Assessment**: A brief review of your P/L and return metrics.

---
Netfoy © 2024 • Smart Investing for Everyone
