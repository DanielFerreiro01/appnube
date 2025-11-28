import { CategoryEntity } from "../../entities/category/category.entity";

/**
 * DTO de respuesta para categorías
 * Solo lectura - No se crean categorías manualmente
 */
export class CategoryResponseDTO {
  constructor(
    public readonly id: string,
    public readonly storeId: number,
    public readonly categoryId: number,
    public readonly name: string,
    public readonly description?: string,
    public readonly handle?: string,
    public readonly parent?: number,
    public readonly subcategories?: number[],
    public readonly seoTitle?: string,
    public readonly seoDescription?: string,
    public readonly googleShoppingCategory?: string,
    public readonly createdAt?: Date,
    public readonly syncedAt?: Date,
    // Campos adicionales para frontend
    public readonly children?: CategoryResponseDTO[], // Para árbol
  ) {}

  /**
   * Crea DTO desde entidad
   */
  static fromEntity(entity: CategoryEntity): CategoryResponseDTO {
    return new CategoryResponseDTO(
      entity.id,
      entity.storeId,
      entity.categoryId,
      entity.name,
      entity.description,
      entity.handle,
      entity.parent,
      entity.subcategories,
      entity.seoTitle,
      entity.seoDescription,
      entity.googleShoppingCategory,
      entity.createdAt,
      entity.syncedAt
    );
  }

  /**
   * Crea DTO desde múltiples entidades (con árbol)
   */
  static fromEntitiesWithTree(
    entities: CategoryEntity[],
    tree: any[]
  ): CategoryResponseDTO[] {
    return tree.map(node => {
      const dto = CategoryResponseDTO.fromEntity(
        CategoryEntity.fromObject(node)
      );
      
      // Agregar hijos recursivamente
      if (node.children && node.children.length > 0) {
        (dto as any).children = CategoryResponseDTO.fromEntitiesWithTree(
          entities,
          node.children
        );
      }
      
      return dto;
    });
  }
}