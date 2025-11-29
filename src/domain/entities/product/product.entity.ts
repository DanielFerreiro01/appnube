import { CustomError } from "../../errors/custom.error";

export class ProductEntity {
  constructor(
    public readonly id: string,
    public readonly storeId: number,
    public readonly productId: number,
    public readonly name: string,
    public readonly price: number,
    public readonly handle?: string,
    public readonly permalink?: string,
    public readonly description?: string,
    public readonly mainImage?: string,
    public readonly published?: boolean,
    public readonly tags?: string[],
    public readonly categories?: number[],
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
      productId,
      name, 
      price, 
      handle,
      permalink,
      description,
      mainImage,
      published,
      tags,
      categories,
      createdAt,
      updatedAt,
      syncedAt,
      syncError
    } = obj;

    // Validaciones mínimas
    if (!storeId) throw CustomError.badRequest('Store id is required');
    if (!productId) throw CustomError.badRequest('Product ID from Tiendanube is required');
    if (!name) throw CustomError.badRequest('Product name is required');
    if (price === undefined || price === null) throw CustomError.badRequest('Product price is required');
    if (typeof price !== 'number' || price < 0)
      throw CustomError.badRequest('Price must be a positive number');

    return new ProductEntity(
      String(_id || id),
      Number(storeId),
      Number(productId),
      name,
      price,
      handle,
      permalink,
      description,
      mainImage,
      published ?? true,
      tags || [],
      categories || [],
      createdAt,
      updatedAt,
      syncedAt || new Date(),
      syncError,
    );
  }
}
