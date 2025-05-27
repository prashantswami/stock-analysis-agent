import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("Gemini API key is missing. Please set GEMINI_API_KEY in your .env file.");
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

router.get('/', async (req, res) => {
  const symbol = req.query.symbol;

  console.log(`Trend Summary: Received symbol '${symbol}'`);

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  if (!alphaVantageApiKey) {
    return res.status(500).json({ error: 'Alpha Vantage API key is missing.' });
  }
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Gemini API key is missing.' });
  }

  try {
    // 1. Fetch data from Alpha Vantage
    const alphaVantageUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${alphaVantageApiKey}&outputsize=compact`;
    console.log(`Trend Summary: Fetching Alpha Vantage URL: ${alphaVantageUrl}`);

    const response = await axios.get(alphaVantageUrl);
    
    if (!response.data) {
      console.error('Error fetching from Alpha Vantage: Response data is undefined or null.');
      return res.status(500).json({ error: 'Failed to fetch stock data from Alpha Vantage: Empty response.', alphaVantageResponse: null });
    }

    const timeSeriesData = response.data['Time Series (Daily)'];

    if (!timeSeriesData) {
      console.error('Error fetching from Alpha Vantage (timeSeriesData missing):', response.data);
      let errorMessage = 'Failed to fetch stock data from Alpha Vantage (Time Series (Daily) missing).';
      if (response.data['Error Message']) {
        errorMessage += ` Details: ${response.data['Error Message']}`;
      } else if (response.data['Information']) {
        errorMessage += ` Info: ${response.data['Information']}`;
      } else if (response.data['Note']) {
        errorMessage += ` Note: ${response.data['Note']}`;
      } else if (Object.keys(response.data).length === 0) {
        errorMessage = 'Failed to fetch stock data: Alpha Vantage returned an empty object.';
      }
      return res.status(500).json({ error: errorMessage, alphaVantageResponse: response.data });
    }

    const formattedData = Object.entries(timeSeriesData)
      .slice(0, 30)
      .map(([date, data]) => ({
        date: date,
        close: parseFloat(data['4. close']),
      }))
      .reverse();

    if (formattedData.length === 0) {
      return res.status(404).json({ error: 'No price data found for the last 30 days.' });
    }
    
    const promptContent = `
      Analyze the stock trend for ${symbol} based on the following daily closing prices for the last ${formattedData.length} trading days.
      Provide a concise summary of the recent price trend.
      Is it generally upward, downward, or sideways? Are there any notable patterns or recent shifts?
      Keep the summary to 2-3 sentences.

      Price Data:
      ${JSON.stringify(formattedData, null, 2)}
    `;

    // 3. Send prompt to Gemini
    const result = await model.generateContent(promptContent);
    const geminiResponse = await result.response;
    const trendSummary = geminiResponse.text();

    if (!trendSummary) {
      return res.status(500).json({ error: 'Failed to generate trend summary from Gemini AI.' });
    }

    res.json({ symbol, trendSummary, priceDataUsed: formattedData });

  } catch (error) {
    console.error('Error in /api/trend-summary:', error.response ? error.response.data : error.message);
    let statusCode = 500;
    let message = 'An error occurred while processing your request.';

    if (error.response && error.response.data && error.response.data.error) {
        message = error.response.data.error;
    } else if (error.message) {
        message = error.message;
    }
    
    if (error.isAxiosError && error.response && error.response.status) {
        statusCode = error.response.status;
    } else if (error.name === 'GoogleGenerativeAIError') {
        message = `Gemini API Error: ${error.message}`;
    }

    res.status(statusCode).json({ error: message, details: error.stack });
  }
});

export default router; 