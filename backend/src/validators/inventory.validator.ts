import { z } from 'zod';

export const inwardSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  binId: z.string().min(1, 'binId is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
  reason: z.string().optional().default('Standard inward receipt'),
});

export const pickSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  productId: z.string().min(1, 'productId is required'),
  binId: z.string().min(1, 'binId is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
});

export const transferSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  fromBinId: z.string().min(1, 'fromBinId is required'),
  toBinId: z.string().min(1, 'toBinId is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
  reason: z.string().optional().default('Internal warehouse transfer'),
}).refine((data) => data.fromBinId !== data.toBinId, {
  message: 'Source bin and destination bin must be different',
  path: ['toBinId'],
});

export const adjustSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  binId: z.string().min(1, 'binId is required'),
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
  reason: z.string().min(3, 'Adjustment reason is required (e.g., Damaged, Cycle Count)'),
});

export type InwardInput = z.infer<typeof inwardSchema>;
export type PickInput = z.infer<typeof pickSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type AdjustInput = z.infer<typeof adjustSchema>;
