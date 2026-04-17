import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createProductSchema, listProductsQuerySchema } from './product.schemas';
import { createProductHandler, listProductsHandler, seedProductsHandler } from './product.controller';

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List available products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for product name
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter only active products
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */
router.get('/', validate(listProductsQuerySchema, 'query'), asyncHandler(listProductsHandler));

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/', requireAuth, validate(createProductSchema, 'body'), asyncHandler(createProductHandler));

/**
 * @swagger
 * /products/fake-data:
 *   post:
 *     summary: Seed fake product data
 *     tags: [Products]
 *     responses:
 *       201:
 *         description: Fake data seeded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */
router.post('/fake-data', requireAuth, asyncHandler(seedProductsHandler));

export default router;
