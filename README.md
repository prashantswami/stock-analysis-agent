# Stock Analysis Agent 🚀

An AI-powered stock insight tool for Indian traders and investors.  
Get instant technical + fundamental summaries + trend explanations in simple English.

### Features (MVP)
- 🔍 Search any NSE/BSE stock (ex: RELIANCE)
- 📊 See charts with moving averages, RSI, MACD
- 🧠 Ask questions like:
  - "Is this stock in an uptrend?"
  - "What is the support level for INFY?"
- 🧠 AI generates:
  - Human-friendly trend analysis
  - Technical pattern detection summary
  - Risk/return hints

### Tech Stack
- React, Node.js, OpenAI API, ApexCharts

### Future Plans
- Indian F&O analysis
- Watchlist + alerts
- Voice-based AI input

## Stock Analysis Agent

A web application for performing stock analysis using various data sources and AI insights.

### Features:

- **Stock Symbol Search:** Input a stock symbol to fetch its latest quote and historical data.
- **Interactive Chart:** View historical price movements on an interactive line chart (powered by ApexCharts).
- **AI-Powered Insights:** (Future Implementation) Get AI-generated analysis and summaries for stocks.
- **Multiple Analysis Tabs:** 
    - **Trend Summary:** (Currently uses a separate backend - potentially to be updated)
    - **Fundamentals:** Displays key financial ratios and data.
    - **Ask AI:** (Placeholder for future AI query feature)
- **Dark Mode:** Toggle between light and dark themes for comfortable viewing.
- **Responsive Design:** Adapts to various screen sizes.

### Tech Stack:

- **Frontend:** React (with Vite), Tailwind CSS, ApexCharts
- **Backend:** Node.js, Express.js
- **Primary Data Source:** Yahoo Finance (via `yahoo-finance2` library)
- **AI Integration:** (Future) OpenAI API or similar

### Project Structure (Simplified):

```
/client         # React frontend
  /src
    /components 
      StockAnalysisLayout.jsx  # Main UI component with chart, tabs, etc.
      StockSearch.jsx        # (Legacy component, may be removed/repurposed)
    App.jsx
    index.css
    main.jsx
  vite.config.js
  package.json

/server         # Node.js backend
  /api
    stock.js           # API endpoints for stock quote and historical data (Yahoo Finance)
    trendSummary.js    # (Currently separate, might use Alpha Vantage or be refactored)
    symbolSearch.js    # (Placeholder/legacy for symbol search, might use Alpha Vantage)
  index.js           # Main server file
  package.json

.env            # Environment variables (e.g., API keys - not for Yahoo Finance public data)
README.md
```

### Setup and Running:

1.  **Clone the repository.**
2.  **Backend Setup:**
    ```bash
    cd server
    npm install
    # Create a .env file if needed for OTHER API keys (e.g., OpenAI for future "Ask AI" features).
    # Yahoo Finance (via yahoo-finance2) does not require an API key for public data.
    # Example .env for potential future use:
    # OPENAI_API_KEY=YOUR_OPENAI_KEY
    npm start 
    ``` 
    The backend server (for stock data) will typically run on `http://localhost:5001` (as configured in `StockAnalysisLayout.jsx` API calls).

3.  **Frontend Setup:**
    ```bash
    cd client
    npm install
    npm run dev
    ```
    The frontend development server will typically run on `http://localhost:5173` (or another port shown in the terminal).

4.  **Access the application** in your browser at the frontend URL.

### Key API Endpoints:

- `GET /api/stock?symbol=:symbol`: Fetches current quote data for the given stock symbol from Yahoo Finance.
- `GET /api/stock/historical/:symbol`: Fetches historical daily data (last 1 year) for the given symbol from Yahoo Finance.
- `GET /api/trend-summary?symbol=:symbol`: Fetches various data points from Yahoo Finance and generates a textual trend summary.
- `GET /api/symbol-search?query=:query`: Searches for stock symbols on Yahoo Finance based on the query.

*(Note: Ensure API keys are handled securely and not hardcoded directly in the source if you are using services that require them, like OpenAI for future AI features.)*