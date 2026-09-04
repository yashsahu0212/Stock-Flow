import { z } from 'zod';
import { OrderPriority, OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  priority: z.nativeEnum(OrderPriority).optional().default(OrderPriority.NORMAL),
  assignedToUserId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'productId is required'),
      quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
    })
  ).min(1, 'Order must contain at least one item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
