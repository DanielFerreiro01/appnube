export class UpdateStoreDTO {
  constructor(
    public readonly name?: string,
    public readonly tiendanubeUrl?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly storeId?: number,
    public readonly accessToken?: string,
  ) {}

  static create(object: { [key: string]: any }): [string?, UpdateStoreDTO?] {
    const { name, tiendanubeUrl, description, logo, storeId, accessToken } = object;

    // Validaciones opcionales
    if (name !== undefined && typeof name !== 'string') {
      return ['Name must be a string'];
    }

    if (tiendanubeUrl !== undefined && typeof tiendanubeUrl !== 'string') {
      return ['Tiendanube URL must be a string'];
    }

    if (storeId !== undefined && (typeof storeId !== 'number' || storeId <= 0)) {
      return ['Store ID must be a positive number'];
    }

    if (accessToken !== undefined && typeof accessToken !== 'string') {
      return ['Access token must be a string'];
    }

    return [
      undefined,
      new UpdateStoreDTO(
        name,
        tiendanubeUrl,
        description,
        logo,
        storeId,
        accessToken
      ),
    ];
  }
}