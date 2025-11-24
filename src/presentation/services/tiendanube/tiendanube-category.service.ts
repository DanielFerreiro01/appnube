import { CustomError } from "../../../domain";
import { StoreModel, CategoryModel } from "../../../data/mongo";

interface TiendanubeCategory {
  id: number;
  name: { es: string };
  description: { es: string };
  handle: string;
  parent: number | null;
  subcategories: number[];
  seo_title: { es: string };
  seo_description: { es: string };
  google_shopping_category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Servicio para sincronización de CATEGORÍAS desde Tiendanube
 * Responsabilidades:
 * - Obtener categorías desde API de Tiendanube
 * - Sincronizar categorías completas (inicial)
 * - Sincronizar categorías individuales (webhooks)
 * - Construir árbol jerárquico de categorías
 */
export class TiendanubeCategoryService {
  private readonly baseApiUrl = "https://api.tiendanube.com/v1";

  /**
   * Obtiene categorías de Tiendanube paginadas
   */
  async fetchCategories(
    storeId: number,
    accessToken: string,
    page: number = 1
  ): Promise<TiendanubeCategory[]> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/${storeId}/categories?page=${page}&per_page=50`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[CATEGORY-SYNC] No more categories on page ${page}`);
          return [];
        }
        
        const errorText = await response.text();
        throw CustomError.badRequest(
          `Tiendanube API error: ${response.status} - ${errorText}`
        );
      }

      const categories: TiendanubeCategory[] = await response.json();
      return categories;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error fetching categories from Tiendanube: ${error}`
      );
    }
  }

  /**
   * Obtiene una categoría específica desde Tiendanube
   */
  async fetchSingleCategory(
    storeId: number,
    categoryId: number,
    accessToken: string
  ): Promise<TiendanubeCategory> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/${storeId}/categories/${categoryId}`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw CustomError.badRequest(
          `Error fetching category ${categoryId}: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error fetching single category: ${error}`
      );
    }
  }

  /**
   * Sincroniza todas las categorías de una tienda
   */
  async syncAllCategories(mongoStoreId: string) {
    try {
      const store = await StoreModel.findById(mongoStoreId);

      if (!store) {
        throw CustomError.notFound("Store not found");
      }

      if (!store.storeId || !store.accessToken) {
        throw CustomError.badRequest(
          "Store does not have Tiendanube credentials"
        );
      }

      let page = 1;
      let hasMoreCategories = true;
      let totalSynced = 0;
      const errors: Array<{ categoryId: number; error: string }> = [];

      console.log(`[CATEGORY-SYNC] Starting sync for store ${store.storeId}`);

      while (hasMoreCategories) {
        try {
          console.log(`[CATEGORY-SYNC] Fetching page ${page}...`);
          
          const categories = await this.fetchCategories(
            store.storeId,
            store.accessToken,
            page
          );

          if (categories.length === 0) {
            console.log("[CATEGORY-SYNC] No more categories to sync");
            hasMoreCategories = false;
            break;
          }

          console.log(`[CATEGORY-SYNC] Processing ${categories.length} categories from page ${page}`);

          for (const tnCategory of categories) {
            try {
              await this.saveCategory(store.storeId, tnCategory);
              totalSynced++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`[CATEGORY-SYNC] Error saving category ${tnCategory.id}:`, errorMsg);
              errors.push({
                categoryId: tnCategory.id,
                error: errorMsg,
              });
            }
          }

          page++;

          if (page > 10) {
            console.log("[CATEGORY-SYNC] Reached page limit (10 pages)");
            hasMoreCategories = false;
          }
        } catch (error) {
          console.error(`[CATEGORY-SYNC] Error fetching page ${page}:`, error);
          hasMoreCategories = false;
        }
      }

      return {
        message: "Categories synced successfully",
        totalSynced,
        storeId: store.storeId,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error syncing categories: ${error}`);
    }
  }

  /**
   * Sincroniza una categoría individual (para webhooks)
   */
  async syncSingleCategory(
    storeId: number,
    categoryId: number,
    accessToken: string
  ) {
    try {
      console.log(`[CATEGORY-SYNC] Syncing single category ${categoryId} for store ${storeId}`);

      const category = await this.fetchSingleCategory(storeId, categoryId, accessToken);
      await this.saveCategory(storeId, category);

      console.log(`[CATEGORY-SYNC] Category ${categoryId} synced successfully`);

      return {
        success: true,
        categoryId,
        message: "Category synced successfully",
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error syncing single category: ${error}`
      );
    }
  }

  /**
   * Elimina una categoría
   */
  async deleteCategory(storeId: number, categoryId: number) {
    try {
      await CategoryModel.deleteOne({ storeId, categoryId });

      console.log(`[CATEGORY-SYNC] Category ${categoryId} deleted successfully`);

      return {
        success: true,
        categoryId,
        message: "Category deleted successfully",
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error deleting category: ${error}`
      );
    }
  }

  /**
   * Obtiene árbol jerárquico de categorías
   */
  async getCategoryTree(storeId: number) {
    try {
      const categories = await CategoryModel.find({ storeId })
        .sort({ name: 1 })
        .lean();

      const tree = this.buildCategoryTree(categories);

      return {
        categories,
        tree,
        total: categories.length,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting category tree: ${error}`
      );
    }
  }

  /**
   * Guarda o actualiza una categoría
   */
  private async saveCategory(storeId: number, tnCategory: TiendanubeCategory) {
    try {
      await CategoryModel.findOneAndUpdate(
        { storeId, categoryId: tnCategory.id },
        {
          storeId,
          categoryId: tnCategory.id,
          name: tnCategory.name.es || tnCategory.name,
          description: tnCategory.description?.es || tnCategory.description || "",
          handle: tnCategory.handle,
          parent: tnCategory.parent,
          subcategories: tnCategory.subcategories || [],
          seoTitle: tnCategory.seo_title?.es || tnCategory.seo_title || "",
          seoDescription: tnCategory.seo_description?.es || tnCategory.seo_description || "",
          googleShoppingCategory: tnCategory.google_shopping_category,
          createdAtTN: new Date(tnCategory.created_at),
          updatedAtTN: new Date(tnCategory.updated_at),
          syncedAt: new Date(),
          syncError: null,
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      await CategoryModel.findOneAndUpdate(
        { storeId, categoryId: tnCategory.id },
        {
          syncError: error instanceof Error ? error.message : String(error),
          syncedAt: new Date(),
        },
        { upsert: true }
      );
      
      throw error;
    }
  }

  /**
   * Construye árbol jerárquico de categorías
   */
  private buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Mapear todas las categorías
    categories.forEach(cat => {
      categoryMap.set(cat.categoryId, { ...cat, children: [] });
    });

    // Construir árbol
    categories.forEach(cat => {
      const node = categoryMap.get(cat.categoryId);
      
      if (!cat.parent) {
        rootCategories.push(node);
      } else {
        const parent = categoryMap.get(cat.parent);
        if (parent) {
          parent.children.push(node);
        } else {
          // Si el padre no existe, agregar como raíz
          rootCategories.push(node);
        }
      }
    });

    return rootCategories;
  }
}