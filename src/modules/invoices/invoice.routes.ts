import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validate.middleware';
import { createInvoiceSchema, invoiceIdParamSchema, listInvoicesQuerySchema, updateInvoiceItemsSchema } from './invoice.schemas';
import { createInvoiceHandler, getInvoiceHandler, listInvoicesHandler, updateInvoiceItemsHandler, finalizeInvoiceHandler, markPaidHandler, voidInvoiceHandler } from './invoice.controller';

const router = Router();

router.post('/', validate(createInvoiceSchema, 'body'), asyncHandler(createInvoiceHandler));
router.get('/', validate(listInvoicesQuerySchema, 'query'), asyncHandler(listInvoicesHandler));
router.get('/:invoiceId', validate(invoiceIdParamSchema, 'params'), asyncHandler(getInvoiceHandler));
router.put('/:invoiceId/items', validate(invoiceIdParamSchema, 'params'), validate(updateInvoiceItemsSchema, 'body'), asyncHandler(updateInvoiceItemsHandler));
router.post('/:invoiceId/finalize', validate(invoiceIdParamSchema, 'params'), asyncHandler(finalizeInvoiceHandler));
router.post('/:invoiceId/pay', validate(invoiceIdParamSchema, 'params'), asyncHandler(markPaidHandler));
router.post('/:invoiceId/void', validate(invoiceIdParamSchema, 'params'), asyncHandler(voidInvoiceHandler));

export default router;
