import { ProductModel, VariantModel, ImageModel } from "../../../data/mongo";
import { CustomError } from "../../../domain";
import { PaginationDto } from "../../../domain/dtos/shared/pagination.dto";

/**
 * Opciones de filtrado para productos
 */
interface ProductFilters {
  storeId: number;
  published?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  searchTerm?: string;
}

/**
 * Opciones de ordenamiento para productos
 */
type SortOption = 
  | "newest" 
  | "oldest" 
  | "price-asc" 
  | "price-desc" 
  | "name-asc" 
  | "name-desc"
  | "stock-desc";

/**
 * Servicio para gestión de productos
 */
export class ProductService {
  constructor() {}

  /**
   * Obtiene productos con filtros y paginación avanzada
   * @param filters - Filtros a aplicar
   * @param paginationDto - Opciones de paginación
   * @param sortBy - Tipo de ordenamiento
   * @returns Productos filtrados con paginación
   */
  async getProducts(
    filters: ProductFilters,
    paginationDto: PaginationDto,
    sortBy: SortOption = "newest"
  ) {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      // Construir query de filtros
      const query: any = { storeId: filters.storeId };

      if (filters.published !== undefined) {
        query.published = filters.published;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.searchTerm) {
        query.$or = [
          { name: { $regex: filters.searchTerm, $options: "i" } },
          { description: { $regex: filters.searchTerm, $options: "i" } },
          { tags: { $regex: filters.searchTerm, $options: "i" } },
        ];
      }

      // Determinar ordenamiento
      let sort: any = { updatedAtTN: -1 }; // Default: newest
      switch (sortBy) {
        case "oldest":
          sort = { createdAtTN: 1 };
          break;
        case "price-asc":
          sort = { price: 1 };
          break;
        case "price-desc":
          sort = { price: -1 };
          break;
        case "name-asc":
          sort = { name: 1 };
          break;
        case "name-desc":
          sort = { name: -1 };
          break;
        case "newest":
        default:
          sort = { updatedAtTN: -1 };
          break;
      }

      // Si se filtra por stock, necesitamos hacer un lookup con variants
      if (filters.inStock !== undefined) {
        const products = await this.getProductsWithStock(
          query,
          skip,
          limit,
          sort,
          filters.inStock
        );
        return products;
      }

      // Query normal sin filtro de stock
      const [products, total] = await Promise.all([
        ProductModel.find(query).skip(skip).limit(limit).sort(sort).lean(),
        ProductModel.countDocuments(query),
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
        filters: this.sanitizeFilters(filters),
        sortBy,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting products: ${error}`
      );
    }
  }

  /**
   * Obtiene productos filtrados por stock (requiere lookup con variants)
   */
  private async getProductsWithStock(
    baseQuery: any,
    skip: number,
    limit: number,
    sort: any,
    inStock: boolean
  ) {
    const products = await ProductModel.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "variants",
          let: { storeId: "$storeId", productId: "$productId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$storeId", "$$storeId"] },
                    { $eq: ["$productId", "$$productId"] },
                  ],
                },
              },
            },
          ],
          as: "variants",
        },
      },
      {
        $addFields: {
          totalStock: { $sum: "$variants.stock" },
        },
      },
      {
        $match: inStock ? { totalStock: { $gt: 0 } } : { totalStock: 0 },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          variants: 0, // No incluir las variantes en el resultado
        },
      },
    ]);

    const total = await ProductModel.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "variants",
          let: { storeId: "$storeId", productId: "$productId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$storeId", "$$storeId"] },
                    { $eq: ["$productId", "$$productId"] },
                  ],
                },
              },
            },
          ],
          as: "variants",
        },
      },
      {
        $addFields: {
          totalStock: { $sum: "$variants.stock" },
        },
      },
      {
        $match: inStock ? { totalStock: { $gt: 0 } } : { totalStock: 0 },
      },
      { $count: "total" },
    ]);

    const totalCount = total[0]?.total || 0;

    return {
      products,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: skip > 0,
      },
    };
  }

  /**
   * Obtiene un producto por ID con todas sus relaciones
   * @param storeId - ID de Tiendanube
   * @param productId - ID del producto
   * @returns Producto completo con variantes e imágenes
   */
  async getProductById(storeId: number, productId: number) {
    try {
      const [product, variants, images] = await Promise.all([
        ProductModel.findOne({ storeId, productId }).lean(),
        VariantModel.find({ storeId, productId }).lean(),
        ImageModel.find({ storeId, productId }).sort({ position: 1 }).lean(),
      ]);

      if (!product) {
        throw CustomError.notFound("Product not found");
      }

      // Calcular estadísticas
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const prices = variants.map((v) => v.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : product.price;

      return {
        product,
        variants: variants || [],
        images: images || [],
        stats: {
          totalVariants: variants.length,
          totalImages: images.length,
          totalStock,
          minPrice,
          maxPrice,
          hasStock: totalStock > 0,
          averagePrice:
            prices.length > 0
              ? prices.reduce((a, b) => a + b, 0) / prices.length
              : product.price,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error getting product: ${error}`
      );
    }
  }

  /**
   * Obtiene productos relacionados basados en tags
   * @param storeId - ID de Tiendanube
   * @param productId - ID del producto actual
   * @param limit - Cantidad de productos relacionados
   * @returns Productos relacionados
   */
  async getRelatedProducts(
    storeId: number,
    productId: number,
    limit: number = 6
  ) {
    try {
      // Obtener el producto actual
      const currentProduct = await ProductModel.findOne({
        storeId,
        productId,
      }).lean();

      if (!currentProduct) {
        throw CustomError.notFound("Product not found");
      }

      // Buscar productos con tags similares
      const relatedProducts = await ProductModel.find({
        storeId,
        productId: { $ne: productId }, // Excluir el producto actual
        published: true,
        tags: { $in: currentProduct.tags || [] },
      })
        .limit(limit)
        .sort({ updatedAtTN: -1 })
        .lean();

      return {
        relatedProducts,
        baseProduct: {
          productId: currentProduct.productId,
          name: currentProduct.name,
          tags: currentProduct.tags,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error getting related products: ${error}`
      );
    }
  }

  /**
   * Obtiene todos los tags únicos de una tienda
   * @param storeId - ID de Tiendanube
   * @returns Lista de tags con conteo
   */
  async getTags(storeId: number) {
    try {
      const tags = await ProductModel.aggregate([
        { $match: { storeId, published: true } },
        { $unwind: "$tags" },
        {
          $group: {
            _id: "$tags",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            _id: 0,
            tag: "$_id",
            count: 1,
          },
        },
      ]);

      return {
        tags,
        total: tags.length,
      };
    } catch (error) {
      throw CustomError.internalServerError(`Error getting tags: ${error}`);
    }
  }

  /**
   * Obtiene productos por categoría (tags)
   * @param storeId - ID de Tiendanube
   * @param tag - Tag a filtrar
   * @param paginationDto - Opciones de paginación
   * @returns Productos de la categoría
   */
  async getProductsByTag(
    storeId: number,
    tag: string,
    paginationDto: PaginationDto
  ) {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        ProductModel.find({
          storeId,
          tags: tag,
          published: true,
        })
          .skip(skip)
          .limit(limit)
          .sort({ updatedAtTN: -1 })
          .lean(),
        ProductModel.countDocuments({
          storeId,
          tags: tag,
          published: true,
        }),
      ]);

      return {
        products,
        tag,
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
        `Error getting products by tag: ${error}`
      );
    }
  }

  /**
   * Obtiene productos destacados (publicados y con stock)
   * @param storeId - ID de Tiendanube
   * @param limit - Cantidad de productos
   * @returns Productos destacados
   */
  async getFeaturedProducts(storeId: number, limit: number = 12) {
    try {
      const products = await ProductModel.aggregate([
        {
          $match: {
            storeId,
            published: true,
          },
        },
        {
          $lookup: {
            from: "variants",
            let: { storeId: "$storeId", productId: "$productId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$storeId", "$$storeId"] },
                      { $eq: ["$productId", "$$productId"] },
                    ],
                  },
                },
              },
            ],
            as: "variants",
          },
        },
        {
          $addFields: {
            totalStock: { $sum: "$variants.stock" },
          },
        },
        {
          $match: {
            totalStock: { $gt: 0 },
          },
        },
        { $sort: { updatedAtTN: -1 } },
        { $limit: limit },
        {
          $project: {
            variants: 0,
          },
        },
      ]);

      return {
        products,
        total: products.length,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting featured products: ${error}`
      );
    }
  }

  /**
   * Busca productos por múltiples criterios
   * @param storeId - ID de Tiendanube
   * @param searchTerm - Término de búsqueda
   * @param paginationDto - Opciones de paginación
   * @returns Resultados de búsqueda
   */
  async searchProducts(
    storeId: number,
    searchTerm: string,
    paginationDto: PaginationDto
  ) {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const query = {
        storeId,
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $regex: searchTerm, $options: "i" } },
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
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error searching products: ${error}`
      );
    }
  }

  /**
   * Obtiene el rango de precios de una tienda
   * @param storeId - ID de Tiendanube
   * @returns Rango de precios
   */
  async getPriceRange(storeId: number) {
    try {
      const result = await ProductModel.aggregate([
        { $match: { storeId, published: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
            avgPrice: { $avg: "$price" },
          },
        },
      ]);

      if (result.length === 0) {
        return {
          minPrice: 0,
          maxPrice: 0,
          avgPrice: 0,
        };
      }

      return {
        minPrice: result[0].minPrice,
        maxPrice: result[0].maxPrice,
        avgPrice: Math.round(result[0].avgPrice),
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting price range: ${error}`
      );
    }
  }

  /**
   * Obtiene estadísticas de productos por tienda
   * @param storeId - ID de Tiendanube
   * @returns Estadísticas detalladas
   */
  async getProductStats(storeId: number) {
    try {
      const [
        totalProducts,
        publishedProducts,
        productsWithImages,
        totalVariants,
        priceRange,
        topTags,
      ] = await Promise.all([
        ProductModel.countDocuments({ storeId }),
        ProductModel.countDocuments({ storeId, published: true }),
        ProductModel.countDocuments({
          storeId,
          mainImage: { $exists: true, $ne: null },
        }),
        VariantModel.countDocuments({ storeId }),
        this.getPriceRange(storeId),
        this.getTags(storeId),
      ]);

      // Productos con stock
      const productsWithStockData = await ProductModel.aggregate([
        { $match: { storeId } },
        {
          $lookup: {
            from: "variants",
            let: { storeId: "$storeId", productId: "$productId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$storeId", "$$storeId"] },
                      { $eq: ["$productId", "$$productId"] },
                    ],
                  },
                },
              },
            ],
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
            totalStock: { $sum: "$totalStock" },
            withStock: {
              $sum: { $cond: [{ $gt: ["$totalStock", 0] }, 1, 0] },
            },
            withoutStock: {
              $sum: { $cond: [{ $eq: ["$totalStock", 0] }, 1, 0] },
            },
          },
        },
      ]);

      const stockData = productsWithStockData[0] || {
        totalStock: 0,
        withStock: 0,
        withoutStock: 0,
      };

      return {
        storeId,
        totalProducts,
        publishedProducts,
        unpublishedProducts: totalProducts - publishedProducts,
        productsWithImages,
        productsWithoutImages: totalProducts - productsWithImages,
        totalVariants,
        totalStock: stockData.totalStock,
        productsWithStock: stockData.withStock,
        productsWithoutStock: stockData.withoutStock,
        priceRange,
        topTags: topTags.tags.slice(0, 10), // Top 10 tags
        totalTags: topTags.total,
        averageVariantsPerProduct:
          totalProducts > 0
            ? (totalVariants / totalProducts).toFixed(2)
            : "0",
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting product stats: ${error}`
      );
    }
  }

  /**
   * Limpia y sanitiza los filtros para la respuesta
   */
  private sanitizeFilters(filters: ProductFilters) {
    const sanitized: any = {
      storeId: filters.storeId,
    };

    if (filters.published !== undefined)
      sanitized.published = filters.published;
    if (filters.minPrice !== undefined) sanitized.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) sanitized.maxPrice = filters.maxPrice;
    if (filters.inStock !== undefined) sanitized.inStock = filters.inStock;
    if (filters.tags && filters.tags.length > 0)
      sanitized.tags = filters.tags;
    if (filters.searchTerm) sanitized.searchTerm = filters.searchTerm;

    return sanitized;
  }
}