import { CustomError } from "../../errors/custom.error";



export class FavoriteEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly productId: string,
    public readonly storeId: string,
    public readonly createdAt?: Date,
  ) {}

  static fromObject(obj: { [key: string]: any }) {
    const { id, _id, userId, productId, storeId } = obj;

    if (!userId) throw CustomError.badRequest('User id is required');
    if (!productId) throw CustomError.badRequest('Product id is required');

    return new FavoriteEntity(_id || id, userId, productId, storeId, new Date());
  }
}
