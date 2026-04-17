/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - sku
 *         - availableQuantity
 *         - unitPricePaise
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         availableQuantity:
 *           type: integer
 *           minimum: 0
 *         unitPricePaise:
 *           type: integer
 *           minimum: 1
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateProductInput:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *         - unitPricePaise
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *         sku:
 *           type: string
 *           minLength: 1
 *         description:
 *           type: string
 *         availableQuantity:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         unitPricePaise:
 *           type: integer
 *           minimum: 1
 *
 *     Invoice:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - customerName
 *         - subtotalPaise
 *         - taxPaise
 *         - totalPaise
 *         - createdBy
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         invoiceNumber:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [DRAFT, FINALIZED, PAID, VOID]
 *         customerName:
 *           type: string
 *         notes:
 *           type: string
 *           nullable: true
 *         subtotalPaise:
 *           type: integer
 *         taxPaise:
 *           type: integer
 *         totalPaise:
 *           type: integer
 *         createdBy:
 *           type: string
 *         updatedBy:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *
 *     InvoiceItem:
 *       type: object
 *       required:
 *         - id
 *         - productId
 *         - productName
 *         - productSku
 *         - unitPricePaise
 *         - quantity
 *         - lineTotalPaise
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         productName:
 *           type: string
 *         productSku:
 *           type: string
 *         unitPricePaise:
 *           type: integer
 *         quantity:
 *           type: integer
 *         lineTotalPaise:
 *           type: integer
 *
 *     CreateInvoiceInput:
 *       type: object
 *       required:
 *         - customerName
 *         - items
 *       properties:
 *         customerName:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         notes:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *
 *     UpdateInvoiceItemsInput:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             code:
 *               type: string
 *             status:
 *               type: integer
 */
