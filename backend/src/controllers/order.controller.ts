import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';
import { sendSuccess } from '../utils/response';
import { OrderPriority, OrderStatus } from '@prisma/client';

export class OrderController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as OrderStatus | undefined;
      const priority = req.query.priority as OrderPriority | undefined;
      const orders = await OrderService.getAllOrders({ status, priority });
      sendSuccess(res, orders);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.getOrderById(req.params.id);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createOrderSchema.parse(req.body);
      const order = await OrderService.createOrder(validated);
      sendSuccess(res, order, 201, 'Order created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateOrderStatusSchema.parse(req.body);
      const updated = await OrderService.updateOrderStatus(req.params.id, validated.status);
      sendSuccess(res, updated, 200, 'Order status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await OrderService.getOrderItems(req.params.id);
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }
}
