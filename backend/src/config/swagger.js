import swaggerJSDoc from 'swagger-jsdoc';
import { ENV } from './env.js';

const serverUrl =
  ENV.NODE_ENV === 'production' ? 'https://api.example.com' : `http://localhost:${ENV.PORT}`;

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'M1P13 Marketplace API',
      version: '1.1.0',
      description:
        'Documentation complète des APIs pour la plateforme de gestion de boutique et marketplace.',
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
