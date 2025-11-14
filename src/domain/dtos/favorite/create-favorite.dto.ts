export class CreateFavoriteDTO {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
    public readonly storeId: string,
  ) {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
  }
}
