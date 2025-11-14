export class CreateProductDTO {
  constructor(
    public readonly storeId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly category: string,
    public readonly imageUrl?: string,
    public readonly inStock?: boolean,
  ) {
    if (!storeId) throw new Error('Store ID is required');
    if (!name) throw new Error('Product name is required');
    if (price === undefined || price < 0)
      throw new Error('Invalid product price');
  }
}
