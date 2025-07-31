import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import logger from './logger';

/**
 * Setup Swagger documentation for the API
 */
export const setupSwagger = (app: express.Application): void => {
  try {
    // Get package information for API version
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Swagger definition
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'PowerShell Script Management API',
          version: packageInfo.version || '1.0.0',
          description: 'API for managing, analyzing, and utilizing PowerShell scripts with AI-enhanced capabilities',
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
          contact: {
            name: 'API Support',
            email: 'support@psscript.example.com',
          },
        },
        servers: [
          {
            url: 'http://localhost:4001',
            description: 'Development server',
          },
          {
            url: 'https://api.psscript.example.com',
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
      // Path to the API docs
      apis: [
        './src/routes/*.ts',     // Route files
        './src/models/*.ts',     // Model definitions
        './src/controllers/*.ts' // Controller files with operations
      ],
    };

    // Initialize swagger-jsdoc
    const swaggerDocs = swaggerJsdoc(swaggerOptions);
    
    // Setup Swagger UI
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'PowerShell Script Management API Docs',
      })
    );
    
    // Also provide the documentation in JSON format
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocs);
    });
    
    logger.info('Swagger documentation initialized at /api-docs');
  } catch (error) {
    logger.error('Failed to initialize Swagger documentation:', error);
  }
};
