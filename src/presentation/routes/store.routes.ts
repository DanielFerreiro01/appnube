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
    //router.use(AuthMiddleware.validateJWT);

    // ============================================
    // CRUD de Tiendas
    // ============================================

    /**
     * Crear tienda manualmente (DEPRECADO)
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
     * 
     * NO recomendado para actualizar credenciales (usar OAuth)
     */
    router.put('/:id', controller.updateStore);

    /**
     * Eliminar tienda
     * DELETE /api/stores/:id
     */
    router.delete('/:id', controller.deleteStore);

    // ============================================
    // Sincronización de Productos
    // ============================================

    /**
     * 🔄 Sincronizar productos desde Tiendanube
     * POST /api/stores/:id/sync
     * 
     * IMPORTANTE: Usar MongoDB ID, no el storeId de Tiendanube
     * 
     * Este es el endpoint principal después de OAuth:
     * 1. OAuth → Store creada con credenciales
     * 2. Sync → Descarga productos desde Tiendanube
     * 3. Products → Lee productos desde tu DB local
     */
    router.post('/:id/sync', controller.syncProducts);

    /**
     * 📊 Obtener estado de sincronización
     * GET /api/stores/:id/sync-status
     */
    router.get('/:id/sync-status', controller.getSyncStatus);

    // ============================================
    // Productos (DEPRECADO - usar /api/products)
    // ============================================

    /**
     * Obtener productos de una tienda
     * GET /api/stores/:id/products?page=1&limit=20
     * 
     * DEPRECADO: Usar GET /api/products/:tiendanubeStoreId
     * Ese endpoint tiene filtros avanzados
     */
    router.get('/:id/products', controller.getStoreProducts);

    /**
     * Obtener detalles de un producto
     * GET /api/stores/:id/products/:productId
     * 
     * DEPRECADO: Usar GET /api/products/:tiendanubeStoreId/:productId
     */
    router.get('/:id/products/:productId', controller.getProductDetails);

    return router;
  }
}