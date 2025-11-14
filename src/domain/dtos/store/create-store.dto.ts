export class CreateStoreDTO {
  constructor(
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
  ) {
    if (!name) throw new Error('Store name is required');
    if (!tiendanubeUrl) throw new Error('Tiendanube URL is required');
  }
}
