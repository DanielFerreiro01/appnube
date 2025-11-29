export class ProductFiltersDTO {
  private constructor(
    public readonly published?: boolean,
    public readonly minPrice?: number,
    public readonly maxPrice?: number,
    public readonly inStock?: boolean,
    public readonly tags?: string[],
    public readonly searchTerm?: string,
  ) {}

  static create(object: { [key: string]: any }): [string?, ProductFiltersDTO?] {
    const { published, minPrice, maxPrice, inStock, tags, searchTerm } = object;

    if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0)) {
      return ['Min price must be a positive number'];
    }

    if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0)) {
      return ['Max price must be a positive number'];
    }

    if (minPrice && maxPrice && minPrice > maxPrice) {
      return ['Min price cannot be greater than max price'];
    }

    return [
      undefined,
      new ProductFiltersDTO(
        published === 'true' ? true : published === 'false' ? false : undefined,
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
        inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        tags ? String(tags).split(',') : undefined,
        searchTerm ? String(searchTerm) : undefined
      )
    ];
  }
}