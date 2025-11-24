import { Router } from 'express';
import { StoreService } from '../services/store/store.service';
import { StoreController } from '../controllers/store.controller';
import { TiendanubeService } from '../services/tiendanube/tiendanube.service';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class StoreRoutes {
  static get routes(): Router {
    const storeService = new StoreService();
    const tiendanubeService = new TiendanubeService();

    const controller = new StoreController(storeService, tiendanubeService);

    const router = Router();

    // ============================================
    // Middleware de Autenticación
    // ============================================
    // Todas las rutas de stores requieren autenticación
    // Comentar la siguiente línea para testing sin auth
    // router.use(AuthMiddleware.validateJWT);

    // ============================================
    // CRUD DE TIENDAS
    // ============================================

    /**
     * Crear tienda manualmente (DEPRECADO)
     * POST /api/stores
     * Mejor usar: GET /api/auth/tiendanube/install
     */
    router.post('/', controller.createStore);

    /**
     * Listar todas las tiendas del usuario
     * GET /api/stores?page=1&limit=10
     */
    router.get('/', controller.getStores);

    /**
     * Obtener una tienda específica
     * GET /api/stores/:id
     */
    router.get('/:id', controller.getStoreById);

    /**
     * Actualizar tienda (nombre, descripción, logo)
     * PUT /api/stores/:id
     * NO recomendado para actualizar credenciales (usar OAuth)
     */
    router.put('/:id', controller.updateStore);

    /**
     * Eliminar tienda
     * DELETE /api/stores/:id
     */
    router.delete('/:id', controller.deleteStore);

    // ============================================
    // SINCRONIZACIÓN
    // ============================================

    /**
     * 🔄 Sincronizar TODO: productos Y categorías
     * POST /api/stores/:id/sync
     * 
     * Este es el endpoint principal después de OAuth
     */
    router.post('/:id/sync', controller.syncAll);

    /**
     * 🔄 Sincronizar solo productos
     * POST /api/stores/:id/sync/products
     */
    router.post('/:id/sync/products', controller.syncProducts);

    /**
     * 🔄 Sincronizar solo categorías
     * POST /api/stores/:id/sync/categories
     */
    router.post('/:id/sync/categories', controller.syncCategories);

    /**
     * 📊 Obtener estado de sincronización
     * GET /api/stores/:id/sync-status
     */
    router.get('/:id/sync-status', controller.getSyncStatus);

    // ============================================
    // CATEGORÍAS
    // ============================================

    /**
     * 📁 Obtener categorías con árbol jerárquico
     * GET /api/stores/:id/categories
     */
    router.get('/:id/categories', controller.getStoreCategories);

    // ============================================
    // PRODUCTOS (Legacy - mantener por compatibilidad)
    // ============================================

    /**
     * 📦 Obtener productos de una tienda
     * GET /api/stores/:id/products?page=1&limit=20
     * 
     * DEPRECADO: Usar GET /api/products/:tiendanubeStoreId
     */
    router.get('/:id/products', controller.getStoreProducts);

    /**
     * 📦 Obtener detalles de un producto
     * GET /api/stores/:id/products/:productId
     * 
     * DEPRECADO: Usar GET /api/products/:tiendanubeStoreId/:productId
     */
    router.get('/:id/products/:productId', controller.getProductDetails);

    return router;
  }
}