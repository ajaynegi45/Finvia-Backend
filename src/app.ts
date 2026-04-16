import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import { healthCheck } from './controllers/health.controller';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

app.use('/health', healthCheck);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;