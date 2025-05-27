import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Chart from 'react-apexcharts'; // Import ApexCharts
import axios from 'axios'; // Ensure axios is imported
import MarketMovers from './MarketMovers'; // Import MarketMovers component
// import AskAI from './AskAI'; // Removed AskAI import for now
import { useDebounce } from '@uidotdev/usehooks'; // Assuming a hook like this or similar for debouncing

// Icons for Dark Mode Toggle
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
  </svg>
);

// Using a simple bar chart icon as a placeholder for the logo
const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-accent-blue">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3m-15.75 0h15.75M3.75 0v.001h15.75V0M3.75 3.75h15.75m-15.75 3.75h15.75m-15.75 3.75h15.75M3.75 15h15.75" />
  </svg>
);

// Simple check icon for button active state
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

// Icon for chart fullscreen toggle
const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9.75 9.75M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L14.25 14.25M3.75 20.25h4.5m-4.5 0v-4.5m0 4.5L9.75 14.25m10.5-4.5h-4.5m4.5 0v4.5m0-4.5L14.25 9.75" />
  </svg>
);

const CollapseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
  </svg>
);

const chartIntervals = [
  { label: 'Today', interval: '15m', range: '1d' }, // Intraday for current day (e.g., 15 min intervals)
  { label: '5D', interval: '1d', range: '5d' }, 
  { label: '1M', interval: '1d', range: '1mo' }, 
  { label: '6M', interval: '1d', range: '6mo' }, 
  { label: '1Y', interval: '1wk', range: '1y' }, 
  { label: '5Y', interval: '1mo', range: '5y' }, 
  { label: 'Max', interval: '3mo', range: 'max' }, 
  // { label: '1 Min', interval: '1m', range: '1d' }, // Example for 1-minute intraday
];

const StockAnalysisLayout = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [inputValue, setInputValue] = useState('^NSEI'); // Default to Nifty 50
  const [debouncedSymbol, setDebouncedSymbol] = useState('^NSEI'); // Symbol used for API calls, default to Nifty
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false); // For quote specific loading
  const [isLoadingChart, setIsLoadingChart] = useState(false); // For chart specific loading
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); // For AI analysis loading
  const [error, setError] = useState(null); // For general errors
  const [stockDetails, setStockDetails] = useState(null); // For quote data (price, P/E, etc.)
  const [aiAnalysis, setAiAnalysis] = useState('Enter a stock symbol to see analysis.');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('Trend Summary'); // For Trend/Fundamentals tabs
  const [activeMarketMoversTab, setActiveMarketMoversTab] = useState('Top Gainers'); // For Gainers/Losers tabs
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [selectedChartInterval, setSelectedChartInterval] = useState(chartIntervals[0]); // Default to Today (15 minutes)
  const [searchHistory, setSearchHistory] = useState([]); // State for search history
  const [showSuggestions, setShowSuggestions] = useState(false); // State to control suggestions visibility
  const [apiSuggestions, setApiSuggestions] = useState([]); // State for API-driven suggestions
  const [isLoadingApiSuggestions, setIsLoadingApiSuggestions] = useState(false); // State for API suggestions loading
  const [chart, setChart] = useState({
    series: [{ name: 'Closing Price', data: [] }],
    categories: [],
    error: null,
  });

  const debouncedInputValue = useDebounce(inputValue, 300); // Debounce input value for API calls

  // console.log(`[StockAnalysisLayout] Component Render. Current symbol state: '${debouncedSymbol}', inputValue state: '${inputValue}'`);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('stockSearchHistory');
    if (storedHistory) {
      setSearchHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Save search history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('stockSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const formatYahooSymbol = (symbolStr) => {
    if (!symbolStr) return '';
    const upperSymbol = symbolStr.toUpperCase();
    if (upperSymbol.includes('.') || upperSymbol.startsWith('^')) return upperSymbol; 
    return `${upperSymbol}.BO`; 
  };

  useEffect(() => {
    const fetchData = async () => {
      const symbolToFetch = debouncedSymbol;
      const currentInterval = selectedChartInterval;

      if (!symbolToFetch) {
        setStockDetails(null);
        setAiAnalysis('Enter a stock symbol to see analysis.');
        setChart({ series: [{ name: 'Closing Price', data: [] }], categories: [], error: null });
        setError(null);
        setIsLoading(false); setIsLoadingQuote(false); setIsLoadingChart(false); setIsLoadingAnalysis(false);
        return;
      }

      setIsLoading(true); 
      setIsLoadingQuote(true);
      setIsLoadingChart(true);
      // setIsLoadingAnalysis will be set specifically before each call
      setError(null);
      setChart(prev => ({ ...prev, error: null }));
      
      const yahooSymbol = formatYahooSymbol(symbolToFetch);

      try {
        let fetchedStockDetails = null;
        try {
          const quoteRes = await axios.get(`http://localhost:5001/api/stock?symbol=${yahooSymbol}`);
          if (quoteRes.data && quoteRes.data.symbol) {
            fetchedStockDetails = {
              symbol: quoteRes.data.symbol,
              name: quoteRes.data.shortName || quoteRes.data.longName || quoteRes.data.symbol,
              price: quoteRes.data.regularMarketPrice,
              change: quoteRes.data.regularMarketChange,
              changePercent: quoteRes.data.regularMarketChangePercent,
              high: quoteRes.data.regularMarketDayHigh,
              low: quoteRes.data.regularMarketDayLow,
              peRatio: quoteRes.data.trailingPE, 
              volume: quoteRes.data.regularMarketVolume,
              exchange: quoteRes.data.fullExchangeName,
              marketTime: quoteRes.data.regularMarketTime, 
              currency: quoteRes.data.currency || '' ,
              fundamentals: quoteRes.data.fundamentals || {} 
            };
            setStockDetails(fetchedStockDetails);
            console.log('Updated stockDetails:', fetchedStockDetails); 
            setError(null); 
          } else {
            const specificError = quoteRes.data?.error || 'Failed to parse stock quote';
            setError(specificError); 
            setStockDetails(null); 
          }
        } catch (err) {
          console.error('Error fetching stock quote:', err);
          const specificError = err.response?.data?.error || 'Quote unavailable.';
          setError(specificError); 
          setStockDetails(null);
        }
        setIsLoadingQuote(false);

        try {
          const historicalRes = await axios.get(`http://localhost:5001/api/stock/historical/${yahooSymbol}?interval=${currentInterval.interval}&range=${currentInterval.range}`);
          if (historicalRes.data && historicalRes.data.series && historicalRes.data.series[0].data.length > 0 && historicalRes.data.categories) {
            setChart({
              series: historicalRes.data.series.map(s => ({ ...s, name: `${yahooSymbol} ${s.name || 'Closing Price'}` })),
              categories: historicalRes.data.categories,
              error: null
            });
          } else {
             setChart({ series: [{ name: 'Closing Price', data: [] }], categories: [], error: historicalRes.data?.error || 'No chart data returned.' });
          }
        } catch (err) {
          console.error('Error fetching historical data:', err);
          setChart(prev => ({ ...prev, error: err.response?.data?.error || `Chart data unavailable for ${yahooSymbol}.`}));
        }
        setIsLoadingChart(false);
        
        // Logic for populating Trend Summary or AI-powered Fundamental Analysis
        if (fetchedStockDetails) { // Only proceed if basic stock details were fetched
            if (activeAnalysisTab === 'Trend Summary') {
                setIsLoadingAnalysis(true); 
                setAiAnalysis('Loading trend summary...');
                try {
                    const trendRes = await axios.get(`http://localhost:5001/api/trend-summary?symbol=${yahooSymbol}`);
                    setAiAnalysis(trendRes.data?.trendSummary || 'Trend summary could not be generated.');
                } catch (err) {
                    console.error('Error fetching trend summary:', err);
                    setAiAnalysis(err.response?.data?.error || 'Failed to fetch trend summary.');
                }
                setIsLoadingAnalysis(false);
            } else if (activeAnalysisTab === 'Fundamentals') {
                setIsLoadingAnalysis(true); 
                setAiAnalysis('Generating AI-powered fundamental analysis...');
                try {
                    const aiRes = await axios.post(`http://localhost:5001/api/ask-ai`, {
                        symbol: yahooSymbol,
                        question: "Generate an analysis of the provided financial fundamentals."
                    });
                    setAiAnalysis(aiRes.data?.answer || 'AI fundamental analysis could not be generated.');
                } catch (err) {
                    console.error('Error fetching AI fundamental analysis:', err);
                    setAiAnalysis(err.response?.data?.error || 'Failed to fetch AI fundamental analysis.');
                }
                setIsLoadingAnalysis(false);
            }
        } else {
            setAiAnalysis('Stock data failed to load. Cannot generate summary or analysis.');
            setIsLoadingAnalysis(false);
        }

      } catch (globalErr) { 
        console.error('Global error in fetchData:', globalErr);
        setError('An unexpected error occurred while fetching data.');
        setAiAnalysis('Could not complete analysis due to an error.');
        setIsLoadingQuote(false); setIsLoadingChart(false); setIsLoadingAnalysis(false);
      } finally {
        setIsLoading(false); 
      }
    };

    if (debouncedSymbol) { 
        fetchData();
    }
  }, [debouncedSymbol, selectedChartInterval, activeAnalysisTab]); 

  // Fetch API suggestions when debouncedInputValue changes
  useEffect(() => {
    const fetchApiSuggestions = async () => {
      if (debouncedInputValue && debouncedInputValue.length > 1) { // Only search if input is not empty and has some length
        setIsLoadingApiSuggestions(true);
        setApiSuggestions([]); // Clear previous API suggestions
        try {
          // Assuming your backend endpoint for symbol search is /api/symbolSearch
          const response = await axios.get(`http://localhost:5001/api/symbolSearch?query=${debouncedInputValue}`);
          if (response.data && response.data.quotes) {
            setApiSuggestions(response.data.quotes.slice(0, 7)); // Take top 7 results
          }
        } catch (error) {
          console.error("Error fetching API suggestions:", error);
          setApiSuggestions([]); // Clear on error
        }
        setIsLoadingApiSuggestions(false);
      } else {
        setApiSuggestions([]); // Clear if input is too short or empty
      }
    };

    if (showSuggestions) { // Only fetch if suggestions are meant to be shown
        fetchApiSuggestions();
    }
  }, [debouncedInputValue, showSuggestions]);

  const chartOptions = useMemo(() => ({
    chart: {
      id: 'stock-price-chart', type: 'line', 
      toolbar: { show: true }, animations: { enabled: !isChartFullscreen, easing: 'easeinout', speed: 800 },
    },
    xaxis: {
      categories: chart.categories,
      type: 'category',
      labels: {
        style: { colors: darkMode ? '#9CA3AF' : '#6B7280', fontSize: '10px' }, 
        rotate: -45, 
        hideOverlappingLabels: true, 
        trim: true, 
        datetimeUTC: false,
        formatter: function(value, timestamp, opts) {
          if (!value) return '';
          const date = new Date(value); 
          if (isNaN(date.getTime())) return value;

          const intervalLabel = selectedChartInterval.label; // Use label for logic
          const intervalValue = selectedChartInterval.interval; // Use interval for fine-tuning

          const day = ('0' + date.getDate()).slice(-2);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames[date.getMonth()];
          const year = date.getFullYear().toString().slice(-2);
          const hours = ('0' + date.getHours()).slice(-2);
          const minutes = ('0' + date.getMinutes()).slice(-2);

          // Check actual interval value for time display, not just label
          if (['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h'].includes(intervalValue)) {
            return `${hours}:${minutes}`;
          } else if (['5D', '1M', '6M'].includes(intervalLabel)) { // These are daily views
            return `${day} ${month}`;
          } else if (['1Y'].includes(intervalLabel)) { // This is weekly view
            return `${day} ${month}`;
          } else if (['5Y', 'Max'].includes(intervalLabel)) { // These are monthly/quarterly views
            return `${month} '${year}`;
          }
          return value; // Fallback to original value if no specific format matches (should ideally not happen)
        }
      },
      tickPlacement: 'on',
      title: { text: chart.categories.length ? 'Date' : '', style: { color: darkMode ? '#9CA3AF' : '#6B7280' } }
    },
    yaxis: {
      title: { text: 'Price', style: { color: darkMode ? '#9CA3AF' : '#6B7280' } }, // Removed currency symbol from axis title for generality
      labels: { style: { colors: darkMode ? '#9CA3AF' : '#6B7280', fontSize: '10px' }, formatter: (value) => value ? `${Number(value).toFixed(2)}` : "0" }, // Removed currency symbol
    },
    stroke: { curve: 'smooth', width: 2 },
    tooltip: { theme: darkMode ? 'dark' : 'light', x: { format: 'dd MMM yy' }, y: { formatter: (value) => value ? `${Number(value).toFixed(2)}` : "N/A" } }, // Removed currency symbol
    grid: { borderColor: darkMode ? '#374151' : '#E5E7EB' },
    markers: { size: chart.categories.length > 100 ? 0 : 3, strokeWidth: 0, hover: { size: 5 } },
    colors: [darkMode ? '#3B82F6' : '#2563EB'],
    title: {
      text: chart.error ? '' : (debouncedSymbol ? `${formatYahooSymbol(debouncedSymbol)} Price Movement` : 'Stock Chart'),
      align: 'center',
      style: { color: darkMode ? '#E5E7EB' : '#1F2937', fontSize: isChartFullscreen ? '18px' : '14px' } 
    },
    height: isChartFullscreen ? '100%' : '280px', // Ensure this is a string '280px' or number 280 if API expects that for non-fullscreen
  }), [chart.categories, chart.error, debouncedSymbol, darkMode, isChartFullscreen, selectedChartInterval]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false); // Hide suggestions on submit
    const symbolToSet = inputValue.trim().toUpperCase();
    if (symbolToSet) {
        setDebouncedSymbol(symbolToSet);
        setSelectedChartInterval(chartIntervals[0]);
        setError(null);
        setActiveAnalysisTab('Trend Summary'); // Reset to trend summary on new symbol search

        // Update search history
        setSearchHistory(prevHistory => {
          const newHistory = [symbolToSet, ...prevHistory.filter(item => item !== symbolToSet)];
          return newHistory.slice(0, 5); // Keep only the last 5 items
        });
        // setInputValue(''); // Optionally clear input after search
    } else {
        setError("Please enter a symbol.");
        setDebouncedSymbol('');
        setStockDetails(null);
    }
  };

  const toggleChartFullscreen = () => {
    setIsChartFullscreen(!isChartFullscreen);
  };

  // Effect to handle body scroll and ESC key for fullscreen
  useEffect(() => {
    const body = document.body;
    if (isChartFullscreen) {
      body.style.overflow = 'hidden'; // Prevent scrolling when chart is fullscreen
    } else {
      body.style.overflow = 'auto';
    }

    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isChartFullscreen) {
        setIsChartFullscreen(false);
      }
      if (event.key === 'Escape' && showSuggestions) {
        setShowSuggestions(false); // Hide suggestions on ESC
      }
    };

    const handleClickOutside = (event) => {
      // Assuming search form has a specific class or ref for identification, e.g., an id 'search-form-container'
      // For now, let's make a simpler check. If you have a ref for the form, that would be better.
      if (event.target.closest('form') === null || !event.target.closest('form').className.includes('relative')){
         setShowSuggestions(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      body.style.overflow = 'auto'; // Ensure scroll is restored on component unmount
      window.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChartFullscreen, showSuggestions]);

  const getFormattedPrice = (price, currency) => {
    if (price === null || price === undefined || price === 'N/A') return 'N/A';
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) return 'N/A';
    // Basic currency formatting, can be expanded
    const symbols = { 'INR': '₹', 'USD': '$' };
    return `${symbols[currency] || currency || ''}${numericPrice.toFixed(2)}`;
  };

  const getFormattedChange = (change, changePercent, currency) => {
    if (change === null || change === undefined || changePercent === null || changePercent === undefined) return 'N/A';
    const numericChange = Number(change);
    const numericChangePercent = Number(changePercent);
    if (isNaN(numericChange) || isNaN(numericChangePercent)) return 'N/A';
    const sign = numericChange >= 0 ? '+' : '-';
    const symbols = { 'INR': '₹', 'USD': '$' };
    return `${sign}${symbols[currency] || currency || ''}${Math.abs(numericChange).toFixed(2)} (${sign}${numericChangePercent.toFixed(2)}%)`;
  };

  const getFormattedMarketTime = (timestamp) => {
    if (timestamp && typeof timestamp === 'number' && timestamp > 0) {
      return new Date(timestamp * 1000).toLocaleTimeString();
    }
    return 'N/A';
  };

  const handleSuggestionClick = (itemSymbol, itemName) => {
    const symbolToSearch = itemSymbol; // API results usually give symbol directly
    setInputValue(symbolToSearch); // Update input with the symbol
    setShowSuggestions(false);
    setDebouncedSymbol(symbolToSearch.toUpperCase());
    setSelectedChartInterval(chartIntervals[0]);
    setError(null);
    setActiveAnalysisTab('Trend Summary');
    // Update local search history with the selected symbol
    setSearchHistory(prevHistory => {
      const newHistory = [symbolToSearch, ...prevHistory.filter(hItem => hItem !== symbolToSearch)];
      return newHistory.slice(0, 5);
    });
    setApiSuggestions([]); // Clear API suggestions after selection
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 transition-colors duration-300`}>
      {/* Header */}
      {!isChartFullscreen && (
        <header className="p-3 bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30">
          <div className="container mx-auto flex items-center max-w-full px-2 sm:px-4">
            <div className="flex items-center space-x-2">
              <LogoIcon />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Stock Analysis</h1>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-grow mx-4 sm:mx-8 flex justify-center relative">
              <div className="w-full max-w-md">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (e.target.value.trim() === '') {
                      setShowSuggestions(false); // Hide if input cleared
                      setApiSuggestions([]); // Clear API suggestions if input is empty
                    } else {
                      setShowSuggestions(true); 
                    }
                  }} 
                  onFocus={() => {
                    if (inputValue.trim() !== '') setShowSuggestions(true);
                  }} 
                  placeholder="Enter Stock Symbol (e.g., MSFT or Tata Motors)"
                  className="px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue dark:bg-gray-700 dark:text-white text-sm sm:text-base w-full"
                  autoComplete="off" 
                />
                {showSuggestions && inputValue.trim() !== '' && (
                  <ul 
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20 max-h-[400px] overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()} 
                  >
                    {/* Local Search History Suggestions */}
                    {searchHistory
                      .filter(item => item.toLowerCase().includes(inputValue.toLowerCase()) && item.toLowerCase() !== inputValue.toLowerCase())
                      .map((item, index) => (
                        <li 
                          key={`hist-${index}`} 
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-700 dark:text-gray-200 text-sm"
                          onClick={() => handleSuggestionClick(item, item)} // For history, symbol and name are the same
                        >
                          <span className="font-semibold">{item}</span> <span className="text-xs text-gray-500 dark:text-gray-400">(Recent)</span>
                        </li>
                      ))}
                    
                    {/* Separator if both history and API suggestions exist */}
                    {searchHistory.filter(item => item.toLowerCase().includes(inputValue.toLowerCase()) && item.toLowerCase() !== inputValue.toLowerCase()).length > 0 && apiSuggestions.length > 0 && (
                        <hr className="border-gray-200 dark:border-gray-600" />
                    )}

                    {/* API Suggestions Loading State */}
                    {isLoadingApiSuggestions && (
                        <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm italic">Loading suggestions...</li>
                    )}

                    {/* API Suggestions Results */}
                    {!isLoadingApiSuggestions && apiSuggestions.map((quote, index) => (
                        // Avoid showing API suggestion if it's identical to a history item already shown or current input
                        !searchHistory.some(histItem => histItem.toLowerCase() === quote.symbol.toLowerCase()) && quote.symbol.toLowerCase() !== inputValue.toLowerCase() && (
                            <li 
                                key={`api-${quote.symbol}-${index}`} 
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-700 dark:text-gray-200 text-sm"
                                onClick={() => handleSuggestionClick(quote.symbol, quote.shortname || quote.longname || quote.symbol)}
                            >
                                <span className="font-semibold">{quote.symbol}</span> - {quote.shortname || quote.longname || 'N/A'} <span className="text-xs text-gray-500 dark:text-gray-400">({quote.exchange})</span>
                            </li>
                        )
                    ))}

                    {/* No matches message */}
                    {!isLoadingApiSuggestions && 
                     searchHistory.filter(item => item.toLowerCase().includes(inputValue.toLowerCase()) && item.toLowerCase() !== inputValue.toLowerCase()).length === 0 && 
                     apiSuggestions.filter(quote => !searchHistory.some(histItem => histItem.toLowerCase() === quote.symbol.toLowerCase()) && quote.symbol.toLowerCase() !== inputValue.toLowerCase()).length === 0 &&
                     inputValue.length > 1 && (
                        <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm italic">No matches found.</li>
                    )}
                  </ul>
                )}
              </div>
            </form>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400">
                {darkMode ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-grow container mx-auto p-2 sm:p-3 ${isChartFullscreen ? 'max-w-full h-full fixed inset-0 z-50 bg-white dark:bg-gray-900' : 'max-w-full' }`}>
        {(isLoading && !stockDetails && !isChartFullscreen) && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            Loading initial data for {debouncedSymbol}...
          </div>
        )}
        
        {error && !isLoadingQuote && (
           <div className="my-4 p-3 bg-red-100 dark:bg-red-700 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-100 rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* --- Basic Info Section Logic --- */}
        {!isChartFullscreen && (
          <> 
            {/* 1. Loading Skeleton for Basic Info */}
            {isLoadingQuote && (
              <section className="my-2 p-3 sm:p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg animate-pulse">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-2 sm:mb-0 w-3/5">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="text-left sm:text-right w-2/5">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 ml-auto mb-1"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 ml-auto"></div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 mb-1"></div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Actual Basic Info Content */}
            {!isLoadingQuote && stockDetails && (
              <section className="my-2 p-3 sm:p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-2 sm:mb-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stockDetails.name} ({stockDetails.symbol})</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stockDetails.exchange} - Real Time Price. Currency in {stockDetails.currency}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`text-3xl sm:text-4xl font-bold ${stockDetails.change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {getFormattedPrice(stockDetails.price, stockDetails.currency)}
                    </p>
                    <p className={`text-sm font-medium ${stockDetails.change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        {getFormattedChange(stockDetails.change, stockDetails.changePercent, stockDetails.currency)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Day's Range</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{getFormattedPrice(stockDetails.low, stockDetails.currency)} - {getFormattedPrice(stockDetails.high, stockDetails.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Volume</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{stockDetails.volume?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">P/E Ratio (TTM)</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{stockDetails.peRatio?.toFixed(2) || 'N/A'}</p>
                  </div>
                   <div>
                    <p className="text-gray-500 dark:text-gray-400">Market Time</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {getFormattedMarketTime(stockDetails.marketTime)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Empty/Error Placeholder for Basic Info (maintains space) */}
            {!isLoadingQuote && !stockDetails && (
              <section className="my-2 p-3 sm:p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-2 sm:mb-0 w-3/5">
                    <div className="h-8 bg-gray-100 dark:bg-gray-700/50 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-1/2"></div>
                  </div>
                  <div className="text-left sm:text-right w-2/5">
                    <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded w-3/4 ml-auto mb-1"></div>
                    <div className="h-6 bg-gray-100 dark:bg-gray-700/50 rounded w-1/2 ml-auto"></div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-3/5 mb-1"></div>
                      <div className="h-5 bg-gray-100 dark:bg-gray-700/50 rounded w-4/5"></div>
                    </div>
                  ))}
                </div>
                 <div className="text-center text-gray-400 dark:text-gray-500 pt-2 text-xs">
                   Basic info unavailable or symbol not found.
                </div>
              </section>
            )}
          </>
        )}

        {/* Chart and Right Column (Analysis/Market Movers) Section */}
        {!isChartFullscreen && (
          <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Chart Area - Spans 3 columns as market movers are gone */}
            <div className={`md:col-span-3 bg-white dark:bg-gray-800 p-2 sm:p-3 shadow-lg rounded-lg min-h-[370px]`}>
              {/* Chart Controls: Fullscreen button - Rendered only when chart data is present and not loading/error */}
              {!isLoadingChart && !chart.error && chart.series[0]?.data.length > 0 && (
                <div className="flex justify-end items-center mb-1"> {/* Reduced mb slightly */}
                  <button 
                    onClick={toggleChartFullscreen}
                    className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    title={isChartFullscreen ? "Exit Fullscreen" : "Expand Chart"}
                  >
                    {isChartFullscreen ? <CollapseIcon /> : <ExpandIcon />}
                  </button>
                </div>
              )}

              {/* Fixed Height Container for Chart Content (Skeleton, Chart, Error, No Data) */}
              <div className="w-full h-[280px] relative rounded-md"> {/* Base container for visual content */}
                {isLoadingChart && !chart.error && ( // Skeleton visible when loading and no error has occurred yet
                  <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
                  </div>
                )}

                {!isLoadingChart && chart.error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                    <p className="font-semibold text-lg">Chart Error</p>
                    <p className="text-sm">{chart.error}</p>
                  </div>
                )}

                {!isLoadingChart && !chart.error && chart.series[0]?.data.length > 0 && (
                  // ApexChart will fill this container. chartOptions ensures height is 100% or 280px.
                  <Chart 
                    options={chartOptions} 
                    series={chart.series} 
                    type="line" 
                    width="100%" 
                    height="100%" // Chart takes 100% height of its 280px parent
                  />
                )}

                {!isLoadingChart && !chart.error && !chart.series[0]?.data.length && debouncedSymbol && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                    <p className="font-semibold">No Chart Data</p>
                    <p className="text-sm">No data available for {debouncedSymbol} with interval {selectedChartInterval.label}.</p>
                  </div>
                )}
              </div>

              {/* Chart Controls: Interval buttons - Rendered only when chart data is present and not loading/error */}
              {!isLoadingChart && !chart.error && chart.series[0]?.data.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {chartIntervals.map(intervalObj => (
                    <button
                      key={intervalObj.label}
                      onClick={() => setSelectedChartInterval(intervalObj)}
                      className={`px-1.5 py-0.5 text-xs rounded-md transition-colors duration-150 
                                ${selectedChartInterval.label === intervalObj.label 
                                  ? 'bg-accent-blue text-white shadow-md' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                      {intervalObj.label}
                      {selectedChartInterval.label === intervalObj.label && <CheckIcon />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Market Movers Tabs */}
            {/* <div className="md:col-span-1 bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-lg rounded-lg flex flex-col">
              <div className="mb-3 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-2 sm:space-x-3" aria-label="Market Movers Tabs">
                  {['Top Gainers', 'Top Losers'].map((tabName) => (
                    <button
                      key={tabName}
                      onClick={() => setActiveMarketMoversTab(tabName)}
                      className={`whitespace-nowrap py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-150
                        ${
                          activeMarketMoversTab === tabName
                            ? 'border-accent-blue text-accent-blue dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      {tabName}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700" style={{minHeight: '280px'}}>
                <MarketMovers listType={activeMarketMoversTab === 'Top Gainers' ? 'gainers' : 'losers'} />
              </div>
            </div> */}
          </div>
        )}

        {/* Analysis Tabs Section (Trend/Fundamentals) - Below Chart/MarketMovers grid, Full Width */} 
        {!isChartFullscreen && stockDetails && (
            <div className="mt-3 bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-lg rounded-lg">
                <div className="mb-3 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-2 sm:space-x-3" aria-label="Analysis Tabs">
                    {['Trend Summary', 'Fundamentals'].map((tabName) => (
                        <button
                        key={tabName}
                        onClick={() => setActiveAnalysisTab(tabName)} 
                        className={`whitespace-nowrap py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-150
                            ${
                            activeAnalysisTab === tabName
                                ? 'border-accent-blue text-accent-blue dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                            }
                        `}
                        >
                        {tabName}
                        </button>
                    ))}
                    </nav>
                </div>

                {/* Fixed height container for analysis content */}
                <div className="h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700 p-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1"> {/* Sticky title */}
                      {activeAnalysisTab === 'Fundamentals' 
                        ? `Fundamental Analysis: ${debouncedSymbol}` 
                        : `Trend Summary: ${debouncedSymbol}`}
                    </h3>
                    {isLoadingAnalysis && (
                      <div className="space-y-2 animate-pulse pt-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    )}
                    {!isLoadingAnalysis && aiAnalysis && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap pt-2">
                        {aiAnalysis}
                      </p>
                    )}
                    {/* Fallback for when analysis is not loading and no aiAnalysis text (e.g. initial state or error not caught by aiAnalysis string itself) */}
                    {!isLoadingAnalysis && !aiAnalysis && stockDetails && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 pt-2">{activeAnalysisTab} not available for {debouncedSymbol}.</p>
                    )}
                    {/* This case should ideally be handled by the parent !stockDetails check, but as a safeguard: */}
                    {!isLoadingAnalysis && !stockDetails && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 pt-2">Load stock data to see {activeAnalysisTab.toLowerCase()}.</p>
                    )}
                </div>
            </div>
        )}
        
        {isChartFullscreen && stockDetails && chart.series[0]?.data.length > 0 && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 p-2 sm:p-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">{formatYahooSymbol(debouncedSymbol)} Price Movement</h2>
                  <button 
                      onClick={toggleChartFullscreen}
                      className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      title="Exit Fullscreen"
                  >
                      <CollapseIcon />
                  </button>
              </div>
              <div className="flex-grow" style={{ height: 'calc(100% - 40px)' }}>
                <Chart 
                  options={chartOptions} 
                  series={chart.series} 
                  type="line" 
                  width="100%" 
                  height="100%"
                />
              </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockAnalysisLayout; 