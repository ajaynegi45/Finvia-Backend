import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from './error.middleware';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: ValidateTarget) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result =
      target === 'body'
        ? schema.safeParse(req.body)
        : target === 'query'
          ? schema.safeParse(req.query)
          : schema.safeParse(req.params);

    if (!result.success) {
      return next(
        new AppError('Validation failed', 400, JSON.stringify(result.error.flatten()))
      );
    }

    if (target === 'body') req.validatedBody = result.data as typeof req.validatedBody;
    if (target === 'query') req.validatedQuery = result.data as typeof req.validatedQuery;
    if (target === 'params') req.validatedParams = result.data as typeof req.validatedParams;

    next();
  };
}
