import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.uuid(),
});

export const listProductsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  activeOnly: z.coerce.boolean().optional().default(true),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  sku: z.string().trim().min(1, 'SKU is required'),
  description: z.string().trim().optional(),
  availableQuantity: z.number().int().min(0).default(0),
  unitPricePaise: z.number().int().min(1, 'Price must be at least 1 paise'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;