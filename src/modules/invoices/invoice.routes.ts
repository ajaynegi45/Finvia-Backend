import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requirePayRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createInvoiceSchema, invoiceIdParamSchema, listInvoicesQuerySchema, updateInvoiceItemsSchema } from './invoice.schemas';
import { createInvoiceHandler, getInvoiceHandler, listInvoicesHandler, updateInvoiceItemsHandler, finalizeInvoiceHandler, markPaidHandler, voidInvoiceHandler } from './invoice.controller';

const router = Router();

router.post('/', requireAuth, validate(createInvoiceSchema, 'body'), asyncHandler(createInvoiceHandler));
router.get('/', validate(listInvoicesQuerySchema, 'query'), asyncHandler(listInvoicesHandler));
router.get('/:invoiceId', validate(invoiceIdParamSchema, 'params'), asyncHandler(getInvoiceHandler));
router.put('/:invoiceId/items', requireAuth, validate(invoiceIdParamSchema, 'params'), validate(updateInvoiceItemsSchema, 'body'), asyncHandler(updateInvoiceItemsHandler));
router.post('/:invoiceId/finalize', requireAuth, validate(invoiceIdParamSchema, 'params'), asyncHandler(finalizeInvoiceHandler));
router.post('/:invoiceId/pay', requireAuth, requirePayRole, validate(invoiceIdParamSchema, 'params'), asyncHandler(markPaidHandler));
router.post('/:invoiceId/void', requireAuth, validate(invoiceIdParamSchema, 'params'), asyncHandler(voidInvoiceHandler));

export default router;
