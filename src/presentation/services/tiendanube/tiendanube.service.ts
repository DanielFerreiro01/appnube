import { CustomError } from "../../../domain";
import { TiendanubeProductService } from "./tiendanube-product.service";
import { TiendanubeCategoryService } from "./tiendanube-category.service";

/**
 * Servicio orquestador para Tiendanube
 * 
 * Este servicio coordina las operaciones entre productos y categorías
 * Delega la lógica específica a los servicios especializados
 */
export class TiendanubeService {
  private productService: TiendanubeProductService;
  private categoryService: TiendanubeCategoryService;

  constructor() {
    this.productService = new TiendanubeProductService();
    this.categoryService = new TiendanubeCategoryService();
  }

  /**
   * Sincroniza TODO: productos Y categorías
   * Este es el método principal después del OAuth
   */
  async syncAll(mongoStoreId: string) {
    try {
      console.log(`[SYNC] Starting full sync for store ${mongoStoreId}`);

      // Sincronizar en paralelo para mayor velocidad
      const [productsResult, categoriesResult] = await Promise.all([
        this.productService.syncAllProducts(mongoStoreId),
        this.categoryService.syncAllCategories(mongoStoreId),
      ]);

      console.log(`[SYNC] Full sync completed`);

      return {
        message: "Full sync completed successfully",
        products: productsResult,
        categories: categoriesResult,
        summary: {
          totalProducts: productsResult.totalSynced,
          totalCategories: categoriesResult.totalSynced,
          totalItems: productsResult.totalSynced + categoriesResult.totalSynced,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error in full sync: ${error}`);
    }
  }

  /**
   * Sincroniza solo productos
   */
  async syncProducts(mongoStoreId: string) {
    return this.productService.syncAllProducts(mongoStoreId);
  }

  /**
   * Sincroniza solo categorías
   */
  async syncCategories(mongoStoreId: string) {
    return this.categoryService.syncAllCategories(mongoStoreId);
  }

  /**
   * Obtiene estadísticas de una tienda
   */
  async getStoreStats(storeId: number) {
    try {
      const { ProductModel, VariantModel, CategoryModel } = await import("../../../data/mongo");

      const [
        totalProducts,
        publishedProducts,
        totalVariants,
        totalCategories,
      ] = await Promise.all([
        ProductModel.countDocuments({ storeId }),
        ProductModel.countDocuments({ storeId, published: true }),
        VariantModel.countDocuments({ storeId }),
        CategoryModel.countDocuments({ storeId }),
      ]);

      // Calcular stock
      const variants = await VariantModel.find({ storeId }).lean();
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      return {
        storeId,
        products: {
          total: totalProducts,
          published: publishedProducts,
          unpublished: totalProducts - publishedProducts,
        },
        categories: {
          total: totalCategories,
        },
        variants: {
          total: totalVariants,
          totalStock,
        },
        lastSync: new Date(),
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting store stats: ${error}`
      );
    }
  }

  /**
   * Métodos de acceso a servicios individuales
   * (para casos donde necesites acceso directo)
   */
  get products() {
    return this.productService;
  }

  get categories() {
    return this.categoryService;
  }
}