import { Router } from 'express';
import productRoutes from '../modules/products/product.routes';
import invoiceRoutes from '../modules/invoices/invoice.routes';
import healthRoutes from './health.routes';
import indexRoute from "./index.route";

const router = Router();
router.use('/', indexRoute);
router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
export default router;
