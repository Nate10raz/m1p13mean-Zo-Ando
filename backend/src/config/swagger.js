import swaggerJSDoc from 'swagger-jsdoc';
import { ENV } from './env.js';

const serverUrl =
  ENV.NODE_ENV === 'production' ? 'https://api.example.com' : `http://localhost:${ENV.PORT}`;

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        adminSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-secret',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
});
