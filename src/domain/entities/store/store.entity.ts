import { CustomError } from "../../errors/custom.error";

export class StoreEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly categories: string[] = [],
    public readonly storeId?: number, // ID de Tiendanube
    public readonly accessToken?: string, // Token OAuth
    public readonly isConnected: boolean = false,
    public readonly installedAt?: Date,
    public readonly lastSync?: Date,
    public readonly createdAt?: Date,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const { 
      id, 
      _id, 
      name, 
      tiendanubeUrl, 
      description, 
      logo, 
      categories,
      storeId,
      accessToken,
      installedAt,
      lastSync,
      createdAt,
    } = obj;

    if (!_id && !id) throw CustomError.badRequest('Store id is required');
    if (!name) throw CustomError.badRequest('Store name is required');
    if (!tiendanubeUrl) throw CustomError.badRequest('Store Tiendanube URL is required');

    if (categories && !Array.isArray(categories))
      throw CustomError.badRequest('Categories must be an array');

    // Validar que si hay accessToken, también haya storeId
    if (accessToken && !storeId) {
      throw CustomError.badRequest('Store ID from Tiendanube is required when access token is present');
    }

    const isConnected = !!(storeId && accessToken);

    return new StoreEntity(
      _id || id,
      name,
      tiendanubeUrl,
      description,
      logo,
      categories,
      storeId,
      accessToken,
      isConnected,
      installedAt,
      lastSync,
      createdAt || new Date(),
    );
  }
}