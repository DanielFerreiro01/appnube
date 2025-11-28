import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface IFavorite {
  userId: string;
  productId: number;
  storeId: number;
  createdAt?: Date;
}

/**
 * Interfaz del documento de Mongoose
 */
export interface IFavoriteDocument extends IFavorite, Document {}

/**
 * Schema de Mongoose
 */
const FavoriteSchema = new Schema<IFavoriteDocument>(
  {
    userId: { type: String, required: true },
    productId: { type: Number, required: true },
    storeId: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Índice único: un usuario no puede tener el mismo producto 2 veces
FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Índice para buscar favoritos por usuario
FavoriteSchema.index({ userId: 1 });

// Índice para buscar favoritos por tienda
FavoriteSchema.index({ storeId: 1 });

/**
 * Modelo tipado
 */
export const FavoriteModel = model<IFavoriteDocument>("Favorite", FavoriteSchema);