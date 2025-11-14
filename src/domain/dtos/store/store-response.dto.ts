import { StoreEntity } from "../../entities/store/store.entity.js";

export class StoreResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly categories?: string[],
  ) {}

  static fromEntity(entity: StoreEntity) {
    return new StoreResponseDTO(
      entity.id,
      entity.name,
      entity.tiendanubeUrl,
      entity.description,
      entity.logo,
      entity.categories
    );
  }
}
