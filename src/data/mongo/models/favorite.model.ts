import { Schema, model } from "mongoose";

const FavoriteSchema = new Schema(
  {
    userId: { type: String, required: true }, // id de tu usuario en tu app
    productId: { type: Number, required: true }, // ID de TND o de tu ProductModel
    storeId: { type: Number, required: true }, // para saber de qué tienda es
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const FavoriteModel = model("Favorite", FavoriteSchema);
