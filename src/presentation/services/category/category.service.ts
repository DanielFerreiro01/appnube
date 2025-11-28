import { CategoryModel } from "../../../data/mongo";
import type { ICategory } from "../../../data/mongo/models/category.model";
import { CustomError } from "../../../domain";

/**
 * Servicio para consultas de CATEGORÍAS
 * Solo lectura - Las categorías se sincronizan vía Tiendanube
 */
export class CategoryService {
  constructor() {}

  /**
   * Obtiene todas las categorías de una tienda
   * @param storeId - ID de Tiendanube
   * @returns Categorías con árbol jerárquico
   */
  async getCategoriesByStore(storeId: number) {
    try {
      const categories = await CategoryModel.find({ storeId })
        .sort({ name: 1 })
        .lean() as ICategory[];

      // Construir árbol jerárquico
      const tree = this.buildCategoryTree(categories);

      return {
        categories,
        tree,
        total: categories.length,
        storeId,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting categories: ${error}`
      );
    }
  }

  /**
   * Obtiene una categoría específica por ID
   * @param storeId - ID de Tiendanube
   * @param categoryId - ID de la categoría
   * @returns Categoría con subcategorías
   */
  async getCategoryById(storeId: number, categoryId: number) {
    try {
      const category = await CategoryModel.findOne({ storeId, categoryId }).lean() as ICategory | null;

      if (!category) {
        throw CustomError.notFound("Category not found");
      }

      // Obtener subcategorías si existen
      const subcategories = category.subcategories && category.subcategories.length > 0
        ? await CategoryModel.find({
            storeId,
            categoryId: { $in: category.subcategories },
          }).lean() as ICategory[]
        : [];

      // Obtener categoría padre si existe
      const parentCategory = category.parent
        ? await CategoryModel.findOne({
            storeId,
            categoryId: category.parent,
          }).lean() as ICategory | null
        : null;

      return {
        category,
        subcategories,
        parentCategory,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error getting category: ${error}`
      );
    }
  }

  /**
   * Obtiene categorías raíz (sin padre)
   * @param storeId - ID de Tiendanube
   * @returns Categorías raíz
   */
  async getRootCategories(storeId: number) {
    try {
      const categories = await CategoryModel.find({
        storeId,
        parent: null,
      })
        .sort({ name: 1 })
        .lean() as ICategory[];

      return {
        categories,
        total: categories.length,
        storeId,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting root categories: ${error}`
      );
    }
  }

  /**
   * Obtiene subcategorías de una categoría
   * @param storeId - ID de Tiendanube
   * @param parentId - ID de la categoría padre
   * @returns Subcategorías
   */
  async getSubcategories(storeId: number, parentId: number) {
    try {
      const categories = await CategoryModel.find({
        storeId,
        parent: parentId,
      })
        .sort({ name: 1 })
        .lean() as ICategory[];

      return {
        categories,
        total: categories.length,
        parentId,
        storeId,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting subcategories: ${error}`
      );
    }
  }

  /**
   * Busca categorías por nombre
   * @param storeId - ID de Tiendanube
   * @param searchTerm - Término de búsqueda
   * @returns Categorías que coinciden
   */
  async searchCategories(storeId: number, searchTerm: string) {
    try {
      const categories = await CategoryModel.find({
        storeId,
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      })
        .sort({ name: 1 })
        .lean() as ICategory[];

      return {
        categories,
        total: categories.length,
        searchTerm,
        storeId,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error searching categories: ${error}`
      );
    }
  }

  /**
   * Obtiene el breadcrumb de una categoría
   * (Ruta completa: Padre > Hijo > Nieto)
   * @param storeId - ID de Tiendanube
   * @param categoryId - ID de la categoría
   * @returns Breadcrumb completo
   */
  async getCategoryBreadcrumb(storeId: number, categoryId: number) {
    try {
      const breadcrumb: Array<{ id: number; name: string; handle?: string }> = [];
      let currentCategoryId: number | null = categoryId;

      // Recorrer hacia arriba hasta llegar a la raíz
      while (currentCategoryId) {
        const category = await CategoryModel.findOne({
          storeId,
          categoryId: currentCategoryId,
        }).lean() as ICategory | null;

        if (!category) break;

        breadcrumb.unshift({
          id: category.categoryId,
          name: category.name,
          handle: category.handle,
        });

        currentCategoryId = category.parent || null;
      }

      return {
        breadcrumb,
        total: breadcrumb.length,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting breadcrumb: ${error}`
      );
    }
  }

  /**
   * Obtiene estadísticas de categorías
   * @param storeId - ID de Tiendanube
   * @returns Estadísticas
   */
  async getCategoryStats(storeId: number) {
    try {
      const [
        totalCategories,
        rootCategories,
        categoriesWithSubcategories,
      ] = await Promise.all([
        CategoryModel.countDocuments({ storeId }),
        CategoryModel.countDocuments({ storeId, parent: null }),
        CategoryModel.countDocuments({
          storeId,
          subcategories: { $exists: true, $ne: [] },
        }),
      ]);

      // Profundidad máxima del árbol
      const maxDepth = await this.calculateMaxDepth(storeId);

      return {
        storeId,
        totalCategories,
        rootCategories,
        categoriesWithSubcategories,
        categoriesWithoutSubcategories:
          totalCategories - categoriesWithSubcategories,
        maxDepth,
      };
    } catch (error) {
      throw CustomError.internalServerError(
        `Error getting category stats: ${error}`
      );
    }
  }

  /**
   * Construye árbol jerárquico de categorías
   * @private
   */
  private buildCategoryTree(categories: ICategory[]): any[] {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Mapear todas las categorías
    categories.forEach((cat) => {
      categoryMap.set(cat.categoryId, { ...cat, children: [] });
    });

    // Construir árbol
    categories.forEach((cat) => {
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

  /**
   * Calcula la profundidad máxima del árbol
   * @private
   */
  private async calculateMaxDepth(storeId: number): Promise<number> {
    const categories = await CategoryModel.find({ storeId }).lean() as ICategory[];
    const categoryMap = new Map();

    categories.forEach((cat) => {
      categoryMap.set(cat.categoryId, cat);
    });

    let maxDepth = 0;

    for (const category of categories) {
      let depth = 0;
      let currentId: number | null = category.categoryId;

      while (currentId) {
        depth++;
        const current = categoryMap.get(currentId);
        currentId = current?.parent || null;
      }

      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }
}
