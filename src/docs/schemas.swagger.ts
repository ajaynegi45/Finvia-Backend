/**
 * @swagger
 * components:
 *   securitySchemes:
 *     UserIdHeaderAuth:
 *       type: apiKey
 *       in: header
 *       name: x-user-id
 *       description: "Authenticated user identifier (e.g., user_123). Required for all audit-logged actions."
 *     UserRoleHeaderAuth:
 *       type: apiKey
 *       in: header
 *       name: x-user-role
 *       description: "Authenticated user role (admin | finance | staff). Role 'admin' or 'finance' is required for payment operations."
 *   parameters:
 *     InvoiceIdParam:
 *       in: path
 *       name: invoiceId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: Invoice identifier.
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
 *     InvoiceItemInput:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *           minimum: 1
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
 *     InvoiceSummary:
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
 *         subtotalPaise:
 *           type: integer
 *         taxPaise:
 *           type: integer
 *         totalPaise:
 *           type: integer
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     InvoiceDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/InvoiceSummary'
 *         - type: object
 *           required:
 *             - notes
 *             - updatedBy
 *             - items
 *           properties:
 *             notes:
 *               type: string
 *               nullable: true
 *             updatedBy:
 *               type: string
 *               nullable: true
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InvoiceItem'
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
 *           nullable: true
 *           maxLength: 2000
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/InvoiceItemInput'
 *     UpdateInvoiceItemsInput:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/InvoiceItemInput'
 *     PaginationMeta:
 *       type: object
 *       required:
 *         - page
 *         - limit
 *         - total
 *         - totalPages
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 *     ApiResponse:
 *       type: object
 *       required:
 *         - success
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - error
 *         - path
 *         - timestamp
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           required:
 *             - code
 *             - message
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             details:
 *               type: object
 *               additionalProperties: true
 *               nullable: true
 *         path:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *     HealthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           example: ok
 *         service:
 *           type: string
 *         database:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *   responses:
 *     BadRequest:
 *       description: Request validation failed.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Missing or invalid authentication headers.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: Authenticated user is not allowed to perform this action.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Requested resource was not found.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Conflict:
 *       description: Request conflicts with the current invoice state.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     InternalServerError:
 *       description: Unexpected server error.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
