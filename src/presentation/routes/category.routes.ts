import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { CategoryService } from "../services/category/category.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export class CategoryRoutes {
  static get routes(): Router {
    const router = Router();

    // Inicializar servicio y controlador
    const categoryService = new CategoryService();
    const controller = new CategoryController(categoryService);

    // ============================================
    // Middleware de autenticación (opcional)
    // ============================================
    // Si querés que las categorías sean públicas, comentá esta línea
    // router.use(AuthMiddleware.validateJWT);

    // ============================================
    // Rutas de Categorías (Solo Lectura)
    // ============================================

    /**
     * Buscar categorías
     * GET /api/categories/:storeId/search?q=remeras
     * IMPORTANTE: Esta ruta debe ir ANTES de /:categoryId
     */
    router.get("/:storeId/search", controller.searchCategories);

    /**
     * Obtener estadísticas de categorías
     * GET /api/categories/:storeId/stats
     */
    router.get("/:storeId/stats", controller.getStats);

    /**
     * Obtener categorías raíz (sin padre)
     * GET /api/categories/:storeId/root
     */
    router.get("/:storeId/root", controller.getRootCategories);

    /**
     * Obtener todas las categorías con árbol jerárquico
     * GET /api/categories/:storeId
     */
    router.get("/:storeId", controller.getCategories);

    /**
     * Obtener breadcrumb de una categoría
     * GET /api/categories/:storeId/:categoryId/breadcrumb
     */
    router.get("/:storeId/:categoryId/breadcrumb", controller.getBreadcrumb);

    /**
     * Obtener subcategorías de una categoría
     * GET /api/categories/:storeId/:categoryId/subcategories
     */
    router.get("/:storeId/:categoryId/subcategories", controller.getSubcategories);

    /**
     * Obtener una categoría específica
     * GET /api/categories/:storeId/:categoryId
     * IMPORTANTE: Esta ruta debe ir AL FINAL
     */
    router.get("/:storeId/:categoryId", controller.getCategoryById);

    return router;
  }
}