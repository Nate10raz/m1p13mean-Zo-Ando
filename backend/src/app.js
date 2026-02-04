import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { ENV } from './config/env.js';

// Routes
import indexRoutes from './routes/index.routes.js';

const app = express();

// Pour JSON
app.use(express.json({ limit: '20mb' }));
// Pour les formulaires urlencoded
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use(cookieParser());
app.use(cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Routes
app.use('/', indexRoutes);

// 404 Not Found (après toutes les routes)
app.use(notFoundMiddleware);

// Middleware d’erreur global
app.use(errorMiddleware);

export default app;
