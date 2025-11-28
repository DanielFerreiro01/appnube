import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface IVariant {
  storeId: number;
  productId: number;
  variantId: number;
  sku?: string;
  price: number;
  stock: number;
  options?: string[];
  updatedAtTN?: Date;
}

/**
 * Interfaz del documento de Mongoose
 */
export interface IVariantDocument extends IVariant, Document {}

/**
 * Schema de Mongoose
 */
const VariantSchema = new Schema<IVariantDocument>(
  {
    storeId: { type: Number, required: true },
    productId: { type: Number, required: true },
    variantId: { type: Number, required: true },
    sku: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    options: [{ type: String }],
    updatedAtTN: { type: Date },
  },
  { versionKey: false }
);

// Índices
VariantSchema.index({ storeId: 1, productId: 1, variantId: 1 }, { unique: true });
VariantSchema.index({ storeId: 1, productId: 1 });
VariantSchema.index({ storeId: 1, stock: 1 });

/**
 * Modelo tipado
 */
export const VariantModel = model<IVariantDocument>("Variant", VariantSchema);