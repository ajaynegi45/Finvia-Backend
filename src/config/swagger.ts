import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finvia Invoice Backend API',
      version: '1.0.0',
      description: 'Invoice lifecycle API with draft editing, finalization, audit logging, and async worker processing.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health and connectivity checks' },
      { name: 'Products', description: 'Product catalog endpoints' },
      { name: 'Invoices', description: 'Invoice lifecycle endpoints' },
    ],
  },
  apis: ['src/modules/**/*.ts', 'src/routes/**/*.ts', 'src/docs/**/*.ts'],
});
