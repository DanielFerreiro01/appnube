import { ProductEntity } from "../../entities/product/product.entity.js";

export class ProductResponseDTO {
  constructor(
    public readonly id: string,
    public readonly storeId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly category: string,
    public readonly imageUrl?: string,
    public readonly inStock?: boolean,
  ) {}

  static fromEntity(entity: ProductEntity) {
    return new ProductResponseDTO(
      entity.id,
      entity.storeId,
      entity.name,
      entity.price,
      entity.category,
      entity.imageUrl,
      entity.inStock
    );
  }
}
