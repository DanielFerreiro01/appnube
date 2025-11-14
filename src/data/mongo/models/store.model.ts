import { Schema, model } from "mongoose";

const StoreSchema = new Schema(
  {
    storeId: { type: Number, required: true, unique: true }, // ID de Tiendanube
    name: { type: String, required: true },
    domain: { type: String },
    accessToken: { type: String, required: true }, // para llamar a la API
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const StoreModel = model("Store", StoreSchema);
