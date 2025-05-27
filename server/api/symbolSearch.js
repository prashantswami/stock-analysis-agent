import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;

router.get('/', async (req, res) => {
  const keywords = req.query.keywords;

  if (!keywords) {
    return res.status(400).json({ error: 'Keywords are required for symbol search' });
  }

  if (!alphaVantageApiKey) {
    return res.status(500).json({ error: 'Alpha Vantage API key is missing.' });
  }

  try {
    const alphaVantageUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${alphaVantageApiKey}`;
    console.log(`Symbol Search: Fetching Alpha Vantage URL: ${alphaVantageUrl}`);

    const response = await axios.get(alphaVantageUrl);

    if (response.data && response.data.bestMatches) {
      res.json(response.data.bestMatches);
    } else if (response.data && response.data['Error Message']) {
      console.error('Alpha Vantage SYMBOL_SEARCH API Error:', response.data['Error Message']);
      res.status(500).json({ error: `Alpha Vantage API Error: ${response.data['Error Message']}` });
    } else if (response.data && response.data['Note']) {
      console.warn('Alpha Vantage SYMBOL_SEARCH API Note:', response.data['Note']);
      res.status(400).json({ error: `Alpha Vantage API Note: ${response.data['Note']} (This may be due to API call frequency limits or no matches found).` , bestMatches: []});
    } else {
      console.error('Error fetching from Alpha Vantage SYMBOL_SEARCH: Unexpected response format', response.data);
      res.status(500).json({ error: 'Failed to fetch symbol search results from Alpha Vantage: Unexpected response format.', details: response.data });
    }
  } catch (error) {
    console.error('Error in /api/symbol-search:', error.response ? error.response.data : error.message);
    let statusCode = 500;
    let message = 'An error occurred while processing your symbol search request.';

    if (error.response && error.response.status) {
        statusCode = error.response.status;
    }
    if (error.response && error.response.data && error.response.data.error) {
        message = error.response.data.error;
    } else if (error.message) {
        message = error.message;
    }
    
    res.status(statusCode).json({ error: message, details: error.message });
  }
});

export default router; 