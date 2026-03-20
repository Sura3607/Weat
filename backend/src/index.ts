import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config/env.js';
import {
  requestIdMiddleware,
  loggingMiddleware,
  errorHandler,
} from './middlewares/index.js';
import logger from './utils/logger.js';
import authRoutes from './routes/auth.js';
import checkInRoutes from './routes/checkIn.js';
import foodLocketRoutes from './routes/foodLocket.js';
import cravingRoutes from './routes/craving.js';
import radarRoutes from './routes/radar.js';
import inviteRoutes from './routes/invite.js';
import matchRoutes from './routes/match.js';
import feedRoutes from './routes/feed.js';
import healthRoutes from './routes/health.js';

const app = express();
const httpServer = createServer(app);

// Global middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(loggingMiddleware);

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', checkInRoutes);
app.use('/api/v1', foodLocketRoutes);
app.use('/api/v1', cravingRoutes);
app.use('/api/v1', radarRoutes);
app.use('/api/v1', inviteRoutes);
app.use('/api/v1', matchRoutes);
app.use('/api/v1', feedRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Export for WebSocket setup and testing
export { app, httpServer };

// Start server
httpServer.listen(config.port, () => {
  logger.info(`Weat API running on port ${config.port} [${config.nodeEnv}]`);
});
