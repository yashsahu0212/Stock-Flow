import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { inwardSchema, pickSchema, transferSchema, adjustSchema } from '../validators/inventory.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class InventoryController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.query.productId as string | undefined;
      const binId = req.query.binId as string | undefined;
      const warehouseId = req.query.warehouseId as string | undefined;
      const records = await InventoryService.getAllInventory({ productId, binId, warehouseId });
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  }

  static async getByProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getInventoryByProduct(req.params.productId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getByBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getInventoryByBin(req.params.binId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async inward(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = inwardSchema.parse(req.body);
      const result = await InventoryService.inward(validated, req.user?.userId);
      sendSuccess(res, result, 201, 'Stock inward recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  static async pick(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = pickSchema.parse(req.body);
      const result = await InventoryService.pick(validated, req.user?.userId);
      sendSuccess(res, result, 200, 'Pick operation completed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async transfer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = transferSchema.parse(req.body);
      const result = await InventoryService.transfer(validated, req.user?.userId);
      sendSuccess(res, result, 200, 'Stock transfer completed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async adjust(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = adjustSchema.parse(req.body);
      const result = await InventoryService.adjust(validated, req.user?.userId);
      sendSuccess(res, result, 200, 'Inventory adjustment recorded successfully');
    } catch (err) {
      next(err);
    }
  }
}
