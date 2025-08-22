import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GenBook.AI API',
      version: '1.0.0',
      description: 'API documentation for GenBook.AI - A modern booking and scheduling platform',
      contact: {
        name: 'API Support',
        email: 'support@genbook.ai'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.genbook.ai/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    join(__dirname, 'routes/*.ts'),
    join(__dirname, 'routes/*.js'),
  ],
};

const specs = swaggerJSDoc(options);

export default specs;
