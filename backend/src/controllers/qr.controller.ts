import { Response, NextFunction } from 'express';
import { QrService } from '../services/qr.service';
import { verifyQrSchema } from '../validators/qr.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class QrController {
  static async verify(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyQrSchema.parse(req.body);
      const result = await QrService.verifyQr(validated, req.user?.userId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
