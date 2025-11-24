import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { CreateStoreDTO } from "../../domain/dtos/store/create-store.dto";
import { UpdateStoreDTO } from "../../domain/dtos/store/update-store.dto";
import { PaginationDto } from "../../domain/dtos/shared/pagination.dto";
import { StoreService } from "../services/store/store.service";
import { TiendanubeService } from "../services/tiendanube/tiendanube.service";

export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly tiendanubeService: TiendanubeService
  ) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.log(`${error}`);
    return res.status(500).json({ error: "Internal server error" });
  };

  // ============================================
  // CRUD DE TIENDAS
  // ============================================

  /**
   * Crear una nueva tienda manualmente (DEPRECADO - usar OAuth)
   * POST /api/stores
   * 
   * @deprecated Use OAuth flow instead: GET /api/auth/tiendanube/install
   */
  createStore = async (req: Request, res: Response) => {
    const { name, tiendanubeUrl, description, logo } = req.body;

    try {
      const createStoreDto = new CreateStoreDTO(
        name,
        tiendanubeUrl,
        description,
        logo
      );

      const store = await this.storeService.createStore(createStoreDto);
      
      return res.status(201).json({
        ...store,
        warning: "Manual store creation is deprecated. Please use OAuth flow: GET /api/auth/tiendanube/install",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtener todas las tiendas del usuario actual con paginación
   * GET /api/stores?page=1&limit=10
   */
  getStores = async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;

    const [error, paginationDto] = PaginationDto.create(
      Number(page),
      Number(limit)
    );

    if (error) return res.status(400).json({ error });

    try {
      const stores = await this.storeService.getStores(paginationDto!);
      return res.json(stores);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtener una tienda por ID (MongoDB ID)
   * GET /api/stores/:id
   */
  getStoreById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const store = await this.storeService.getStoreById(id);
      return res.json(store);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Actualizar una tienda (DEPRECADO para credenciales - usar OAuth)
   * PUT /api/stores/:id
   * 
   * Casos de uso válidos:
   * - Actualizar nombre, descripción, logo
   * - NO recomendado para actualizar storeId/accessToken (usar OAuth)
   */
  updateStore = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [error, updateStoreDto] = UpdateStoreDTO.create(req.body);

    if (error) return res.status(400).json({ error });

    try {
      if (updateStoreDto!.storeId || updateStoreDto!.accessToken) {
        console.warn(
          `⚠️  Manual credential update attempted for store ${id}. OAuth is recommended.`
        );
      }

      const store = await this.storeService.updateStore(id, updateStoreDto!);
      return res.json(store);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Eliminar una tienda
   * DELETE /api/stores/:id
   */
  deleteStore = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const result = await this.storeService.deleteStore(id);
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ============================================
  // SINCRONIZACIÓN COMPLETA
  // ============================================

  /**
   * 🔄 Sincronizar TODO: productos Y categorías
   * POST /api/stores/:id/sync
   * 
   * Este es el endpoint principal después de OAuth:
   * 1. OAuth → Store creada con credenciales
   * 2. Sync → Descarga productos Y categorías desde Tiendanube
   * 3. Consulta → Lee desde tu DB local con filtros avanzados
   * 
   * IMPORTANTE: Usar el MongoDB ID, no el storeId de Tiendanube
   */
  syncAll = async (req: Request, res: Response) => {
    const { id } = req.params; // MongoDB ID

    try {
      console.log(`[SYNC] Starting full sync for store ${id}...`);
      
      const result = await this.tiendanubeService.syncAll(id);
      
      console.log(
        `[SYNC] Completed: ${result.summary.totalProducts} products, ` +
        `${result.summary.totalCategories} categories`
      );
      
      return res.json({
        ...result,
        message: 
          `Successfully synced ${result.summary.totalItems} items ` +
          `(${result.summary.totalProducts} products, ${result.summary.totalCategories} categories).`,
        nextSteps: {
          products: `GET /api/products/${result.products.storeId}`,
          categories: `GET /api/categories/${result.categories.storeId}`,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 🔄 Sincronizar solo productos
   * POST /api/stores/:id/sync/products
   */
  syncProducts = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      console.log(`[SYNC] Starting product sync for store ${id}...`);
      
      const result = await this.tiendanubeService.syncProducts(id);
      
      console.log(`[SYNC] Completed: ${result.totalSynced} products synced`);
      
      return res.json({
        ...result,
        message: `Successfully synced ${result.totalSynced} products.`,
        nextSteps: `GET /api/products/${result.storeId}`,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 🔄 Sincronizar solo categorías
   * POST /api/stores/:id/sync/categories
   */
  syncCategories = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      console.log(`[SYNC] Starting category sync for store ${id}...`);
      
      const result = await this.tiendanubeService.syncCategories(id);
      
      console.log(`[SYNC] Completed: ${result.totalSynced} categories synced`);
      
      return res.json({
        ...result,
        message: `Successfully synced ${result.totalSynced} categories.`,
        nextSteps: `GET /api/categories/${result.storeId}`,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ============================================
  // ESTADÍSTICAS Y STATUS
  // ============================================

  /**
   * 📊 Obtener estadísticas de sincronización de una tienda
   * GET /api/stores/:id/sync-status
   * 
   * Devuelve información sobre el estado de sincronización
   * y estadísticas generales de productos y categorías
   */
  getSyncStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.json({
          storeId: null,
          storeName: store.name,
          isConnected: false,
          hasCredentials: false,
          canSync: false,
          message: "Store not connected to Tiendanube. Complete OAuth flow first.",
        });
      }

      const stats = await this.tiendanubeService.getStoreStats(
        store.storeId as number
      );

      return res.json({
        storeId: store.storeId,
        storeName: store.name,
        isConnected: store.isConnected,
        hasCredentials: !!(store.storeId && store.accessToken),
        canSync: !!(store.storeId && store.accessToken),
        lastSync: store.lastSync,
        stats: {
          products: stats.products,
          categories: stats.categories,
          variants: stats.variants,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ============================================
  // CATEGORÍAS (Nuevos endpoints)
  // ============================================

  /**
   * 📁 Obtener categorías de una tienda
   * GET /api/stores/:id/categories
   * 
   * Devuelve categorías con árbol jerárquico
   */
  getStoreCategories = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.status(400).json({
          error: "Store not connected to Tiendanube",
          message: "Please complete OAuth flow first: GET /api/auth/tiendanube/install",
        });
      }

      const result = await this.tiendanubeService.categories.getCategoryTree(
        store.storeId as number
      );

      return res.json({
        storeInfo: {
          mongoId: store.id,
          tiendanubeStoreId: store.storeId,
          name: store.name,
        },
        ...result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ============================================
  // PRODUCTOS (Endpoints legacy - mantener por compatibilidad)
  // ============================================

  /**
   * 📦 Obtener productos de una tienda (DESDE TU DB LOCAL)
   * GET /api/stores/:mongoId/products?page=1&limit=20
   * 
   * @deprecated Use GET /api/products/:tiendanubeStoreId for advanced filtering
   */
  getStoreProducts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.status(400).json({
          error: "Store not connected to Tiendanube",
          message: "Please complete OAuth flow first: GET /api/auth/tiendanube/install",
        });
      }

      // Usar el servicio de productos directamente
      const { ProductModel } = await import("../../data/mongo");
      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        ProductModel.find({ storeId: store.storeId })
          .skip(skip)
          .limit(Number(limit))
          .sort({ updatedAtTN: -1 })
          .lean(),
        ProductModel.countDocuments({ storeId: store.storeId }),
      ]);

      return res.json({
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
        storeInfo: {
          mongoId: store.id,
          tiendanubeStoreId: store.storeId,
          name: store.name,
        },
        recommendation: `For advanced filtering, use: GET /api/products/${store.storeId}`,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 📦 Obtener detalles completos de un producto
   * GET /api/stores/:mongoId/products/:productId
   * 
   * @deprecated Use GET /api/products/:tiendanubeStoreId/:productId
   */
  getProductDetails = async (req: Request, res: Response) => {
    const { id, productId } = req.params;

    try {
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.status(400).json({
          error: "Store not connected to Tiendanube",
        });
      }

      const { ProductModel, VariantModel, ImageModel } = await import("../../data/mongo");

      const [product, variants, images] = await Promise.all([
        ProductModel.findOne({ storeId: store.storeId, productId: Number(productId) }).lean(),
        VariantModel.find({ storeId: store.storeId, productId: Number(productId) }).lean(),
        ImageModel.find({ storeId: store.storeId, productId: Number(productId) })
          .sort({ position: 1 })
          .lean(),
      ]);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json({
        product,
        variants: variants || [],
        images: images || [],
        stats: {
          totalVariants: variants?.length || 0,
          totalImages: images?.length || 0,
          totalStock: variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
        },
        recommendation: `Use GET /api/products/${store.storeId}/${productId} for advanced features`,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}