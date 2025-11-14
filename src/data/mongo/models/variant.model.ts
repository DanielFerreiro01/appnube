import { Schema, model } from "mongoose";

const VariantSchema = new Schema(
  {
    storeId: { type: Number, required: true },
    productId: { type: Number, required: true },
    variantId: { type: Number, required: true }, // ID real de TN

    sku: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },

    options: [{ type: String }], // ej: ["M", "Negro"]

    updatedAtTN: { type: Date },
  },
  { versionKey: false }
);

export const VariantModel = model("Variant", VariantSchema);
