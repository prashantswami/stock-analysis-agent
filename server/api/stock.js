import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

router.get('/', async (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  if (!ALPHA_VANTAGE_API_KEY) {
    return res.status(500).json({ error: 'Alpha Vantage API key is not configured' });
  }

  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_API_KEY,
      },
    });

    if (response.data['Error Message']) {
      return res.status(400).json({ error: response.data['Error Message'] });
    }
    if (response.data['Note']){
        // Handle API call limit note
        console.warn('Alpha Vantage API Note:', response.data['Note']);
        // Potentially return a specific status or message if it's a hard limit
        // For now, we will proceed to send the data if available
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

export default router; 