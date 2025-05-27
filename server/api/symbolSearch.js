import express from 'express';
import yahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// No API key needed for yahooFinance.search()

router.get('/', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`Symbol Search: Searching Yahoo Finance for query: ${query}`);
    const searchResults = await yahooFinance.search(query);
    
    // The searchResults object contains a `quotes` array which are the primary matches,
    // and also news, options, etc. We'll focus on quotes.
    // Each quote has: exchange, shortname, quoteType, symbol, longname, etc.
    if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
      const bestMatches = searchResults.quotes.map(match => ({
        symbol: match.symbol,
        name: match.shortname || match.longname, // Prefer shortname, fallback to longname
        exchange: match.exchange,
        quoteType: match.quoteType
      }));
      res.json({ bestMatches });
    } else {
      console.log(`Symbol Search: No quotes found for query: ${query}`);
      res.json({ bestMatches: [] }); // Return empty if no direct quote matches
    }

  } catch (error) {
    console.error('Error fetching from Yahoo Finance SYMBOL_SEARCH equivalent:', error);
    // yahoo-finance2 errors might have a specific structure or just be generic.
    // Check for common error messages or types if they become apparent.
    if (error.name === 'FailedYahooValidationError') {
         return res.status(400).json({ error: `Invalid search query: ${query}. Details: ${error.message}` });
    }
    res.status(500).json({ error: 'Failed to perform symbol search with Yahoo Finance', details: error.message });
  }
});

export default router; 