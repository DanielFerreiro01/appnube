import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { PaginationDto } from "../../domain/dtos/shared/pagination.dto";
import { ProductService } from "../services/product/product.service";
import { ProductFiltersDTO } from "../../domain/dtos/product/product-filters.dto";

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.log(`${error}`);
    return res.status(500).json({ error: "Internal server error" });
  };

  /**
   * Obtiene productos con filtros avanzados
   * GET /api/products/:storeId?page=1&limit=20&published=true&minPrice=100&maxPrice=5000&inStock=true&tags=remera,ropa&sort=price-asc&search=remera
   */
  getProducts = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20, sort = "newest" } = req.query;

    // ✅ NUEVO: Validar filtros con DTO
    const [filterError, filtersDto] = ProductFiltersDTO.create(req.query);
    if (filterError) return res.status(400).json({ error: filterError });

    const [paginationError, paginationDto] = PaginationDto.create(
      Number(page),
      Number(limit)
    );
    if (paginationError) return res.status(400).json({ error: paginationError });

    try {
      const products = await this.productService.getProducts(
        Number(storeId),
        filtersDto!,
        paginationDto!,
        sort as any
      );
      return res.json(products);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene un producto por ID con detalles completos
   * GET /api/products/:storeId/:productId
   */
  getProductById = async (req: Request, res: Response) => {
    const { storeId, productId } = req.params;

    try {
      const product = await this.productService.getProductById(
        Number(storeId),
        Number(productId)
      );
      return res.json(product);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene productos relacionados
   * GET /api/products/:storeId/:productId/related?limit=6
   */
  getRelatedProducts = async (req: Request, res: Response) => {
    const { storeId, productId } = req.params;
    const { limit = 6 } = req.query;

    try {
      const relatedProducts = await this.productService.getRelatedProducts(
        Number(storeId),
        Number(productId),
        Number(limit)
      );
      return res.json(relatedProducts);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene todos los tags de una tienda
   * GET /api/products/:storeId/tags
   */
  getTags = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const tags = await this.productService.getTags(Number(storeId));
      return res.json(tags);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene productos por tag/categoría
   * GET /api/products/:storeId/category/:tag?page=1&limit=20
   */
  getProductsByTag = async (req: Request, res: Response) => {
    const { storeId, tag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const [error, paginationDto] = PaginationDto.create(
      Number(page),
      Number(limit)
    );

    if (error) return res.status(400).json({ error });

    try {
      const products = await this.productService.getProductsByTag(
        Number(storeId),
        tag,
        paginationDto!
      );
      return res.json(products);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene productos destacados
   * GET /api/products/:storeId/featured?limit=12
   */
  getFeaturedProducts = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { limit = 12 } = req.query;

    try {
      const products = await this.productService.getFeaturedProducts(
        Number(storeId),
        Number(limit)
      );
      return res.json(products);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Busca productos
   * GET /api/products/:storeId/search?q=remera&page=1&limit=20
   */
  searchProducts = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search term is required (q)" });
    }

    const [error, paginationDto] = PaginationDto.create(
      Number(page),
      Number(limit)
    );

    if (error) return res.status(400).json({ error });

    try {
      const results = await this.productService.searchProducts(
        Number(storeId),
        String(q),
        paginationDto!
      );
      return res.json(results);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene el rango de precios
   * GET /api/products/:storeId/price-range
   */
  getPriceRange = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const priceRange = await this.productService.getPriceRange(
        Number(storeId)
      );
      return res.json(priceRange);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene estadísticas de productos
   * GET /api/products/:storeId/stats
   */
  getProductStats = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const stats = await this.productService.getProductStats(
        Number(storeId)
      );
      return res.json(stats);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}