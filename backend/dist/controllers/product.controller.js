"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
const product_validator_1 = require("../validators/product.validator");
const response_1 = require("../utils/response");
class ProductController {
    static async getAll(req, res, next) {
        try {
            const category = req.query.category;
            const lowStock = req.query.lowStock === 'true';
            const products = await product_service_1.ProductService.getAllProducts({ category, lowStock });
            (0, response_1.sendSuccess)(res, products);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const product = await product_service_1.ProductService.getProductById(req.params.id);
            (0, response_1.sendSuccess)(res, product);
        }
        catch (err) {
            next(err);
        }
    }
    static async getBySku(req, res, next) {
        try {
            const product = await product_service_1.ProductService.getProductBySku(req.params.sku);
            (0, response_1.sendSuccess)(res, product);
        }
        catch (err) {
            next(err);
        }
    }
    static async search(req, res, next) {
        try {
            const query = req.query.q || '';
            const products = await product_service_1.ProductService.searchProducts(query);
            (0, response_1.sendSuccess)(res, products);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const validated = product_validator_1.createProductSchema.parse(req.body);
            const created = await product_service_1.ProductService.createProduct(validated);
            (0, response_1.sendSuccess)(res, created, 201, 'Product created successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const validated = product_validator_1.updateProductSchema.parse(req.body);
            const updated = await product_service_1.ProductService.updateProduct(req.params.id, validated);
            (0, response_1.sendSuccess)(res, updated, 200, 'Product updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const result = await product_service_1.ProductService.deleteProduct(req.params.id);
            (0, response_1.sendSuccess)(res, result, 200, 'Product deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ProductController = ProductController;
