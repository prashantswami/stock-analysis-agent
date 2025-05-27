import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MarketMovers = ({ listType }) => {
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovers = async () => {
      setLoading(true);
      setError(null);
      setMovers([]);
      const endpoint = listType === 'gainers' ? '/api/market/gainers' : '/api/market/losers';
      const title = listType === 'gainers' ? 'Top Gainers' : 'Top Losers';

      try {
        const response = await axios.get(`http://localhost:5001${endpoint}?count=5`);
        if (response.data && Array.isArray(response.data)) {
            setMovers(response.data);
        } else if (response.data && response.data.error) {
            console.error(`Error fetching ${title}:`, response.data.details || response.data.error);
            setError(response.data.details || response.data.error);
        } else {
            console.error(`Unexpected data structure for ${title}:`, response.data);
            setError(`Received unexpected data structure for ${title}.`);
        }
      } catch (err) {
        console.error(`Error fetching ${title}:`, err);
        setError(err.response?.data?.details || err.response?.data?.error || `Failed to fetch ${title}.`);
      }
      setLoading(false);
    };

    if (listType) {
        fetchMovers();
    }

  }, [listType]);

  const getChangeColor = (changePercent) => {
    if (changePercent === null || changePercent === undefined) return 'text-gray-500 dark:text-gray-400';
    if (listType === 'gainers') return 'text-green-500 dark:text-green-400';
    if (listType === 'losers') return 'text-red-500 dark:text-red-400';
    return changePercent >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
  };

  const title = listType === 'gainers' ? 'Top Gainers' : 'Top Losers';

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-2 capitalize">
        {title}
      </h3>
      {loading && <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading {title.toLowerCase()}...</div>}
      {error && <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900 p-2 rounded text-center">Error: {error}</div>}
      {!loading && !error && movers.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No {title.toLowerCase()} data available.</div>}
      {!loading && !error && movers.length > 0 && (
        <ul className="space-y-2 text-xs sm:text-sm flex-grow">
          {movers.map((mover, index) => (
            <li key={mover.symbol || index} className="p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150">
              <div className="flex justify-between items-center">
                <div className="truncate">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{mover.symbol}</span>
                  {mover.shortName && <span className="text-gray-500 dark:text-gray-400 ml-1 truncate block sm:inline-block" style={{maxWidth: '100px'}} title={mover.shortName}>({mover.shortName})</span>}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className={`font-semibold ${getChangeColor(mover.regularMarketChangePercent)}`}>
                    {mover.regularMarketPrice?.toFixed(2) || 'N/A'}
                  </span>
                  <span className={`ml-1.5 text-xs ${getChangeColor(mover.regularMarketChangePercent)}`}>
                    ({mover.regularMarketChangePercent?.toFixed(2) || '0.00'}%)
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MarketMovers; 