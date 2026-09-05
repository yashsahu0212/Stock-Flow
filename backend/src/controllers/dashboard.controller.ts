import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  static async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await DashboardService.getSummary();
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }

  static async getLowStock(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lowStock = await DashboardService.getLowStockProducts();
      sendSuccess(res, lowStock);
    } catch (err) {
      next(err);
    }
  }

  static async getRecentMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const movements = await DashboardService.getRecentMovements(limit);
      sendSuccess(res, movements);
    } catch (err) {
      next(err);
    }
  }
}
