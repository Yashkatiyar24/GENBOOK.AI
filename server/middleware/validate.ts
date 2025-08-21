import { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodIssue } from 'zod';

export type ValidatorFn = (body: any) => { valid: true } | { valid: false; error: string };

export function validateBody(validator: ValidatorFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator(req.body);
    if (result.valid) {
      return next();
    } else {
      const message = (typeof result === 'object' && result !== null && 'error' in result && (result as any).error)
        ? (result as any).error
        : 'Invalid request body';
      return res.status(400).json({ error: message });
    }
  };
}

// Zod-based validator: returns 400 with field-level issues on failure
export function validateWithZod<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (parsed.success) {
      // Replace body with parsed data for strong typing downstream
      (req as any).body = parsed.data;
      return next();
    }
    const issues = parsed.error.issues.map((i: ZodIssue) => ({ path: i.path, message: i.message, code: i.code }));
    return res.status(400).json({ error: 'Validation failed', issues });
  };
}
