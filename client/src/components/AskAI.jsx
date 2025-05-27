import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const AskAI = ({ symbol }) => {
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }
    if (!symbol) {
      setError('Stock symbol is not available. Cannot ask AI.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAiResponse('');

    try {
      const response = await fetch('http://localhost:5001/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to get AI response (status: ${response.status})`);
      }

      setAiResponse(data.answer);
    } catch (err) {
      console.error('Error asking AI:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [question, symbol]);

  return (
    <div className="mt-6 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Ask AI about {symbol || 'this stock'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ai-question" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Question:
          </label>
          <textarea
            id="ai-question"
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`e.g., What is the P/E ratio for ${symbol || 'this stock'}?`}
            disabled={isLoading || !symbol}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !symbol || !question.trim()}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Ask AI'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-700 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-100 rounded-md">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {aiResponse && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow">
          <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-2">AI Response:</h3>
          {/* Preserve line breaks from AI response */}
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{aiResponse}</p>
        </div>
      )}
    </div>
  );
};

AskAI.propTypes = {
  symbol: PropTypes.string, // Can be null if no stock is selected yet
};

export default AskAI; 