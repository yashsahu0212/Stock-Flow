import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase().trim(),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, 'Price must be positive or zero').optional().default(0),
  minStockLevel: z.number().int().min(0, 'minStockLevel must be a non-negative integer').optional().default(10),
  unit: z.string().optional().default('pcs'),
  barcode: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
