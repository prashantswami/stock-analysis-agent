import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts'; // Import ApexCharts
import axios from 'axios'; // Ensure axios is imported

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

const StockAnalysisLayout = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    }
    return false;
  });

  const [inputValue, setInputValue] = useState(''); // For immediate input updates - Default to empty
  const [symbol, setSymbol] = useState(''); // Debounced symbol for API calls - Default to empty
  const [isLoading, setIsLoading] = useState(false); // Will be set to true on initial load
  const [error, setError] = useState(null);
  const [stockDetails, setStockDetails] = useState(null); // Will be { price, highLow, peRatio, volume }
  const [aiAnalysis, setAiAnalysis] = useState('Enter a stock symbol to begin analysis.'); // Initial message changed
  const [activeTab, setActiveTab] = useState('Trend Summary');
  const [trendApiResult, setTrendApiResult] = useState(null); // State for API trend summary

  console.log(`[StockAnalysisLayout] Component Render. Current symbol state: '${symbol}', inputValue state: '${inputValue}'`);

  const initialChartOptions = {
    chart: {
      id: 'stock-closing-price',
      type: 'line',
      height: '100%',
      toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
      animations: { enabled: true, easing: 'easeinout', speed: 800 },
    },
    xaxis: {
      type: 'category', // Dates are currently strings
      categories: [], 
      labels: {
        style: { 
          colors: darkMode ? '#9CA3AF' : '#6B7280', // Adjusted based on darkMode directly
          fontSize: '10px' // Slightly smaller font size
        },
        rotate: -45, // Rotate labels
        rotateAlways: false,
        hideOverlappingLabels: true,
        trim: true,
        datetimeUTC: false, // Important if formatting dates manually
      },
      tickPlacement: 'on',
    },
    yaxis: {
      title: { text: 'Price', style: { color: darkMode ? '#9CA3AF' : '#6B7280' } },
      labels: {
        style: { colors: darkMode ? '#9CA3AF' : '#6B7280', fontSize: '10px' },
        formatter: function (value) { return value ? "₹" + value.toFixed(2) : "₹0"; }
      },
    },
    stroke: { curve: 'smooth', width: 2 },
    tooltip: { 
        theme: darkMode ? 'dark' : 'light', 
        x: { format: 'dd MMM' },
        y: {
            formatter: function (value) {
                return "₹" + value.toFixed(2);
            }
        }
    },
    grid: { borderColor: darkMode ? '#374151' : '#E5E7EB' },
    markers: { size: 0, strokeWidth: 0, hover: { size: 5 } },
    colors: [darkMode ? '#3B82F6' : '#2563EB']
  };

  const [chartData, setChartData] = useState({
    options: initialChartOptions,
    series: [{ name: 'Closing Price', data: [] }],
  });

  // Effect to load default symbol data on mount - REMOVED
  // useEffect(() => {
  //   if (symbol === 'NIFTY') { // Check if it's the initial default symbol
  //       setIsLoading(true); // Explicitly set loading for initial fetch
  //       setAiAnalysis(`Loading ${symbol} data for ${activeTab}...`);
  //       handleAnalyzeStock(activeTab, 'NIFTY');
  //   }
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []); // Run once on mount

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
    setChartData(prevData => ({
      ...prevData,
      options: {
        ...prevData.options,
        xaxis: { ...prevData.options.xaxis, labels: { ...prevData.options.xaxis.labels, style: { ...prevData.options.xaxis.labels.style, colors: darkMode ? '#9CA3AF' : '#6B7280' } } },
        yaxis: { ...prevData.options.yaxis, title: {...prevData.options.yaxis.title, style: {color: darkMode ? '#9CA3AF' : '#6B7280'}}, labels: { ...prevData.options.yaxis.labels, style: { ...prevData.options.yaxis.labels.style, colors: darkMode ? '#9CA3AF' : '#6B7280' } } },
        tooltip: { ...prevData.options.tooltip, theme: darkMode ? 'dark' : 'light' },
        grid: { ...prevData.options.grid, borderColor: darkMode ? '#374151' : '#E5E7EB' },
        colors: [darkMode ? '#3B82F6' : '#2563EB'],
        title: { ...prevData.options.title, style: {...prevData.options.title?.style, color: darkMode ? '#E5E7EB' : '#1F2937'}}
      }
    }));
  }, [darkMode]);

  // Debounce effect for symbol input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.trim() !== symbol.trim()) {
        if (inputValue.trim() === '' && symbol.trim() !== '') {
          console.log(`[DebounceEffect] Clearing symbol. Old symbol: '${symbol}'`); // Added log
          setSymbol(''); 
        } else if (inputValue.trim() !== '') {
          console.log(`[DebounceEffect] Setting symbol from inputValue. inputValue: '${inputValue.trim()}', Old symbol: '${symbol}'`); // Added log
          setSymbol(inputValue.trim()); 
        }
      }
    }, 300); 

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, symbol]); // Re-run if inputValue or current symbol changes

  // Effect to trigger analysis when debounced symbol changes
  useEffect(() => {
    // if (symbol.trim() && symbol !== 'NIFTY') { // Avoid re-fetching NIFTY if it was initial load - Condition changed
    if (symbol.trim()) { // If there's a symbol, and it's not the initial empty string
      setAiAnalysis(`Loading ${symbol} data for ${activeTab}...`);
      handleAnalyzeStock(activeTab, symbol);
    } else if (symbol.trim() === '' && stockDetails !== null) { // If symbol is cleared
        setError(null);
        setStockDetails(null);
        setAiAnalysis('Enter symbol and select an action.');
        setChartData(prevData => ({ ...prevData, series: [{ name: 'Closing Price', data: [] }], options: {...prevData.options, title: {text: undefined, style:{color: darkMode ? '#E5E7EB' : '#1F2937'}}, xaxis: {...prevData.options.xaxis, categories: []}} }));
    }
    // Do not add handleAnalyzeStock or activeTab to dependencies to avoid re-triggering on tab change without symbol change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, activeTab]); // Re-run analysis if debounced symbol or activeTab changes (activeTab added to re-fetch for new tab with same symbol)

  const fetchTrendSummary = async (symbolToFetch) => {
    console.log(`[fetchTrendSummary] TOP LEVEL - Received symbolToFetch: '${symbolToFetch}'`); // Added log
    if (!symbolToFetch.trim()) return;
    // Part of overall loading, aiAnalysis message will be updated by caller
    // setIsLoading(true); 
    // setAiAnalysis(`Fetching trend summary for ${symbolToFetch}...`);
    console.log(`[fetchTrendSummary] Fetching for symbol: ${symbolToFetch}`); // Added log
    try {
      const response = await axios.get(`http://localhost:5001/api/trend-summary?symbol=${symbolToFetch}`);
      console.log('[fetchTrendSummary] API Response:', response.data); // Added log
      setTrendApiResult({
        trendSummary: response.data.trendSummary,
        priceDataUsed: response.data.priceDataUsed,
      });
      // If the current active tab is Trend Summary, update aiAnalysis directly
      if (activeTab === 'Trend Summary') {
        const summary = response.data.trendSummary;
        console.log('[fetchTrendSummary] Setting AI Analysis for Trend Summary tab:', summary); // Added log
        setAiAnalysis(summary || 'Trend summary loaded.');
      }
    } catch (err) {
      console.error("[fetchTrendSummary] Error fetching trend summary:", err); // Added log
      const errorMessage = err.response?.data?.error || 'Failed to fetch trend summary.';
      // Only set AI analysis error if Trend Summary tab is active
      if (activeTab === 'Trend Summary') {
        console.log('[fetchTrendSummary] Setting AI Analysis ERROR for Trend Summary tab:', errorMessage); // Added log
        setAiAnalysis(errorMessage);
      }
      // Optionally, set a more general error or handle specifically for trendApiResult
      setTrendApiResult({ trendSummary: errorMessage, priceDataUsed: [] }); 
    }
    // setIsLoading(false); // Loading is managed by the calling function (handleAnalyzeStock)
  };

  const handleAnalyzeStock = async (analysisType = activeTab, symbolToFetch = symbol) => {
    console.log(`[handleAnalyzeStock] TOP LEVEL - Received symbolToFetch: '${symbolToFetch}', analysisType: '${analysisType}'`); // Added log

    if (!symbolToFetch.trim()) {
      setError('Please enter a stock symbol.');
      setStockDetails(null);
      setAiAnalysis('Enter symbol and select an action.');
      setChartData(prevData => ({ ...prevData, series: [{ name: 'Closing Price', data: [] }], options: {...prevData.options, title: {text: undefined, style:{color: darkMode ? '#E5E7EB' : '#1F2937'}}, xaxis: {...prevData.options.xaxis, categories: []}} }));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    
    let querySymbol;
    const upperSymbol = symbolToFetch.toUpperCase();
    if (upperSymbol.endsWith('.BSE') || upperSymbol.endsWith('.NS') || upperSymbol.startsWith('^')) {
      querySymbol = upperSymbol;
    } else if (upperSymbol.trim() !== '') { // Only add suffix if not empty
      querySymbol = upperSymbol + '.BSE'; // Default to .BSE
    } else {
      querySymbol = ''; // Keep it empty if input was empty
    }

    console.log(`[handleAnalyzeStock] Derived querySymbol: '${querySymbol}'`); 

    if (analysisType === 'Trend Summary') {
      setAiAnalysis(`Fetching trend summary for ${querySymbol}...`);
      await fetchTrendSummary(querySymbol);
      setIsLoading(false); // Ensure loading is stopped after fetchTrendSummary completes
      return; // Exit early, skip other mock data
    }

    // Set initial AI analysis message based on the analysis type for other tabs
    setAiAnalysis(`Loading ${querySymbol} data for ${analysisType}...`);

    // Simulate base data fetching delay
    await new Promise(resolve => setTimeout(resolve, 900));
    try {
      const baseData = {
        symbol: querySymbol,
        price: (querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) ? (Math.random() * 5000 + 18000).toFixed(2) : (Math.random() * 100 + 2800).toFixed(2),
        highLow: `${((querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) ? (Math.random() * 400 + 17800) : (Math.random() * 90 + 2750)).toFixed(2)} / ${((querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) ? (Math.random() * 600 + 18200) : (Math.random() * 120 + 2850)).toFixed(2)}`,
        peRatio: (querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) ? (Math.random() * 5 + 20).toFixed(1) : (Math.random() * 10 + 25).toFixed(1),
        volume: (querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) ? (Math.random() * 100 + 150).toFixed(0) + 'M' : (Math.random() * 5 + 1).toFixed(1) + 'M',
      };
      setStockDetails(baseData);

      const numDataPoints = 30;
      const newSeriesData = Array.from({length: numDataPoints}, (_, i) => {
        return (querySymbol.includes('NIFTY') || querySymbol.includes('NSEI')) 
               ? parseFloat((Math.random() * 200 + 18000 - (numDataPoints - i) * 5).toFixed(2))
               : parseFloat((Math.random() * 20 + 100 - (numDataPoints - i) * 0.5).toFixed(2));
      });
      const newCategories = Array.from({length: numDataPoints}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (numDataPoints - 1 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      setChartData(prevData => ({
        ...prevData,
        series: [{ name: `${querySymbol} Closing Price`, data: newSeriesData }],
        options: {
            ...prevData.options,
            xaxis: {
                ...prevData.options.xaxis,
                categories: newCategories,
            },
            title: {
                text: `${querySymbol} Price Movement (Last 30 Days)`,
                align: 'center',
                style: {
                    color: darkMode ? '#E5E7EB' : '#1F2937' 
                }
            }
        }
      }));

      // Fetch actual trend summary if that's the active tab/analysis type
      if (analysisType === 'Fundamentals') {
        setAiAnalysis(`Fundamentals for ${querySymbol}: Index P/E at ${baseData.peRatio}. Overall market breadth is positive. Watch for sector rotations.`);
      } else if (analysisType === 'Ask AI') {
        setAiAnalysis(`AI Query for ${querySymbol}: Current sentiment is neutral to slightly bullish. Algorithmic models predict range-bound movement in the short term with potential for upward breakout if global cues remain supportive.`);
      } else { // Default or Basic Info (if we add it back)
        setAiAnalysis(`Overview for ${querySymbol}: Displaying key index data. Use tabs for detailed market analysis.`);
      }

    } catch (err) {
      console.error("Error in handleAnalyzeStock:", err);
      setError('Failed to fetch stock/index data.');
      setStockDetails(null);
      setAiAnalysis('Error fetching analysis.');
    }
    setIsLoading(false);
  };
  
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    // Use inputValue for immediate submission, then let debounce catch up or trigger directly
    const currentSymbolToSubmit = inputValue.trim();
    if (currentSymbolToSubmit) {
      setSymbol(currentSymbolToSubmit); // Update main symbol state immediately for submission
      setAiAnalysis(`Loading ${currentSymbolToSubmit} data for ${activeTab}...`);
      handleAnalyzeStock(activeTab, currentSymbolToSubmit);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    const currentSymbol = symbol.trim();
    console.log(`[handleTabClick] Tab clicked: ${tab}, Current symbol: ${currentSymbol}`); // Added log

    if (currentSymbol) {
      if (tab === 'Trend Summary') {
        console.log('[handleTabClick] Trend Summary tab selected. Current AI Analysis before fetch:', aiAnalysis); // Added log
        setAiAnalysis(`Fetching trend summary for ${currentSymbol}...`);
        setIsLoading(true); // Set loading before async operations
        fetchTrendSummary(currentSymbol).finally(() => {
          console.log('[handleTabClick] Trend Summary fetch complete (finally block).'); // Added log
          setIsLoading(false);
        }); 
      } else {
        // For other tabs, use the existing mock data logic within handleAnalyzeStock
        // or fetch specific data if those tabs also become API-driven
        setAiAnalysis(`Loading ${currentSymbol} data for ${tab}...`);
        setIsLoading(true);
        handleAnalyzeStock(tab, currentSymbol); // This will set isLoading to false internally
      }
    } else {
      setAiAnalysis('Enter symbol and select an action.');
      setTrendApiResult(null); // Clear trend result if no symbol
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans">
      {/* Header */}
      <header className="w-full bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <h1 className="text-xl font-semibold">Stock Analysis Agent</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-accent-blue text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-primary flex items-center transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
          >
            {darkMode ? <MoonIcon /> : <SunIcon />} 
            <span className="ml-2">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-7xl mx-auto mt-6 sm:mt-8 mb-8 p-4 sm:p-6 bg-white dark:bg-primary rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Input Section */}
        <form onSubmit={handleSymbolSubmit} className="mb-6">
          <input
            type="text"
            value={inputValue} // Bind to inputValue for immediate UI update
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue); // Update inputValue immediately
              if(!newValue.trim()) {
                setError(null);
                // Don't clear stockDetails or AI analysis here directly, let the debounce effect handle it
                // to avoid UI flickering if user types again quickly.
                // The useEffect for 'symbol' will handle resetting the view when symbol becomes empty.
              }
            }}
            placeholder="Enter stock symbol (e.g. INFY, TCS)" // Updated placeholder
            className="w-full p-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue placeholder-gray-500 dark:placeholder-gray-400 text-base"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>

        {/* Chart and AI Insight Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/70 p-2 sm:p-1 rounded-lg flex flex-col items-center justify-center min-h-[300px] md:min-h-[350px] text-center border border-gray-200 dark:border-gray-700 relative">
            {(isLoading && !chartData.series[0]?.data?.length) && <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>} 
            {(!inputValue.trim() || error) && !isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Enter a valid symbol to view chart.</p>}
            {!isLoading && !error && inputValue.trim() && chartData.series[0]?.data?.length > 0 && (
              <div className="w-full h-full pt-2">
                <Chart
                  options={chartData.options}
                  series={chartData.series}
                  type="line"
                  width="100%"
                  height="100%"
                />
              </div>
            )}
             {!isLoading && !error && inputValue.trim() && chartData.series[0]?.data?.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No chart data available for {inputValue}.</p>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/70 p-4 sm:p-6 rounded-lg flex flex-col min-h-[300px] md:min-h-[350px] border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">AI Insight</h2>
            {isLoading && inputValue.trim() ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{aiAnalysis}</p>
            ) : (
              <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded-md max-h-[280px] scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {/* Display aiAnalysis which is now populated by API for Trend Summary */}
                  {aiAnalysis}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Basic Info Section */}
        {stockDetails && !isLoading && (
          <section className="mb-6 p-4 sm:p-6 bg-white dark:bg-primary rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Basic Info: {stockDetails.symbol}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Price</p>
                <p className="font-medium text-gray-900 dark:text-white">₹{stockDetails.price}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">High/Low</p>
                <p className="font-medium text-gray-900 dark:text-white">{stockDetails.highLow}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">P/E Ratio</p>
                <p className="font-medium text-gray-900 dark:text-white">{stockDetails.peRatio}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Volume</p>
                <p className="font-medium text-gray-900 dark:text-white">{stockDetails.volume}</p>
              </div>
            </div>
          </section>
        )}

        {/* Action Tabs Section */}
        <section>
          <div className="border-b border-gray-300 dark:border-gray-600">
            <nav className="-mb-px flex space-x-4 sm:space-x-6" aria-label="Tabs">
              {['Trend Summary', 'Fundamentals', 'Ask AI'].map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => handleTabClick(tabName)}
                  disabled={isLoading || !inputValue.trim()} // Also disable if no symbol
                  className={`whitespace-nowrap py-3 px-4 rounded-t-md border-b-2 font-medium text-sm transition-all duration-200 ease-in-out 
                    ${activeTab === tabName
                      ? 'border-accent-blue text-accent-blue bg-gray-100 dark:bg-gray-700/60'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-accent-blue
                  `}
                >
                  {isLoading && activeTab === tabName && inputValue.trim() ? 'Loading...' : tabName} 
                </button>
              ))}
            </nav>
          </div>
        </section>

      </main>
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} Stock Analysis Agent. For display purposes.</p>
      </footer>
    </div>
  );
};

export default StockAnalysisLayout; 