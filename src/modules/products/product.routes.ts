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
 *   description: Product catalog endpoints.
 */

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by product name.
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only return active products when true.
 *     responses:
 *       200:
 *         description: Product list.
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/', validate(listProductsQuerySchema, 'query'), asyncHandler(listProductsHandler));

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *     responses:
 *       201:
 *         description: Product created.
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', requireAuth, validate(createProductSchema, 'body'), asyncHandler(createProductHandler));

/**
 * @swagger
 * /products/fake-data:
 *   post:
 *     summary: Seed the demo product catalog
 *     tags: [Products]
 *     description: Idempotent helper route for local/demo usage. Existing SKUs are skipped.
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     responses:
 *       201:
 *         description: Seeded products returned.
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/fake-data', requireAuth, asyncHandler(seedProductsHandler));

export default router;
