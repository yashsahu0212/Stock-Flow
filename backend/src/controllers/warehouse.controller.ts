import { Request, Response, NextFunction } from 'express';
import { WarehouseService } from '../services/warehouse.service';
import { sendSuccess } from '../utils/response';

export class WarehouseController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const warehouse = await WarehouseService.createWarehouse(req.body);
      sendSuccess(res, warehouse, 201, 'Warehouse created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const warehouses = await WarehouseService.getAllWarehouses();
      sendSuccess(res, warehouses);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const warehouse = await WarehouseService.getWarehouseById(req.params.id);
      sendSuccess(res, warehouse);
    } catch (err) {
      next(err);
    }
  }

  static async getRows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hierarchy = await WarehouseService.getWarehouseHierarchy(req.params.id);
      sendSuccess(res, hierarchy);
    } catch (err) {
      next(err);
    }
  }

  static async getBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bin = await WarehouseService.getBinById(req.params.id);
      sendSuccess(res, bin);
    } catch (err) {
      next(err);
    }
  }

  static async getBinInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await WarehouseService.getBinInventory(req.params.id);
      sendSuccess(res, inventory);
    } catch (err) {
      next(err);
    }
  }
}
