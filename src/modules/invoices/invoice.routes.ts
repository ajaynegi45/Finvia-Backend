import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requirePayRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createInvoiceSchema, invoiceIdParamSchema, listInvoicesQuerySchema, updateInvoiceItemsSchema } from './invoice.schemas';
import { createInvoiceHandler, getInvoiceHandler, listInvoicesHandler, updateInvoiceItemsHandler, finalizeInvoiceHandler, markPaidHandler, voidInvoiceHandler } from './invoice.controller';

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice lifecycle and state transition endpoints.
 */

const router = Router();

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a draft invoice
 *     tags: [Invoices]
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceInput'
 *     responses:
 *       201:
 *         description: Draft invoice created.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', requireAuth, validate(createInvoiceSchema, 'body'), asyncHandler(createInvoiceHandler));

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Invoices]
 *     security: []
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
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, FINALIZED, PAID, VOID]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by customer name or invoice number.
 *     responses:
 *       200:
 *         description: Paginated invoice list.
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
 *                         $ref: '#/components/schemas/InvoiceSummary'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/', validate(listInvoicesQuerySchema, 'query'), asyncHandler(listInvoicesHandler));

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice detail
 *     tags: [Invoices]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvoiceIdParam'
 *     responses:
 *       200:
 *         description: Invoice detail with line items.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:invoiceId', validate(invoiceIdParamSchema, 'params'), asyncHandler(getInvoiceHandler));

/**
 * @swagger
 * /invoices/{invoiceId}/items:
 *   put:
 *     summary: Replace draft invoice items
 *     tags: [Invoices]
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvoiceIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInvoiceItemsInput'
 *     responses:
 *       200:
 *         description: Draft invoice updated.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/:invoiceId/items', requireAuth, validate(invoiceIdParamSchema, 'params'), validate(updateInvoiceItemsSchema, 'body'), asyncHandler(updateInvoiceItemsHandler));

/**
 * @swagger
 * /invoices/{invoiceId}/finalize:
 *   post:
 *     summary: Finalize a draft invoice
 *     tags: [Invoices]
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvoiceIdParam'
 *     responses:
 *       200:
 *         description: Invoice finalized and async jobs queued.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/:invoiceId/finalize', requireAuth, validate(invoiceIdParamSchema, 'params'), asyncHandler(finalizeInvoiceHandler));

/**
 * @swagger
 * /invoices/{invoiceId}/pay:
 *   post:
 *     summary: Mark a finalized invoice as paid
 *     tags: [Invoices]
 *     description: Requires `admin` or `finance` role.
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvoiceIdParam'
 *     responses:
 *       200:
 *         description: Invoice marked as paid.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/:invoiceId/pay', requireAuth, requirePayRole, validate(invoiceIdParamSchema, 'params'), asyncHandler(markPaidHandler));

/**
 * @swagger
 * /invoices/{invoiceId}/void:
 *   post:
 *     summary: Void a finalized invoice
 *     tags: [Invoices]
 *     security:
 *       - UserIdHeaderAuth: []
 *         UserRoleHeaderAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvoiceIdParam'
 *     responses:
 *       200:
 *         description: Invoice voided.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InvoiceDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/:invoiceId/void', requireAuth, validate(invoiceIdParamSchema, 'params'), asyncHandler(voidInvoiceHandler));

export default router;
