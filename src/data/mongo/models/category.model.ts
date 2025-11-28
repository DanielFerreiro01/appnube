import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface ICategory {
  storeId: number;
  categoryId: number;
  name: string;
  description?: string;
  handle?: string;
  parent?: number;
  subcategories?: number[];
  seoTitle?: string;
  seoDescription?: string;
  googleShoppingCategory?: string;
  createdAtTN?: Date;
  updatedAtTN?: Date;
  syncedAt?: Date;
  syncError?: string;
}

/**
 * Interfaz del documento de Mongoose
 */
export interface ICategoryDocument extends ICategory, Document {
  // Métodos custom del documento
}

/**
 * Schema de Mongoose
 */
const CategorySchema = new Schema<ICategoryDocument>(
  {
    storeId: { type: Number, required: true },
    categoryId: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String },
    handle: { type: String },
    parent: { type: Number },
    subcategories: [{ type: Number }],
    seoTitle: { type: String },
    seoDescription: { type: String },
    googleShoppingCategory: { type: String },
    createdAtTN: { type: Date },
    updatedAtTN: { type: Date },
    syncedAt: { type: Date, default: Date.now },
    syncError: { type: String },
  },
  { versionKey: false }
);

// Índices
CategorySchema.index({ storeId: 1, categoryId: 1 }, { unique: true });
CategorySchema.index({ storeId: 1, handle: 1 });
CategorySchema.index({ storeId: 1, parent: 1 });

// Transform para JSON
CategorySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

/**
 * Modelo tipado
 */
export const CategoryModel = model<ICategoryDocument>("Category", CategorySchema);