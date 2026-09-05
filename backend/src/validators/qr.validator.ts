import { z } from 'zod';

export const verifyQrSchema = z.object({
  qrCode: z.string().min(1, 'qrCode is required').trim(),
  expectedSku: z.string().trim().optional(),
  expectedBinCode: z.string().trim().optional(),
  expectedBinId: z.string().trim().optional(),
  orderId: z.string().trim().optional(),
});

export type VerifyQrInput = z.infer<typeof verifyQrSchema>;
