import { FavoriteEntity } from "../../entities/favorite/favorite.entity.js";

export class FavoriteResponseDTO {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly productId: string,
  ) {}

  static fromEntity(entity: FavoriteEntity) {
    return new FavoriteResponseDTO(
      entity.id,
      entity.userId,
      entity.productId
    );
  }
}
