import express from 'express';
// import yahooFinance from 'yahoo-finance2'; // No longer directly used here
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios'; // To make internal API call

// Import your Gemini AI client here if you have one
// For example:
// import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const router = express.Router();

// Initialize Gemini AI client, explicitly trying to use v1 API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiClient: "v1" });
// const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" }); // Changed to a generally available model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash, with v1 API client

router.post('/', async (req, res) => {
  console.log("---- Received Request from Ask AI ----");
  const { symbol, question } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in .env file');
    return res.status(500).json({ error: 'AI service is not configured.' });
  }

  if (!symbol) { // Question can be implicit for summary
    return res.status(400).json({ error: 'Stock symbol is required.' });
  }
  
  const isFundamentalAnalysisRequest = question === "Generate an analysis of the provided financial fundamentals.";
  const isIndex = symbol.startsWith('^');

  try {
    // Step 1: Fetch structured data from our own /api/stock endpoint
    let stockApiResponse;
    try {
      console.log(`[askAI] Fetching data for ${symbol} from internal /api/stock endpoint...`);
      stockApiResponse = await axios.get(`http://localhost:5001/api/stock?symbol=${symbol}`);
      if (!stockApiResponse.data || !stockApiResponse.data.symbol) {
        console.error(`[askAI] Internal /api/stock call did not return valid data for ${symbol}. Response:`, stockApiResponse.data);
        return res.status(404).json({ error: `Failed to retrieve base stock data for ${symbol} internally.` });
      }
      console.log(`[askAI] Successfully fetched data from internal /api/stock for ${symbol}.`);
    } catch (apiError) {
      console.error(`[askAI] Error calling internal /api/stock for ${symbol}:`, apiError.message);
      const status = apiError.response?.status || 500;
      const message = apiError.response?.data?.error || 'Failed to fetch stock data internally.';
      return res.status(status).json({ error: message, details: `Internal API call to /api/stock failed for ${symbol}` });
    }

    const fetchedData = stockApiResponse.data;
    const fundamentals = fetchedData.fundamentals || {}; // Ensure fundamentals object exists

    // Special handling for index fundamental analysis (already in place, now using better data source if applicable)
    if (isFundamentalAnalysisRequest && isIndex) {
      console.log(`[askAI] Fundamental analysis requested for index ${symbol}. Using available index data.`);
      // The prompt for indices will be different, focusing on what an index represents
      // For now, we can keep the informative message, or adapt the prompt to use `fetchedData` which includes `quote` like data.
      // Let's try to make a simpler summary for indices based on `fetchedData` directly.
    } else if (isFundamentalAnalysisRequest && !isIndex) {
      // Validation for company fundamental analysis
      if (!fundamentals.trailingPE && !fundamentals.forwardPE && !fundamentals.priceToBook && !fundamentals.earningsPerShare) {
        console.warn(`[askAI] Key fundamental metrics (PE, P/B, EPS) are missing in /api/stock response for company ${symbol}. Data:`, fundamentals);
        return res.status(404).json({ error: `Key financial metrics missing in data for company ${symbol}. Cannot perform detailed fundamental analysis.` });
      }
    }

    const stockDataForAI = {
      companyName: fetchedData.longName || fetchedData.shortName,
      exchange: fetchedData.exchange,
      currency: fetchedData.currency,
      currentPrice: fetchedData.regularMarketPrice,
      marketCap: fetchedData.marketCap, // This is from top-level quote, not fundamentals sub-object in /api/stock
      marketState: fetchedData.marketState,
      fiftyTwoWeekHigh: fundamentals.fiftyTwoWeekHigh || fetchedData.fiftyTwoWeekHigh, // Prefer fundamentals, fallback to quote
      fiftyTwoWeekLow: fundamentals.fiftyTwoWeekLow || fetchedData.fiftyTwoWeekLow,
      trailingPE: fundamentals.trailingPE,
      forwardPE: fundamentals.forwardPE,
      dividendYield: fundamentals.dividendYield,
      dividendRate: fundamentals.dividendRate,
      beta: fundamentals.beta,
      averageVolume: fundamentals.averageVolume || fetchedData.averageVolume, // Check both places
      averageVolume10days: fundamentals.averageVolume10days || fetchedData.averageDailyVolume10Day, 
      enterpriseValue: fundamentals.enterpriseValue,
      priceToBook: fundamentals.priceToBook,
      trailingEps: fundamentals.earningsPerShare, // EPS is often named earningsPerShare in fundamentals
      targetMeanPrice: fundamentals.targetMeanPrice,
      recommendationKey: fundamentals.recommendationKey,
      numberOfAnalystOpinions: fundamentals.numberOfAnalystOpinions, // This might not be in `fundamentals` from /api/stock
      totalRevenue: fundamentals.totalRevenue, // Likely not in `fundamentals` from /api/stock as structured
      revenueGrowth: fundamentals.revenueGrowth,
      grossMargins: fundamentals.grossMargins, // Likely not in `fundamentals` from /api/stock
      ebitdaMargins: fundamentals.ebitdaMargins, // Likely not in `fundamentals` from /api/stock
      operatingMargins: fundamentals.operatingMargins, // Likely not in `fundamentals` from /api/stock
      profitMargins: fundamentals.profitMargins, // Likely not in `fundamentals` from /api/stock
      debtToEquity: fundamentals.debtToEquity, // Likely not in `fundamentals` from /api/stock
      returnOnEquity: fundamentals.returnOnEquity, // Likely not in `fundamentals` from /api/stock
      businessSummary: fetchedData.longBusinessSummary, // /api/stock does not provide this, need to adjust or remove from prompt
      industry: fetchedData.industry, // /api/stock does not provide this
      sector: fetchedData.sector, // /api/stock does not provide this
    };
    // Clean up undefined from stockDataForAI before sending to prompt
    Object.keys(stockDataForAI).forEach(key => {
        if (stockDataForAI[key] === undefined) {
            stockDataForAI[key] = null; // Or 'Not Available' string, but null is better for templates
        }
    });

    console.log("---- Stock Data for AI ----");
    console.log(stockDataForAI);
    
    let prompt;
    if (isFundamentalAnalysisRequest) {
        if (isIndex) {
            // Prompt for Index Fundamental Overview
            prompt = `
            You are a helpful financial analyst AI. Your task is to provide an overview of the market index: ${stockDataForAI.companyName} (${symbol}).
            
            IMPORTANT INSTRUCTIONS:
            - Base your analysis ONLY on the provided data below.
            - Do NOT use any external knowledge or real-time information.
            - Do NOT provide financial advice or price predictions.
            - Explain that company-specific financial ratios (like P/E, EPS, P/B, revenue growth, debt) are not applicable to indices.
            - Focus on describing the index's current status, recent performance based on day range and 52-week range, and volume if available.
            - Keep the summary concise and easy for a general audience to understand.

            Provided Index Data for ${stockDataForAI.companyName} (${symbol}):
            - Current Value (${stockDataForAI.currency}): ${stockDataForAI.currentPrice ?? 'N/A'}
            - Day's Range: ${fetchedData.regularMarketDayLow ?? 'N/A'} - ${fetchedData.regularMarketDayHigh ?? 'N/A'}
            - 52 Week Range: ${stockDataForAI.fiftyTwoWeekLow ?? 'N/A'} - ${stockDataForAI.fiftyTwoWeekHigh ?? 'N/A'}
            - Average Volume (10 Day): ${stockDataForAI.averageVolume10days?.toLocaleString() ?? 'N/A'}
            - Market State: ${stockDataForAI.marketState || 'N/A'}
            (Note: Detailed financial ratios are not applicable to indices.)

            Provide your overview of the index below:
          `;
        } else {
            // Prompt for Company Fundamental Analysis (using data from /api/stock)
            prompt = `
            You are a helpful financial analyst AI. Your task is to provide a concise summary and interpretation of the key financial fundamentals for ${stockDataForAI.companyName} (${symbol}).
            
            IMPORTANT INSTRUCTIONS:
            - Base your analysis ONLY on the provided stock data below.
            - Do NOT use any external knowledge or real-time information.
            - Do NOT provide financial advice (e.g., buy/sell recommendations or price predictions).
            - Explain what key metrics (like P/E, P/B, EPS, Dividend Yield, Revenue Growth if available) indicate about the company's financial health, valuation, and performance, in simple terms.
            - If a value is null or "Not Available" in the data, state that the specific information is not available.
            - Keep the summary concise (around 3-5 key paragraphs or bullet points).

            Provided Stock Data for ${stockDataForAI.companyName} (${symbol}):
            - Current Price (${stockDataForAI.currency}): ${stockDataForAI.currentPrice ?? 'N/A'}
            - Market Cap: ${stockDataForAI.marketCap?.toLocaleString() ?? 'N/A'}
            - P/E Ratio (Trailing): ${stockDataForAI.trailingPE?.toFixed(2) ?? 'N/A'}
            - P/E Ratio (Forward): ${stockDataForAI.forwardPE?.toFixed(2) ?? 'N/A'}
            - EPS (Trailing TTM): ${stockDataForAI.trailingEps?.toFixed(2) ?? 'N/A'}
            - Dividend Yield: ${stockDataForAI.dividendYield ? (stockDataForAI.dividendYield * 100).toFixed(2) + '%' : 'N/A'}
            - Dividend Rate: ${stockDataForAI.dividendRate?.toFixed(2) ?? 'N/A'}
            - Price to Book (P/B): ${stockDataForAI.priceToBook?.toFixed(2) ?? 'N/A'}
            - Beta: ${stockDataForAI.beta?.toFixed(2) ?? 'N/A'}
            - Revenue Growth (YoY): ${stockDataForAI.revenueGrowth ? (stockDataForAI.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'} 
            - 52 Week Range: ${stockDataForAI.fiftyTwoWeekLow?.toFixed(2) ?? 'N/A'} - ${stockDataForAI.fiftyTwoWeekHigh?.toFixed(2) ?? 'N/A'}
            - Average Volume (10 Day): ${stockDataForAI.averageVolume10days?.toLocaleString() ?? 'N/A'}
            - Analyst Recommendation: ${stockDataForAI.recommendationKey || 'N/A'}
            - Target Mean Price: ${stockDataForAI.targetMeanPrice?.toFixed(2) ?? 'N/A'}
            - Enterprise Value: ${stockDataForAI.enterpriseValue?.toLocaleString() ?? 'N/A'}
            ${stockDataForAI.businessSummary ? `- Business Summary: ${stockDataForAI.businessSummary}` : ''}
            ${stockDataForAI.industry ? `- Industry: ${stockDataForAI.industry}` : ''}
            ${stockDataForAI.sector ? `- Sector: ${stockDataForAI.sector}` : ''}
            
            Provide your fundamental analysis summary below:
          `;
        }
    } else {
      // Prompt for a general question (if not a fundamental analysis request)
      prompt = `
      You are a helpful financial assistant. Your goal is to answer the user's question: "${question || 'Provide a general overview'}" for ${stockDataForAI.companyName} (${symbol}).
      
      IMPORTANT INSTRUCTIONS: (Same as above)
      - Base your answer ONLY on the data provided below. 
      - Do NOT use any external knowledge or real-time information.
      - Do NOT speculate or provide financial advice.
      - If data is insufficient, state that.
      - Keep answers concise.

      Provided Stock Data (Key Highlights):
      - Company: ${stockDataForAI.companyName} (${symbol})
      - Current Price (${stockDataForAI.currency}): ${stockDataForAI.currentPrice ?? 'N/A'}
      - Market Cap: ${stockDataForAI.marketCap?.toLocaleString() ?? 'N/A'}
      - P/E Ratio (Trailing): ${stockDataForAI.trailingPE?.toFixed(2) ?? 'N/A'}
      ${stockDataForAI.businessSummary ? `- Business Summary: ${stockDataForAI.businessSummary}` : ''}
      User's Question: "${question || 'Provide a general overview'}"

      Answer:
    `;
    }

    console.log("---- Sending Prompt to Gemini ----");
    // console.log("Stock Data Sent to AI:", stockDataForAI); // For debugging the data object itself
    // console.log("Full Prompt:", prompt); // For debugging the full prompt string
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();
    console.log("---- Received Response from Gemini ----");

    res.json({ answer: aiResponseText });

  } catch (error) {
    console.error(`Error in /api/ask-ai for symbol ${symbol}:`, error.message, error.stack);
    let errorMessage = 'Failed to process AI request.';
    if (error.response?.data?.error) { // Error from our internal API call
        errorMessage = error.response.data.error;
    } else if (error.message && (error.message.includes('No fundamentals data found') || error.message.toLowerCase().includes('not found') || error.message.includes('404'))) {
        errorMessage = `Could not retrieve sufficient data for symbol ${symbol} to ask AI. It might be an invalid symbol or delisted.`;
    } else if (error.message && error.message.includes('[VertexAI.GoogleGenerativeAI.ContentError]') || error.message.includes('gemini')) {
        console.error("Gemini Content/API Error:", error.message)
        errorMessage = "The AI model could not process the request. This might be due to content restrictions or an issue with the AI service.";
    }
    res.status(error.response?.status || 500).json({ error: errorMessage, details: error.message });
  }
});

export default router; 