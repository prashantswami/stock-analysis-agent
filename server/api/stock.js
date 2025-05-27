import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2'; // NOTE: .default is not needed for ES modules

dotenv.config();

const router = express.Router();

// Remove ALPHA_VANTAGE_API_KEY as it's no longer needed
// const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

router.get('/', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    // Fetch basic quote data
    const quote = await yahooFinance.quote(symbol);

    if (!quote || !quote.symbol) {
        // If basic quote fails, it might be an invalid symbol or delisted
        return res.status(404).json({ error: `No data found for symbol ${symbol}. It may be invalid or delisted.` });
    }

    // Fetch additional fundamental data using quoteSummary
    let summaryData = {};
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'price']
        });
        // Merge the relevant parts of summary into quote or a new object
        // For simplicity, we can create a dedicated fundamentals object or merge selectively
        summaryData = {
            marketCap: summary.price?.marketCap,
            beta: summary.defaultKeyStatistics?.beta,
            trailingPE: summary.summaryDetail?.trailingPE, // Already in quote, but can be confirmed
            forwardPE: summary.defaultKeyStatistics?.forwardPE,
            priceToBook: summary.defaultKeyStatistics?.priceToBook,
            enterpriseValue: summary.defaultKeyStatistics?.enterpriseValue,
            fiftyTwoWeekHigh: summary.summaryDetail?.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: summary.summaryDetail?.fiftyTwoWeekLow,
            averageVolume: summary.summaryDetail?.averageVolume,
            averageVolume10days: summary.summaryDetail?.averageDailyVolume10Day, // often preferred
            dividendYield: summary.summaryDetail?.dividendYield,
            dividendRate: summary.summaryDetail?.dividendRate,
            earningsPerShare: summary.defaultKeyStatistics?.trailingEps, // often referred to as EPS (TTM)
            revenueGrowth: summary.financialData?.revenueGrowth,
            targetMeanPrice: summary.financialData?.targetMeanPrice,
            recommendationKey: summary.financialData?.recommendationKey,
            // Add more fields as needed from summaryDetail, defaultKeyStatistics, financialData
        };
    } catch (summaryError) {
        console.warn(`Could not fetch quoteSummary for ${symbol}: ${summaryError.message}. Proceeding with basic quote data.`);
        // summaryData will remain empty, frontend should handle missing fields gracefully
    }

    // Combine quote data with summaryData
    const combinedData = {
        ...quote, // Spread all fields from quote
        fundamentals: summaryData // Add the new fundamentals object
    };

    res.json(combinedData);

  } catch (error) {
    console.error('Error fetching stock data from Yahoo Finance:', error.message);
    if (error.name === 'FailedYahooValidationError') {
      return res.status(404).json({ error: `Could not find data for symbol: ${symbol}. It might be delisted or an incorrect symbol.`, details: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch stock data from Yahoo Finance', details: error.message });
  }
});

// Updated endpoint for historical data with interval and range support
router.get('/historical/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval = '1d', range = '1y' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required for historical data' });
  }

  let period1;
  let period2 = new Date(); // Used for non-intraday ranges to set the end boundary

  const isIntraday = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h'].includes(interval);
  let queryOptions;

  if (range === '1d' && isIntraday) {
    const todayDate = new Date();
    const period1Str = todayDate.toISOString().split('T')[0]; 
    
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const period2Str = tomorrowDate.toISOString().split('T')[0];

    queryOptions = {
      period1: period1Str, 
      period2: period2Str, 
      interval: interval,  
    };
  } else {
    const todayForCalc = new Date(); 
    let period1Str;
    switch (range) {
      case '5d':
        period1Str = new Date(new Date().setDate(todayForCalc.getDate() - 5)).toISOString().split('T')[0];
        break;
      case '1mo':
        period1Str = new Date(new Date().setMonth(todayForCalc.getMonth() - 1)).toISOString().split('T')[0];
        break;
      case '6mo':
        period1Str = new Date(new Date().setMonth(todayForCalc.getMonth() - 6)).toISOString().split('T')[0];
        break;
      case '1y':
        period1Str = new Date(new Date().setFullYear(todayForCalc.getFullYear() - 1)).toISOString().split('T')[0];
        break;
      case '5y':
        period1Str = new Date(new Date().setFullYear(todayForCalc.getFullYear() - 5)).toISOString().split('T')[0];
        break;
      case 'max':
        period1Str = '1970-01-01'; 
        break;
      default: 
        period1Str = new Date(new Date().setFullYear(todayForCalc.getFullYear() - 1)).toISOString().split('T')[0];
    }
    
    // Heuristic for long ranges with intraday intervals (if not the 'Today' case)
    // This must come AFTER period1Str is set by the switch, and only if it's not the 'Today' case.
    if (isIntraday && !['1d', '5d'].includes(range)) { 
      console.warn(`Intraday interval ${interval} requested with long range ${range}. Adjusting period1 to 7 days ago as a heuristic.`);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      period1Str = sevenDaysAgo.toISOString().split('T')[0]; 
    } 

    queryOptions = {
      period1: period1Str, // String YYYY-MM-DD
      period2: period2.toISOString().split('T')[0], // String YYYY-MM-DD for end of today
      interval: interval,
    };
  }
  
  try {
    console.log(`Fetching historical data for ${symbol} using CHART API with options:`, queryOptions);
    
    const chartResult = await yahooFinance.chart(symbol, queryOptions);
    const rawData = chartResult?.quotes || []; 

    if (!rawData || rawData.length === 0) {
      return res.status(404).json({ error: `No historical data found for symbol ${symbol} with interval ${interval} and range ${range}` });
    }

    // Ensure `rawData` items have a `close` property and `date` property
    // `historical` items usually have this. `chart` items also have `date` (as Date object) and `close`.
    const seriesData = rawData.map(item => item.close);
    let dateFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    // For chart API, item.date is already a Date object. For historical, it needs parsing.
    if (isIntraday) { 
        dateFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (range === '5d' || range === '1mo') {
        dateFormatOptions = { month: 'short', day: 'numeric' };
    }

    const categoriesData = rawData.map(item => {
        const dateObj = (item.date instanceof Date) ? item.date : new Date(item.date);
        return dateObj.toLocaleDateString('en-US', dateFormatOptions);
    });
    
    res.json({
      symbol: symbol,
      series: [{ name: 'Closing Price', data: seriesData }],
      categories: categoriesData,
      metadata: {
        ...queryOptions,
        dataPoints: rawData.length,
      }
    });

  } catch (error) {
    console.error(`Error fetching historical stock data from Yahoo Finance for ${symbol} with interval ${interval}, range ${range}. Options: ${JSON.stringify(queryOptions)}`, error);
    // Log the full error object or specific properties if available
    if (error.result) console.error("Yahoo Finance API Result (if available in error):");
    if (error.message) console.error("Error Message:", error.message);
    if (error.stack) console.error("Error Stack:", error.stack);
    if (error.name === 'FailedYahooValidationError' || error.message?.includes('failed with status code 404') || error.message?.toLowerCase().includes('not found')) {
        return res.status(404).json({ error: `Invalid symbol or no data found for historical data: ${symbol} (Interval: ${interval}, Range: ${range}). Yahoo Message: ${error.message}` });
    }
    res.status(500).json({ error: 'Failed to fetch historical stock data from Yahoo Finance', details: error.message });
  }
});

export default router;
