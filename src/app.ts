import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import router from './routes';
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;