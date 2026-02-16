import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { ENV } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Routes
import indexRoutes from './routes/index.routes.js';

const app = express();

// Pour JSON
app.use(express.json({ limit: '20mb' }));
// Pour les formulaires urlencoded
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use(cookieParser());
app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);


app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/', indexRoutes);

// 404 Not Found (après toutes les routes)
app.use(notFoundMiddleware);

// Middleware d’erreur global
app.use(errorMiddleware);

export default app;
