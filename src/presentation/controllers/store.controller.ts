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
   * Crear una nueva tienda
   * POST /api/stores
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
      return res.status(201).json(store);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtener todas las tiendas con paginación
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
   * Obtener una tienda por ID
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
   * Actualizar una tienda (incluyendo credenciales de Tiendanube)
   * PUT /api/stores/:id
   */
  updateStore = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [error, updateStoreDto] = UpdateStoreDTO.create(req.body);

    if (error) return res.status(400).json({ error });

    try {
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
   * Sincronizar productos desde Tiendanube
   * POST /api/stores/:id/sync
   */
  syncProducts = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const result = await this.tiendanubeService.syncProducts(id);
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtener productos de una tienda con paginación
   * GET /api/stores/:storeId/products?page=1&limit=20
   */
  getStoreProducts = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
      const products = await this.tiendanubeService.getLocalProducts(
        Number(storeId),
        Number(page),
        Number(limit)
      );
      return res.json(products);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtener detalles completos de un producto (con variantes e imágenes)
   * GET /api/stores/:storeId/products/:productId
   */
  getProductDetails = async (req: Request, res: Response) => {
    const { storeId, productId } = req.params;

    try {
      const product = await this.tiendanubeService.getProductDetails(
        Number(storeId),
        Number(productId)
      );
      return res.json(product);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}