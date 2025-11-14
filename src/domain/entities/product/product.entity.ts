import { CustomError } from "../../errors/custom.error.js";

export class ProductEntity {
  constructor(
    public readonly id: string,
    public readonly storeId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly category: string,
    public readonly imageUrl?: string,
    public readonly inStock?: boolean,
    public readonly createdAt?: Date,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const { id, _id, storeId, name, price, category, imageUrl, inStock } = obj;

    if (!_id && !id) throw CustomError.badRequest('Product id is required');
    if (!storeId) throw CustomError.badRequest('Store id is required');
    if (!name) throw CustomError.badRequest('Product name is required');
    if (price === undefined) throw CustomError.badRequest('Product price is required');
    if (!category) throw CustomError.badRequest('Category is required');

    if (typeof price !== 'number' || price < 0)
      throw CustomError.badRequest('Price must be a positive number');

    return new ProductEntity(
      _id || id,
      storeId,
      name,
      price,
      category,
      imageUrl,
      inStock ?? true,
      new Date(),
    );
  }
}
