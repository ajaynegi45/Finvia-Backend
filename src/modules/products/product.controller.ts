import type { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { ok } from '../../utils/response';
import type { CreateProductInput, ListProductsQuery } from './product.schemas';

export async function listProductsHandler( req: Request, res: Response, next: NextFunction ) {
  const query = (req.validatedQuery ?? {}) as ListProductsQuery;

  const data = await ProductService.listAvailableProducts(query);

  res.status(200).json(ok(data));
}

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  const body = req.validatedBody as CreateProductInput;

  const data = await ProductService.createProduct(body);

  res.status(201).json(ok(data));
}

export async function seedProductsHandler(req: Request, res: Response, next: NextFunction) {
  const data = await ProductService.seedFakeProducts();

  res.status(201).json(ok(data));
}