import { CustomError } from "../../errors/custom.error";

export class CategoryEntity {
  constructor(
    public readonly id: string,
    public readonly storeId: number,
    public readonly categoryId: number,
    public readonly name: string,
    public readonly description?: string,
    public readonly handle?: string,
    public readonly parent?: number,
    public readonly subcategories: number[] = [],
    public readonly seoTitle?: string,
    public readonly seoDescription?: string,
    public readonly googleShoppingCategory?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly syncedAt?: Date,
    public readonly syncError?: string,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const { 
      id, 
      _id, 
      storeId, 
      categoryId,
      name, 
      description,
      handle,
      parent,
      subcategories,
      seoTitle,
      seoDescription,
      googleShoppingCategory,
      createdAt,
      updatedAt,
      syncedAt,
      syncError
    } = obj;

    if (!_id && !id) throw CustomError.badRequest("Category id is required");
    if (!storeId) throw CustomError.badRequest("Store id is required");
    if (!categoryId) throw CustomError.badRequest("Category ID from Tiendanube is required");
    if (!name) throw CustomError.badRequest("Category name is required");

    return new CategoryEntity(
      _id || id,
      Number(storeId),
      Number(categoryId),
      name,
      description,
      handle,
      parent,
      subcategories ?? [],
      seoTitle,
      seoDescription,
      googleShoppingCategory,

      createdAt || new Date(),
      updatedAt,
      syncedAt,

      syncError
    );
  }
}
