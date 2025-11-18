import { CustomError } from "../../errors/custom.error";

export class StoreEntity {
  constructor(
    public readonly id: string,                // Mongo ID
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly categories: string[] = [],
    
    // Campos de integración con Tiendanube
    public readonly storeId?: number,          // ID real de la tienda (Tiendanube)
    public readonly accessToken?: string,      // Token OAuth de Tiendanube

    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const {
      id,
      _id,
      name,
      tiendanubeUrl,
      description,
      logo,
      categories = [],
      storeId,
      accessToken,
      createdAt,
      updatedAt,
    } = obj;

    // Validaciones mínimas
    if (!_id && !id) throw CustomError.badRequest("Store id is required");
    if (!name) throw CustomError.badRequest("Store name is required");
    if (!tiendanubeUrl) throw CustomError.badRequest("Store Tiendanube URL is required");

    if (categories && !Array.isArray(categories))
      throw CustomError.badRequest("Categories must be an array");

    return new StoreEntity(
      _id || id,
      name,
      tiendanubeUrl,
      description,
      logo,
      categories,
      storeId,
      accessToken,
      createdAt ? new Date(createdAt) : new Date(),
      updatedAt ? new Date(updatedAt) : new Date()
    );
  }
}
