import React, { useState } from 'react';
import axios from 'axios';

function StockSearch() {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol.trim()) {
      setError('Stock symbol is required.');
      setStockData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setStockData(null);

    let querySymbol = symbol.toUpperCase();
    if (!querySymbol.endsWith('.BO') && !querySymbol.endsWith('.NS')) {
      querySymbol += '.BO'; 
    }

    try {
      // Assuming your backend is on port 5001 now for this component too
      const response = await axios.get(`http://localhost:5001/api/stock?symbol=${querySymbol}`);
      
      if (response.data && response.data.symbol) {
        setStockData({
          symbol: response.data.symbol,
          open: response.data.regularMarketOpen?.toFixed(2) || 'N/A',
          high: response.data.regularMarketDayHigh?.toFixed(2) || 'N/A',
          low: response.data.regularMarketDayLow?.toFixed(2) || 'N/A',
          close: response.data.regularMarketPrice?.toFixed(2) || 'N/A',
          name: response.data.shortName || response.data.symbol, 
          exchange: response.data.fullExchangeName || 'N/A',
          date: response.data.regularMarketTime ? new Date(response.data.regularMarketTime * 1000).toLocaleDateString() : 'Current',
        });
      } else if (response.data && response.data.error) { 
        setError(response.data.error);
      } else {
        setError('Invalid data format received from API.');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error); 
      } else {
        setError('Failed to fetch stock data. Check if the server is running or the symbol is correct.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-6">Stock Search (Legacy)</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol (e.g., RELIANCE)"
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-md disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {stockData && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{stockData.name} ({stockData.symbol})</h2>
          <p className="text-gray-600 mb-1">Exchange: {stockData.exchange}</p>
          <p className="text-gray-600 mb-4">Data as of: {stockData.date}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Current Price (Close)</p>
              <p className="text-lg font-bold">₹{stockData.close}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-lg font-bold">₹{stockData.open}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">High</p>
              <p className="text-lg font-bold">₹{stockData.high}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Low</p>
              <p className="text-lg font-bold">₹{stockData.low}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockSearch; 