import { CustomError } from "../../errors/custom.error";

export class StoreEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly categories: string[] = [],
    public readonly createdAt?: Date,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const { id, _id, name, tiendanubeUrl, description, logo, categories } = obj;

    if (!_id && !id) throw CustomError.badRequest('Store id is required');
    if (!name) throw CustomError.badRequest('Store name is required');
    if (!tiendanubeUrl) throw CustomError.badRequest('Store Tiendanube URL is required');

    if (categories && !Array.isArray(categories))
      throw CustomError.badRequest('Categories must be an array');

    return new StoreEntity(
      _id || id,
      name,
      tiendanubeUrl,
      description,
      logo,
      categories,
      new Date(),
    );
  }
}
