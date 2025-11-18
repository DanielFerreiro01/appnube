import { CustomError } from "../../../domain";
import { StoreModel, ProductModel, VariantModel, ImageModel } from "../../../data/mongo";

interface TiendanubeProduct {
  id: number;
  name: { es: string };
  description: { es: string };
  handle: string; // Permalink único del producto
  attributes: Array<{ es: string }>;
  published: boolean;
  free_shipping: boolean;
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
  canonical_url?: string; // URL completa del producto
}

export class TiendanubeService {
  constructor() {}

  /**
   * Obtiene productos de Tiendanube con manejo robusto de errores
   */
  async fetchProducts(
    storeId: number,
    accessToken: string,
    page: number = 1
  ): Promise<TiendanubeProduct[]> {
    try {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/products?page=${page}&per_page=50`,
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
        
        // Manejo específico de errores comunes
        if (response.status === 401) {
          throw CustomError.unauthorized('Invalid or expired access token');
        }
        if (response.status === 404) {
          throw CustomError.notFound('Store not found in Tiendanube');
        }
        if (response.status === 429) {
          throw CustomError.badRequest('Rate limit exceeded. Please try again later');
        }
        
        throw CustomError.badRequest(
          `Tiendanube API error: ${response.status} ${response.statusText} - ${errorText}`
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
   * Sincroniza productos con validación mejorada de handle/permalink
   */
  async syncProducts(mongoStoreId: string) {
    try {
      const store = await StoreModel.findById(mongoStoreId);

      if (!store) {
        throw CustomError.notFound("Store not found");
      }

      if (!store.storeId || !store.accessToken) {
        throw CustomError.badRequest(
          "Store does not have Tiendanube credentials. Please complete OAuth installation first."
        );
      }

      let page = 1;
      let hasMoreProducts = true;
      let totalSynced = 0;
      const errors: Array<{ productId: number; error: string }> = [];

      console.log(`[SYNC] Starting sync for store ${store.storeId} (${store.name})`);

      while (hasMoreProducts) {
        try {
          console.log(`[SYNC] Fetching page ${page}...`);
          
          const products = await this.fetchProducts(
            store.storeId,
            store.accessToken,
            page
          );

          if (products.length === 0) {
            console.log("[SYNC] No more products to sync");
            hasMoreProducts = false;
            break;
          }

          console.log(`[SYNC] Processing ${products.length} products from page ${page}`);

          for (const tnProduct of products) {
            try {
              await this.saveProduct(store.storeId, tnProduct);
              totalSynced++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`[SYNC] Error saving product ${tnProduct.id}:`, errorMsg);
              errors.push({
                productId: tnProduct.id,
                error: errorMsg,
              });
            }
          }

          page++;

          // Límite de seguridad (ajustable según necesidad)
          if (page > 20) {
            console.log("[SYNC] Reached page limit (20 pages = 1000 products)");
            hasMoreProducts = false;
          }
        } catch (error) {
          console.error(`[SYNC] Error fetching page ${page}:`, error);
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
   * Guarda producto con validación mejorada de handle único
   */
  private async saveProduct(storeId: number, tnProduct: TiendanubeProduct) {
    try {
      const basePrice = parseFloat(tnProduct.variants[0]?.price || "0");
      
      // Construir permalink completo
      const permalink = tnProduct.canonical_url || 
                       `https://${storeId}.mitiendanube.com/productos/${tnProduct.handle}`;

      // Validar handle único
      let finalHandle = tnProduct.handle;
      if (finalHandle) {
        const existingProduct = await ProductModel.findOne({
          storeId,
          handle: finalHandle,
          productId: { $ne: tnProduct.id }, // Excluir el producto actual
        });

        if (existingProduct) {
          console.warn(
            `[SYNC] Handle collision detected for product ${tnProduct.id}. ` +
            `Handle "${finalHandle}" already used by product ${existingProduct.productId}`
          );
          // Estrategia: usar productId como sufijo para garantizar unicidad
          finalHandle = `${finalHandle}-${tnProduct.id}`;
        }
      }

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
          mainImage: tnProduct.images[0]?.src,
          createdAtTN: new Date(tnProduct.created_at),
          updatedAtTN: new Date(tnProduct.updated_at),
          syncedAt: new Date(),
          syncError: null, // Limpiar error previo si existía
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
        for (const image of tnProduct.images) {
          await ImageModel.findOneAndUpdate(
            { storeId, productId: tnProduct.id, imageId: image.id },
            {
              storeId,
              productId: tnProduct.id,
              imageId: image.id,
              src: image.src,
              alt: image.alt?.[0]?.es || image.alt?.[0] || "",
              position: image.position || 0,
            },
            { upsert: true, new: true }
          );
        }
      }
    } catch (error) {
      // Registrar error en el producto para debugging
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

  /**
   * Busca productos por nombre o tags
   * @param storeId - ID de Tiendanube
   * @param searchTerm - Término de búsqueda
   * @param page - Número de página
   * @param limit - Cantidad de resultados por página
   * @returns Productos que coinciden con la búsqueda
   */

  async getLocalProducts(
    storeId: number,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        ProductModel.find({ storeId })
          .skip(skip)
          .limit(limit)
          .sort({ updatedAtTN: -1 }) // Ordenar por última actualización
          .lean(), // Usar lean() para mejor performance
        ProductModel.countDocuments({ storeId }),
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting local products: ${error}`
      );
    }
  }

  /**
   * Obtiene un producto específico con sus variantes e imágenes
   * @param storeId - ID de Tiendanube
   * @param productId - ID del producto en Tiendanube
   * @returns Producto con variantes e imágenes
   */
  async getProductDetails(storeId: number, productId: number) {
    try {
      const [product, variants, images] = await Promise.all([
        ProductModel.findOne({ storeId, productId }).lean(),
        VariantModel.find({ storeId, productId }).lean(),
        ImageModel.find({ storeId, productId }).sort({ position: 1 }).lean(),
      ]);

      if (!product) {
        throw CustomError.notFound("Product not found");
      }

      return {
        product,
        variants: variants || [],
        images: images || [],
        stats: {
          totalVariants: variants?.length || 0,
          totalImages: images?.length || 0,
          totalStock: variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
          minPrice: variants?.length > 0 
            ? Math.min(...variants.map(v => v.price)) 
            : product.price,
          maxPrice: variants?.length > 0 
            ? Math.max(...variants.map(v => v.price)) 
            : product.price,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error getting product details: ${error}`
      );
    }
  }

  /**
   * Busca productos por nombre o tags
   * @param storeId - ID de Tiendanube
   * @param searchTerm - Término de búsqueda
   * @param page - Número de página
   * @param limit - Cantidad de resultados por página
   * @returns Productos que coinciden con la búsqueda
   */
  async searchProducts(
    storeId: number,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      // Búsqueda case-insensitive en nombre y tags
      const query = {
        storeId,
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { tags: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      };

      const [products, total] = await Promise.all([
        ProductModel.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ updatedAtTN: -1 })
          .lean(),
        ProductModel.countDocuments(query),
      ]);

      return {
        products,
        searchTerm,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error searching products: ${error}`
      );
    }
  }

  /**
   * Obtiene estadísticas de una tienda
   * @param storeId - ID de Tiendanube
   * @returns Estadísticas de la tienda
   */
  async getStoreStats(storeId: number) {
    try {
      const [
        totalProducts,
        publishedProducts,
        totalVariants,
        totalImages,
        lastSync,
      ] = await Promise.all([
        ProductModel.countDocuments({ storeId }),
        ProductModel.countDocuments({ storeId, published: true }),
        VariantModel.countDocuments({ storeId }),
        ImageModel.countDocuments({ storeId }),
        ProductModel.findOne({ storeId })
          .sort({ syncedAt: -1 })
          .select("syncedAt")
          .lean(),
      ]);

      // Calcular productos con y sin stock
      const variants = await VariantModel.find({ storeId }).lean();
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      
      // Agrupar productos por stock
      const productsWithStock = await ProductModel.aggregate([
        { $match: { storeId } },
        {
          $lookup: {
            from: "variants",
            localField: "productId",
            foreignField: "productId",
            as: "variants",
          },
        },
        {
          $addFields: {
            totalStock: { $sum: "$variants.stock" },
          },
        },
        {
          $group: {
            _id: null,
            withStock: {
              $sum: { $cond: [{ $gt: ["$totalStock", 0] }, 1, 0] },
            },
            withoutStock: {
              $sum: { $cond: [{ $eq: ["$totalStock", 0] }, 1, 0] },
            },
          },
        },
      ]);

      const stockStats = productsWithStock[0] || { withStock: 0, withoutStock: 0 };

      return {
        storeId,
        totalProducts,
        publishedProducts,
        unpublishedProducts: totalProducts - publishedProducts,
        totalVariants,
        totalImages,
        totalStock,
        productsWithStock: stockStats.withStock,
        productsWithoutStock: stockStats.withoutStock,
        lastSync: lastSync?.syncedAt,
        averageImagesPerProduct: totalProducts > 0 
          ? (totalImages / totalProducts).toFixed(2) 
          : 0,
        averageVariantsPerProduct: totalProducts > 0 
          ? (totalVariants / totalProducts).toFixed(2) 
          : 0,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting store stats: ${error}`
      );
    }
  }

}