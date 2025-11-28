import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface IImage {
  storeId: number;
  productId: number;
  imageId: number;
  src: string;
  alt?: string[];
  position?: number;
}

/**
 * Interfaz del documento de Mongoose
 */
export interface IImageDocument extends IImage, Document {}

/**
 * Schema de Mongoose
 */
const ImageSchema = new Schema<IImageDocument>(
  {
    storeId: { type: Number, required: true },
    productId: { type: Number, required: true },
    imageId: { type: Number, required: true },
    src: { type: String, required: true },
    alt: [{ type: String }],
    position: { type: Number },
  },
  { versionKey: false }
);

// Índices
ImageSchema.index({ storeId: 1, productId: 1, imageId: 1 }, { unique: true });
ImageSchema.index({ storeId: 1, productId: 1 });

/**
 * Modelo tipado
 */
export const ImageModel = model<IImageDocument>("Image", ImageSchema);