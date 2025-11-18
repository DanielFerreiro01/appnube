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
      
      // Advertencia en la respuesta
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
      // Advertencia si intentan actualizar credenciales manualmente
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

  /**
   * 🔄 Sincronizar productos desde Tiendanube a tu DB local
   * POST /api/stores/:id/sync
   * 
   * IMPORTANTE: Usar el MongoDB ID de la store, NO el storeId de Tiendanube
   * 
   * Este endpoint:
   * 1. Lee las credenciales (storeId + accessToken) de tu DB
   * 2. Llama a la API de Tiendanube para obtener productos
   * 3. Guarda/actualiza productos, variantes e imágenes en tu DB local
   * 
   * Después de sincronizar, usa GET /api/products/:tiendanubeStoreId
   */
  syncProducts = async (req: Request, res: Response) => {
    const { id } = req.params; // MongoDB ID

    try {
      console.log(`Starting product sync for store ${id}...`);
      
      const result = await this.tiendanubeService.syncProducts(id);
      
      console.log(`Sync completed: ${result.totalSynced} products synced`);
      
      return res.json({
        ...result,
        message: `Successfully synced ${result.totalSynced} products. Use GET /api/products/${result.storeId} to retrieve them.`,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 📊 Obtener estadísticas de sincronización de una tienda
   * GET /api/stores/:id/sync-status
   * 
   * Útil para saber cuándo fue la última sincronización
   */
  getSyncStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const store = await this.storeService.getStoreById(id);
      const stats = await this.tiendanubeService.getStoreStats(
        store.storeId as number
      );

      return res.json({
        storeId: store.storeId,
        storeName: store.name,
        lastSync: stats.lastSync,
        totalProducts: stats.totalProducts,
        publishedProducts: stats.publishedProducts,
        totalStock: stats.totalStock,
        hasCredentials: !!(store.storeId && store.accessToken),
        canSync: !!(store.storeId && store.accessToken),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 📦 Obtener productos de una tienda (DESDE TU DB LOCAL)
   * GET /api/stores/:mongoId/products?page=1&limit=20
   * 
   * DEPRECATED: Este endpoint existe pero es mejor usar:
   * GET /api/products/:tiendanubeStoreId
   * 
   * Ese endpoint tiene más filtros y opciones avanzadas
   */
  getStoreProducts = async (req: Request, res: Response) => {
    const { id } = req.params; // MongoDB ID
    const { page = 1, limit = 20 } = req.query;

    try {
      // Obtener la store para conseguir el tiendanubeStoreId
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.status(400).json({
          error: "Store not connected to Tiendanube",
          message: "Please complete OAuth flow first: GET /api/auth/tiendanube/install",
        });
      }

      const products = await this.tiendanubeService.getLocalProducts(
        store.storeId as number,
        Number(page),
        Number(limit)
      );

      return res.json({
        ...products,
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
   * DEPRECATED: Mejor usar GET /api/products/:tiendanubeStoreId/:productId
   */
  getProductDetails = async (req: Request, res: Response) => {
    const { id, productId } = req.params;

    try {
      // Obtener la store para conseguir el tiendanubeStoreId
      const store = await this.storeService.getStoreById(id);
      
      if (!store.storeId) {
        return res.status(400).json({
          error: "Store not connected to Tiendanube",
        });
      }

      const product = await this.tiendanubeService.getProductDetails(
        store.storeId as number,
        Number(productId)
      );

      return res.json(product);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * 🔄 Re-sincronizar un producto específico
   * POST /api/stores/:id/products/:productId/sync
   * 
   * Útil para actualizar un solo producto sin sincronizar todo
   */
  syncSingleProduct = async (req: Request, res: Response) => {
    const { id, productId } = req.params;

    try {
      // TODO: Implementar sincronización de producto individual
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Use POST /api/stores/:id/sync to sync all products",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}