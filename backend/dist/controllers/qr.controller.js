"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrController = void 0;
const qr_service_1 = require("../services/qr.service");
const qr_validator_1 = require("../validators/qr.validator");
const response_1 = require("../utils/response");
class QrController {
    static async verify(req, res, next) {
        try {
            const validated = qr_validator_1.verifyQrSchema.parse(req.body);
            const result = await qr_service_1.QrService.verifyQr(validated, req.user?.userId);
            (0, response_1.sendSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.QrController = QrController;
