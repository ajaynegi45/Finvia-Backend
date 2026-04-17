import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validate.middleware';
import { createInvoiceSchema, invoiceIdParamSchema, listInvoicesQuerySchema, updateInvoiceItemsSchema } from './invoice.schemas';
import { createInvoiceHandler, getInvoiceHandler, listInvoicesHandler, updateInvoiceItemsHandler } from './invoice.controller';

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management endpoints
 */

const router = Router();

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a draft invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceInput'
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Invoice'
 */
router.post('/', validate(createInvoiceSchema, 'body'), asyncHandler(createInvoiceHandler));

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, FINALIZED, PAID, VOID]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by customer name or invoice number
 *     responses:
 *       200:
 *         description: List of invoices
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
 *                         $ref: '#/components/schemas/Invoice'
 */
router.get('/', validate(listInvoicesQuerySchema, 'query'), asyncHandler(listInvoicesHandler));

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice details
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Invoice'
 */
router.get('/:invoiceId', validate(invoiceIdParamSchema, 'params'), asyncHandler(getInvoiceHandler));

/**
 * @swagger
 * /invoices/{invoiceId}/items:
 *   put:
 *     summary: Update draft invoice items
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInvoiceItemsInput'
 *     responses:
 *       200:
 *         description: Items updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Invoice'
 */
router.put('/:invoiceId/items', validate(invoiceIdParamSchema, 'params'), validate(updateInvoiceItemsSchema, 'body'), asyncHandler(updateInvoiceItemsHandler));

export default router;
