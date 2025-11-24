import { CustomError } from "../../../domain";
import { StoreModel, ProductModel, VariantModel, ImageModel } from "../../../data/mongo";

interface TiendanubeProduct {
  id: number;
  name: { es: string };
  description: { es: string };
  handle: string;
  attributes: Array<{ es: string }>;
  published: boolean;
  free_shipping: boolean;
  categories: Array<{ id: number; name: string }>;
  variants: Array<{
    id: number;
    price: string;
    stock: number;
    sku: string;
    values: Array<{ es: string }>;
    created_at: string;
    updated_at: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    position: number;
    alt: Array<{ es: string }>;
  }>;
  created_at: string;
  updated_at: string;
  tags: string;
  canonical_url?: string;
}

/**
 * Servicio para sincronización de PRODUCTOS desde Tiendanube
 * Responsabilidades:
 * - Obtener productos desde API de Tiendanube
 * - Sincronizar productos completos (inicial)
 * - Sincronizar productos individuales (webhooks)
 * - Guardar productos, variantes e imágenes
 */
export class TiendanubeProductService {
  private readonly baseApiUrl = "https://api.tiendanube.com/v1";

  /**
   * Obtiene productos de Tiendanube paginados
   */
  async fetchProducts(
    storeId: number,
    accessToken: string,
    page: number = 1
  ): Promise<TiendanubeProduct[]> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/${storeId}/products?page=${page}&per_page=50`,
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
          console.log(`[PRODUCT-SYNC] No more products on page ${page}`);
          return [];
        }
        
        const errorText = await response.text();
        throw CustomError.badRequest(
          `Tiendanube API error: ${response.status} - ${errorText}`
        );
      }

      const products: TiendanubeProduct[] = await response.json();
      return products;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error fetching products from Tiendanube: ${error}`
      );
    }
  }

  /**
   * Obtiene un producto específico desde Tiendanube
   */
  async fetchSingleProduct(
    storeId: number,
    productId: number,
    accessToken: string
  ): Promise<TiendanubeProduct> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/${storeId}/products/${productId}`,
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
          `Error fetching product ${productId}: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error fetching single product: ${error}`
      );
    }
  }

  /**
   * Sincroniza todos los productos de una tienda
   */
  async syncAllProducts(mongoStoreId: string) {
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
      let hasMoreProducts = true;
      let totalSynced = 0;
      const errors: Array<{ productId: number; error: string }> = [];

      console.log(`[PRODUCT-SYNC] Starting sync for store ${store.storeId}`);

      while (hasMoreProducts) {
        try {
          console.log(`[PRODUCT-SYNC] Fetching page ${page}...`);
          
          const products = await this.fetchProducts(
            store.storeId,
            store.accessToken,
            page
          );

          if (products.length === 0) {
            console.log("[PRODUCT-SYNC] No more products to sync");
            hasMoreProducts = false;
            break;
          }

          console.log(`[PRODUCT-SYNC] Processing ${products.length} products from page ${page}`);

          for (const tnProduct of products) {
            try {
              await this.saveProduct(store.storeId, tnProduct);
              totalSynced++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`[PRODUCT-SYNC] Error saving product ${tnProduct.id}:`, errorMsg);
              errors.push({
                productId: tnProduct.id,
                error: errorMsg,
              });
            }
          }

          page++;

          if (page > 20) {
            console.log("[PRODUCT-SYNC] Reached page limit (20 pages)");
            hasMoreProducts = false;
          }
        } catch (error) {
          console.error(`[PRODUCT-SYNC] Error fetching page ${page}:`, error);
          hasMoreProducts = false;
        }
      }

      // Actualizar última sincronización
      await StoreModel.findByIdAndUpdate(mongoStoreId, {
        lastSync: new Date(),
      });

      return {
        message: "Products synced successfully",
        totalSynced,
        storeId: store.storeId,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error syncing products: ${error}`);
    }
  }

  /**
   * Sincroniza un producto individual (para webhooks)
   */
  async syncSingleProduct(
    storeId: number,
    productId: number,
    accessToken: string
  ) {
    try {
      console.log(`[PRODUCT-SYNC] Syncing single product ${productId} for store ${storeId}`);

      const product = await this.fetchSingleProduct(storeId, productId, accessToken);
      await this.saveProduct(storeId, product);

      console.log(`[PRODUCT-SYNC] Product ${productId} synced successfully`);

      return {
        success: true,
        productId,
        message: "Product synced successfully",
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error syncing single product: ${error}`
      );
    }
  }

  /**
   * Elimina un producto y sus relaciones
   */
  async deleteProduct(storeId: number, productId: number) {
    try {
      await Promise.all([
        ProductModel.deleteOne({ storeId, productId }),
        VariantModel.deleteMany({ storeId, productId }),
        ImageModel.deleteMany({ storeId, productId }),
      ]);

      console.log(`[PRODUCT-SYNC] Product ${productId} deleted successfully`);

      return {
        success: true,
        productId,
        message: "Product deleted successfully",
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error deleting product: ${error}`
      );
    }
  }

  /**
   * Guarda o actualiza un producto con sus variantes e imágenes
   */
  private async saveProduct(storeId: number, tnProduct: TiendanubeProduct) {
    try {
      const basePrice = parseFloat(tnProduct.variants[0]?.price || "0");
      
      const permalink = tnProduct.canonical_url || 
                       `https://${storeId}.mitiendanube.com/productos/${tnProduct.handle}`;

      // Validar handle único
      let finalHandle = tnProduct.handle;
      if (finalHandle) {
        const existingProduct = await ProductModel.findOne({
          storeId,
          handle: finalHandle,
          productId: { $ne: tnProduct.id },
        });

        if (existingProduct) {
          console.warn(
            `[PRODUCT-SYNC] Handle collision for product ${tnProduct.id}. ` +
            `Using productId suffix`
          );
          finalHandle = `${finalHandle}-${tnProduct.id}`;
        }
      }

      // Extraer IDs de categorías
      const categoryIds = tnProduct.categories?.map((cat) => cat.id) || [];

      // Guardar producto
      await ProductModel.findOneAndUpdate(
        { storeId, productId: tnProduct.id },
        {
          storeId,
          productId: tnProduct.id,
          name: tnProduct.name.es || tnProduct.name,
          description: tnProduct.description?.es || tnProduct.description || "",
          price: basePrice,
          handle: finalHandle,
          permalink,
          published: tnProduct.published,
          tags: tnProduct.tags ? tnProduct.tags.split(",").map(t => t.trim()) : [],
          categories: categoryIds,
          mainImage: tnProduct.images[0]?.src,
          createdAtTN: new Date(tnProduct.created_at),
          updatedAtTN: new Date(tnProduct.updated_at),
          syncedAt: new Date(),
          syncError: null,
        },
        { upsert: true, new: true }
      );

      // Guardar variantes
      if (tnProduct.variants && tnProduct.variants.length > 0) {
        for (const variant of tnProduct.variants) {
          await VariantModel.findOneAndUpdate(
            { storeId, productId: tnProduct.id, variantId: variant.id },
            {
              storeId,
              productId: tnProduct.id,
              variantId: variant.id,
              sku: variant.sku || "",
              price: parseFloat(variant.price),
              stock: variant.stock || 0,
              options: variant.values ? variant.values.map((v) => v.es || v) : [],
              updatedAtTN: new Date(variant.updated_at),
            },
            { upsert: true, new: true }
          );
        }
      }

      // Guardar imágenes
      if (tnProduct.images && tnProduct.images.length > 0) {
        // Borrar imágenes viejas
        await ImageModel.deleteMany({ storeId, productId: tnProduct.id });
        
        // Insertar nuevas
        for (const image of tnProduct.images) {
          await ImageModel.create({
            storeId,
            productId: tnProduct.id,
            imageId: image.id,
            src: image.src,
            alt: image.alt?.[0]?.es || image.alt?.[0] || "",
            position: image.position || 0,
          });
        }
      }
    } catch (error) {
      // Registrar error en el producto
      await ProductModel.findOneAndUpdate(
        { storeId, productId: tnProduct.id },
        {
          syncError: error instanceof Error ? error.message : String(error),
          syncedAt: new Date(),
        },
        { upsert: true }
      );
      
      throw error;
    }
  }
}