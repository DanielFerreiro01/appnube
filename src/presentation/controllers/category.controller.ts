import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { CategoryService } from "../services/category/category.service";

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.log(`${error}`);
    return res.status(500).json({ error: "Internal server error" });
  };

  /**
   * Obtiene todas las categorías con árbol jerárquico
   * GET /api/categories/:storeId
   */
  getCategories = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const result = await this.categoryService.getCategoriesByStore(
        Number(storeId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene una categoría específica
   * GET /api/categories/:storeId/:categoryId
   */
  getCategoryById = async (req: Request, res: Response) => {
    const { storeId, categoryId } = req.params;

    try {
      const result = await this.categoryService.getCategoryById(
        Number(storeId),
        Number(categoryId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene categorías raíz (sin padre)
   * GET /api/categories/:storeId/root
   */
  getRootCategories = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const result = await this.categoryService.getRootCategories(
        Number(storeId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene subcategorías de una categoría
   * GET /api/categories/:storeId/:categoryId/subcategories
   */
  getSubcategories = async (req: Request, res: Response) => {
    const { storeId, categoryId } = req.params;

    try {
      const result = await this.categoryService.getSubcategories(
        Number(storeId),
        Number(categoryId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Busca categorías por nombre
   * GET /api/categories/:storeId/search?q=remeras
   */
  searchCategories = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search term is required (q)" });
    }

    try {
      const result = await this.categoryService.searchCategories(
        Number(storeId),
        String(q)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene el breadcrumb de una categoría
   * GET /api/categories/:storeId/:categoryId/breadcrumb
   */
  getBreadcrumb = async (req: Request, res: Response) => {
    const { storeId, categoryId } = req.params;

    try {
      const result = await this.categoryService.getCategoryBreadcrumb(
        Number(storeId),
        Number(categoryId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Obtiene estadísticas de categorías
   * GET /api/categories/:storeId/stats
   */
  getStats = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      const result = await this.categoryService.getCategoryStats(
        Number(storeId)
      );
      return res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}