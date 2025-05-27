import express from 'express';
import yahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// No API key needed for Yahoo Finance public data

router.get('/', async (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required for trend summary.' });
  }

  try {
    console.log(`Trend Summary: Fetching data from Yahoo Finance for symbol: ${symbol}`);

    // 1. Fetch primary quote data (more reliable for current price, change, for all types including indices)
    const quoteData = await yahooFinance.quote(symbol);

    // 2. Fetch supplementary summary data
    const summaryDetails = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail', 'financialData', 'recommendationTrend', 'earningsTrend'] // Removed 'price' module here
    });

    if (!quoteData && !summaryDetails) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}.` });
    }

    const isIndex = symbol.startsWith('^');
    const displayName = quoteData?.shortName || quoteData?.longName || symbol;
    let trendText = `Trend Analysis for ${displayName}:\n`;
    
    // Use data from quote() for primary market figures
    if (quoteData) {
      let priceString = isIndex ? "Current Value: " : `Current Price: ${quoteData.currencySymbol || ''}`;
      
      if (quoteData.regularMarketPrice !== undefined) {
        priceString += `${quoteData.regularMarketPrice.toFixed(2)}`;
      } else {
        priceString += 'N/A';
      }

      if (quoteData.regularMarketChangePercent !== undefined) {
        const changePercent = (quoteData.regularMarketChangePercent * 100).toFixed(2);
        priceString += ` (Change: ${changePercent}%).
`;
      } else {
        priceString += ` (Change: N/A).
`;
      }
      trendText += priceString;

      if (quoteData.fiftyTwoWeekHigh !== undefined && quoteData.fiftyTwoWeekLow !== undefined) {
        const high = quoteData.fiftyTwoWeekHigh.toFixed(2);
        const low = quoteData.fiftyTwoWeekLow.toFixed(2);
        trendText += `52-Week Range: ${low} - ${high}.
`;
        
        if (quoteData.regularMarketPrice !== undefined) {
          const currentPriceRaw = quoteData.regularMarketPrice;
          const highRaw = quoteData.fiftyTwoWeekHigh;
          const lowRaw = quoteData.fiftyTwoWeekLow;
          const midRange = (highRaw + lowRaw) / 2;

          if (currentPriceRaw > midRange) {
            trendText += `The ${isIndex ? 'index' : 'stock'} is trading in the upper half of its 52-week range.`;
          } else {
            trendText += `The ${isIndex ? 'index' : 'stock'} is trading in the lower half of its 52-week range.`;
          }
          const distHigh = ((currentPriceRaw - highRaw) / highRaw * 100).toFixed(1);
          const distLow = ((currentPriceRaw - lowRaw) / lowRaw * 100).toFixed(1);
          trendText += ` Distance from 52W High: ${distHigh}%`;
          trendText += `, from 52W Low: ${distLow}%.
`;
        }
      }
    } else {
        trendText += "Current market price data is unavailable.\n";
    }

    // Use data from quoteSummary() for other details
    const financialData = summaryDetails?.financialData;
    const summaryDetail = summaryDetails?.summaryDetail;
    const recommendationTrend = summaryDetails?.recommendationTrend?.trend?.[0];
    const earningsTrendData = summaryDetails?.earningsTrend?.trend?.[0];

    if (summaryDetail) {
      if (summaryDetail.trailingPE?.raw !== undefined) trendText += `P/E Ratio (TTM): ${summaryDetail.trailingPE.fmt || summaryDetail.trailingPE.raw.toFixed(2)}.
`;
      if (summaryDetail.forwardPE?.raw !== undefined) trendText += `Forward P/E: ${summaryDetail.forwardPE.fmt || summaryDetail.forwardPE.raw.toFixed(2)}.
`;
      // Market Cap is often available in `quoteData` as well, and might be more reliable
      const marketCap = quoteData?.marketCap || summaryDetail.marketCap?.raw;
      if (marketCap !== undefined) trendText += `Market Cap: ${typeof marketCap === 'number' ? marketCap.toLocaleString() : marketCap}.
`;
    }

    if (financialData) {
      if (financialData.targetMeanPrice?.raw !== undefined) trendText += `Analyst Mean Target Price: ${financialData.targetMeanPrice.fmt || financialData.targetMeanPrice.raw.toFixed(2)}.
`;
      if (financialData.recommendationKey) trendText += `Overall Analyst Recommendation: ${financialData.recommendationKey.toUpperCase()}.
`;
    }

    if (recommendationTrend) {
      trendText += `Analyst Actions (StrongBuy/Buy/Hold/Sell/StrongSell) for period ${recommendationTrend.period}: ${recommendationTrend.strongBuy}/${recommendationTrend.buy}/${recommendationTrend.hold}/${recommendationTrend.sell}/${recommendationTrend.strongSell}.
`;
    }
    
    if (earningsTrendData && earningsTrendData.endDate) {
        const avgEstimate = earningsTrendData.earningsEstimate?.avg?.fmt || (earningsTrendData.earningsEstimate?.avg?.raw !== undefined ? earningsTrendData.earningsEstimate.avg.raw.toFixed(2) : 'N/A');
        const lowEstimate = earningsTrendData.earningsEstimate?.low?.fmt || (earningsTrendData.earningsEstimate?.low?.raw !== undefined ? earningsTrendData.earningsEstimate.low.raw.toFixed(2) : 'N/A');
        const highEstimate = earningsTrendData.earningsEstimate?.high?.fmt || (earningsTrendData.earningsEstimate?.high?.raw !== undefined ? earningsTrendData.earningsEstimate.high.raw.toFixed(2) : 'N/A');
        trendText += `Earnings estimate for quarter ending ${earningsTrendData.endDate}: Avg ${avgEstimate}, Low ${lowEstimate}, High ${highEstimate}.
`;
    }

    if (trendText === `Trend Analysis for ${displayName}:\n`) {
        trendText = `Sufficient detailed trend data could not be generated for ${displayName} from available sources. Basic quote data may be available.`;
    }

    res.json({ 
        trendSummary: trendText,
    });

  } catch (error) {
    console.error(`Error fetching trend summary from Yahoo Finance for ${symbol}:`, error);
    if (error.message && (error.message.includes('No fundamentals data found') || error.message.toLowerCase().includes('not found') || error.message.includes('No summary data found'))) {
        return res.status(404).json({ error: `No data found for symbol ${symbol} to generate trend summary.` });
    }
    if (error.name === 'FailedYahooValidationError' || error.message?.includes('failed with status code 404')) { // Yahoo finance sometimes returns 404 for invalid symbols in quote
        return res.status(404).json({ error: `Invalid symbol or no data found for trend summary: ${symbol}. Details: ${error.message}` });
    }
    res.status(500).json({ error: 'Failed to generate trend summary from Yahoo Finance', details: error.message });
  }
});

export default router; 