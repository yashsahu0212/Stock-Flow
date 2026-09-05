import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { sendSuccess } from '../utils/response';

export class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const lowStock = req.query.lowStock === 'true';
      const products = await ProductService.getAllProducts({ category, lowStock });
      sendSuccess(res, products);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getProductById(req.params.id);
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async getBySku(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getProductBySku(req.params.sku);
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const products = await ProductService.searchProducts(query);
      sendSuccess(res, products);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductSchema.parse(req.body);
      const created = await ProductService.createProduct(validated);
      sendSuccess(res, created, 201, 'Product created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductSchema.parse(req.body);
      const updated = await ProductService.updateProduct(req.params.id, validated);
      sendSuccess(res, updated, 200, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.deleteProduct(req.params.id);
      sendSuccess(res, result, 200, 'Product deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
