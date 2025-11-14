import { Schema, model } from "mongoose";

const ProductSchema = new Schema(
  {
    storeId: { type: Number, required: true }, // referencia directa a Store
    productId: { type: Number, required: true }, // ID real de Tiendanube
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true }, // precio base
    permalink: { type: String },
    published: { type: Boolean },
    tags: [{ type: String }],
    mainImage: { type: String }, // URL principal
    createdAtTN: { type: Date },  // fechas originales de Tiendanube
    updatedAtTN: { type: Date },

    /** Opcional pero MUY útil: */
    syncedAt: { type: Date, default: Date.now } // última sincronización
  },
  { versionKey: false }
);

export const ProductModel = model("Product", ProductSchema);
