import { CustomError } from "../../../domain";
import { StoreModel, ProductModel, VariantModel, ImageModel} from "../../../data/mongo";
import type { IProduct } from "../../../data/mongo/models/product.model";
import type { IVariant } from "../../../data/mongo/models/variant.model";
import type { IImage } from "../../../data/mongo/models/image.model";


interface TiendanubeProduct {
  id: number;
  name: { es: string };
  description: { es: string };
  handle: string | { es: string }; // 🔥 Puede ser string u objeto
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
   * 🔥 Helper para extraer valores multiidioma de Tiendanube
   * Igual que en tiendanube-category.service.ts
   */
  private extractMultilangValue(value: any, fallback: string = ''): string {
    if (!value) return fallback;
    
    // Si es un objeto con 'es', extraer el valor
    if (typeof value === 'object' && value.es !== undefined) {
      return String(value.es || fallback);
    }
    
    // Si ya es string, devolverlo
    if (typeof value === 'string') {
      return value || fallback;
    }
    
    return fallback;
  }

  /**
   * Guarda o actualiza un producto con sus variantes e imágenes
   */
  private async saveProduct(
    storeId: number,
    tnProduct: TiendanubeProduct
  ): Promise<IProduct> {
    try {
      const basePrice = parseFloat(tnProduct.variants[0]?.price || "0");

      // 🔥 Extraer handle usando el helper
      let finalHandle = this.extractMultilangValue(tnProduct.handle);

      const permalink =
        tnProduct.canonical_url ??
        `https://${storeId}.mitiendanube.com/productos/${finalHandle}`;

      // Validar handle único
      if (finalHandle) {
        const existingProduct = await ProductModel.findOne({
          storeId,
          handle: finalHandle,
          productId: { $ne: tnProduct.id }
        });

        if (existingProduct) {
          console.warn(
            `[PRODUCT-SYNC] Handle collision for product ${tnProduct.id}. Using fallback.`
          );
          finalHandle = `${finalHandle}-${tnProduct.id}`;
        }
      }

      const categoryIds = tnProduct.categories?.map((c) => c.id) ?? [];

      // 🔥 Usar extractMultilangValue para name y description también
      const productData: Partial<IProduct> = {
        storeId,
        productId: tnProduct.id,
        name: this.extractMultilangValue(tnProduct.name, `Product ${tnProduct.id}`),
        description: this.extractMultilangValue(tnProduct.description, ''),
        handle: finalHandle,
        permalink,
        price: basePrice,
        categories: categoryIds,
        published: tnProduct.published,
        tags: tnProduct.tags?.split(",").map((t) => t.trim()) || [],
        mainImage: tnProduct.images[0]?.src,
        updatedAtTN: new Date(tnProduct.updated_at),
        createdAtTN: new Date(tnProduct.created_at),
        syncedAt: new Date(),
        syncError: undefined
      };

      // Guardar o actualizar producto
      const product = await ProductModel.findOneAndUpdate(
        { storeId, productId: tnProduct.id },
        productData,
        { new: true, upsert: true }
      );

      if (!product) {
        throw new Error("Failed to save product");
      }

      // --- GUARDAR VARIANTES ---
      await VariantModel.deleteMany({ storeId, productId: tnProduct.id });

      const variantsToInsert: IVariant[] = tnProduct.variants.map((v) => ({
        storeId,
        productId: tnProduct.id,
        variantId: v.id,
        price: parseFloat(v.price),
        stock: v.stock,
        sku: v.sku,
        values: v.values?.map((val) => this.extractMultilangValue(val)) || [],
        createdAtTN: new Date(v.created_at),
        updatedAtTN: new Date(v.updated_at)
      })) as unknown as IVariant[];

      if (variantsToInsert.length > 0) {
        await VariantModel.insertMany(variantsToInsert);
      }

      // --- GUARDAR IMÁGENES ---
      await ImageModel.deleteMany({ storeId, productId: tnProduct.id });

      const imagesToInsert: IImage[] = tnProduct.images.map((img) => ({
        storeId,
        productId: tnProduct.id,
        imageId: img.id,
        src: img.src,
        position: img.position,
        alt: img.alt?.map((a) => this.extractMultilangValue(a)) || []
      })) as unknown as IImage[];

      if (imagesToInsert.length > 0) {
        await ImageModel.insertMany(imagesToInsert);
      }

      return product;
    } catch (error) {
      // 🔥 Registrar error en el producto para debugging
      await ProductModel.findOneAndUpdate(
        { storeId, productId: tnProduct.id },
        {
          syncError: error instanceof Error ? error.message : String(error),
          syncedAt: new Date(),
        },
        { upsert: true }
      );
      
      throw CustomError.internalServerError(`Error saving product: ${error}`);
    }
  }

}