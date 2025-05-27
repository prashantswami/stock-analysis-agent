import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

const fetchDataFromYahooPage = async (url, type) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        // Mimic a browser request to reduce chances of being blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    
    let rows = $('div#scr-res-table table tbody tr'); 
    if (rows.length === 0) {
        rows = $('table[class*="W(100%)"] tbody tr');
    }
    if (rows.length === 0) {
        // One more attempt with a very generic table search if specific ones fail
        // This is risky as it might pick up unrelated tables.
        rows = $('table tbody tr').filter((i, el) => $(el).find('td').length >= 6); 
    }
    if (rows.length === 0) {
        console.warn(`No table rows found for ${type} on ${url} with any common selectors. Page structure might have changed significantly.`);
    }
    // For debugging, you can uncomment these lines locally:
    // console.log(`Initial HTML snippet from ${url} (first 300 chars): ${data.substring(0,300)}`);
    // console.log(`Number of rows found for ${type} on ${url}: ${rows.length}`);

    const movers = [];
    const desiredMoversCount = 5;

    rows.each((i, row) => {
      if (movers.length >= desiredMoversCount) return false; // Stop after collecting desired count

      const columns = $(row).find('td');
      // console.log(`Row ${i} for ${type} - Columns found: ${columns.length}`); // Uncomment for debugging
      
      if (columns.length >= 6) { // Check if there are enough columns for data
        const symbolLink = $(columns[0]).find('a[data-test="quoteLink"]'); // Specific selector for Yahoo's symbol link
        let symbol = symbolLink.text().trim(); 
        if (!symbol) { // Fallback if the specific data-test attribute is not found
            symbol = $(columns[0]).find('a').first().text().trim(); // Try any link in the first column
        }
        if (!symbol) { // Further fallback if no link, just take text (less reliable)
            symbol = $(columns[0]).text().trim();
        }

        const name = $(columns[1]).text().trim();
        const priceText = $(columns[2]).text().trim();
        const changeText = $(columns[4]).text().trim();         // Column 3 usually market time
        const percentChangeText = $(columns[5]).text().trim();

        // Uncomment for detailed row data debugging:
        // console.log(`  Symbol: ${symbol}, Name: ${name}, Price: ${priceText}, Change: ${changeText}, %Change: ${percentChangeText}`);

        if (symbol && name && priceText && priceText !== '-' && priceText !== 'N/A') { // Ensure essential data exists and isn't placeholder
          movers.push({
            symbol,
            shortName: name,
            regularMarketPrice: parseFloat(priceText.replace(/,/g, '')) || null,
            regularMarketChange: parseFloat(changeText.replace(/,/g, '')) || null,
            regularMarketChangePercent: parseFloat(percentChangeText.replace(/[^0-9.-]+/g, '')) || null,
          });
        }
      } else if (columns.length > 0 && columns.length < 6) { // Log rows that have some TDs but not enough (likely headers/footers/ads)
        // console.log(`Skipping row for ${type} - expected >=6 columns, got ${columns.length}. Row text: ${$(row).text().trim().substring(0,100)}`);
      }
    });
    
    // console.log(`Found ${movers.length} ${type}.`); // Uncomment for debugging
    return movers;
  } catch (error) {
    console.error(`Error scraping ${type} from ${url}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    throw new Error(`Failed to scrape ${type} data.`);
  }
};

router.get('/gainers', async (req, res) => {
  const url = 'https://in.finance.yahoo.com/gainers';
  try {
    const gainers = await fetchDataFromYahooPage(url, 'gainers');
    if (gainers.length === 0) {
      console.warn('No gainers found by scraper for /gainers endpoint. Page structure may have changed or no gainers met criteria.');
      return res.status(404).json({ error: 'No top gainers data could be scraped.', details: 'Scraper found no items, or page structure may have changed.' });
    }
    res.json(gainers);
  } catch (error) {
    res.status(500).json({ error: error.message, details: 'Error processing gainers data via scraping.' });
  }
});

router.get('/losers', async (req, res) => {
  const url = 'https://in.finance.yahoo.com/losers';
  try {
    const losers = await fetchDataFromYahooPage(url, 'losers');
    if (losers.length === 0) {
      console.warn('No losers found by scraper for /losers endpoint. Page structure may have changed or no losers met criteria.');
      return res.status(404).json({ error: 'No top losers data could be scraped.', details: 'Scraper found no items, or page structure may have changed.' });
    }
    res.json(losers);
  } catch (error) {
    res.status(500).json({ error: error.message, details: 'Error processing losers data via scraping.' });
  }
});

export default router; 