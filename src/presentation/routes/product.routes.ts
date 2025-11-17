import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { ProductService } from "../services/product/product.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export class ProductRoutes {
  static get routes(): Router {
    const router = Router();

    // Inicializar servicio y controlador
    const productService = new ProductService();
    const controller = new ProductController(productService);

    // ============================================
    // Middleware de autenticación (opcional según necesites)
    // ============================================
    // Si querés que los productos sean públicos, comentá esta línea
    router.use(AuthMiddleware.validateJWT);

    // ============================================
    // Rutas de Productos
    // ============================================

    // Obtener productos con filtros avanzados
    // GET /api/products/:storeId?page=1&limit=20&published=true&minPrice=100&maxPrice=5000&inStock=true&tags=remera,ropa&sort=price-asc&search=remera
    // Filtros disponibles: published, minPrice, maxPrice, inStock, tags, sort, search
    // Sort options: newest, oldest, price-asc, price-desc, name-asc, name-desc
    router.get("/:storeId", controller.getProducts);

    // Buscar productos
    // GET /api/products/:storeId/search?q=remera&page=1&limit=20
    router.get("/:storeId/search", controller.searchProducts);

    // Obtener productos destacados (publicados y con stock)
    // GET /api/products/:storeId/featured?limit=12
    router.get("/:storeId/featured", controller.getFeaturedProducts);

    // Obtener estadísticas de productos
    // GET /api/products/:storeId/stats
    router.get("/:storeId/stats", controller.getProductStats);

    // Obtener rango de precios
    // GET /api/products/:storeId/price-range
    router.get("/:storeId/price-range", controller.getPriceRange);

    // Obtener todos los tags/categorías
    // GET /api/products/:storeId/tags
    router.get("/:storeId/tags", controller.getTags);

    // Obtener productos por tag/categoría
    // GET /api/products/:storeId/category/:tag?page=1&limit=20
    router.get("/:storeId/category/:tag", controller.getProductsByTag);

    // Obtener un producto específico con detalles completos
    // GET /api/products/:storeId/:productId
    // IMPORTANTE: Esta ruta debe ir después de las rutas con paths específicos
    router.get("/:storeId/:productId", controller.getProductById);

    // Obtener productos relacionados
    // GET /api/products/:storeId/:productId/related?limit=6
    router.get("/:storeId/:productId/related", controller.getRelatedProducts);

    return router;
  }
}