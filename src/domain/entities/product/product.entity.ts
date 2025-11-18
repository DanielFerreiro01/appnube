import { CustomError } from "../../errors/custom.error.js";

export class ProductEntity {
  constructor(
    public readonly id: string,
    public readonly storeId: number, // Cambiado a number para match con Tiendanube
    public readonly productId: number,
    public readonly name: string,
    public readonly price: number,
    public readonly handle?: string, // Permalink/handle
    public readonly permalink?: string, // URL completa
    public readonly description?: string,
    public readonly mainImage?: string,
    public readonly published?: boolean,
    public readonly tags?: string[],
    public readonly createdAt?: Date,
    public readonly syncedAt?: Date,
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
      createdAt,
      syncedAt,
    } = obj;

    if (!_id && !id) throw CustomError.badRequest('Product id is required');
    if (!storeId) throw CustomError.badRequest('Store id is required');
    if (!productId) throw CustomError.badRequest('Product ID from Tiendanube is required');
    if (!name) throw CustomError.badRequest('Product name is required');
    if (price === undefined || price === null) throw CustomError.badRequest('Product price is required');

    if (typeof price !== 'number' || price < 0)
      throw CustomError.badRequest('Price must be a positive number');

    return new ProductEntity(
      _id || id,
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
      createdAt || new Date(),
      syncedAt,
    );
  }
}