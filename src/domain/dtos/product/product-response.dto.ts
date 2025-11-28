import { ProductEntity } from "../../entities/product/product.entity.js";

export class ProductResponseDTO {
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
    public readonly createdAt?: Date,
    public readonly syncedAt?: Date,
  ) {}

  static fromEntity(entity: ProductEntity) {
    return new ProductResponseDTO(
      entity.id,
      entity.storeId,
      entity.productId,
      entity.name,
      entity.price,
      entity.handle,
      entity.permalink,
      entity.description,
      entity.mainImage,
      entity.published,
      entity.tags,
      entity.createdAt,
      entity.syncedAt
    );
  }
}
