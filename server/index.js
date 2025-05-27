import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import stockRoutes from './api/stock.js';
import trendSummaryRoutes from './api/trendSummary.js';
import symbolSearchRoutes from './api/symbolSearch.js';
import askAIRoutes from './api/askAI.js';
import marketMoversRoutes from './api/marketMovers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/stock', stockRoutes);
app.use('/api/trend-summary', trendSummaryRoutes);
app.use('/api/symbol-search', symbolSearchRoutes);
app.use('/api/ask-ai', askAIRoutes);
app.use('/api/market', marketMoversRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 