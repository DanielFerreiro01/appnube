import { StoreEntity } from "../../entities/store/store.entity.js";

export class StoreResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tiendanubeUrl: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly categories?: string[],
    // Nuevos campos para OAuth
    public readonly storeId?: number, // ID de Tiendanube
    public readonly accessToken?: string, // Token OAuth
    public readonly isConnected?: boolean, // Si tiene token válido
    public readonly installedAt?: Date,
    public readonly lastSync?: Date,
  ) {}

  static fromEntity(entity: StoreEntity) {
    return new StoreResponseDTO(
      entity.id,
      entity.name,
      entity.tiendanubeUrl,
      entity.description,
      entity.logo,
      entity.categories,
      entity.storeId,
      entity.accessToken,
      entity.isConnected,
      entity.installedAt,
      entity.lastSync,
    );
  }
}