import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento (sin métodos de Mongoose)
 */
export interface IProduct {
  storeId: number;
  productId: number;
  name: string;
  description?: string;
  price: number;
  permalink?: string;
  handle?: string;
  published?: boolean;
  tags?: string[];
  mainImage?: string;
  categories?: number[];
  createdAtTN?: Date;
  updatedAtTN?: Date;
  syncedAt?: Date;
  syncError?: string;
}

/**
 * Interfaz del documento de Mongoose (con métodos)
 */
export interface IProductDocument extends IProduct, Document {
  // Aquí podés agregar métodos custom del documento
  // Por ejemplo:
  // getFullUrl(): string;
}

/**
 * Schema de Mongoose
 */
const ProductSchema = new Schema<IProductDocument>(
  {
    storeId: { type: Number, required: true },
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    permalink: { type: String },
    handle: { type: String },
    published: { type: Boolean },
    tags: [{ type: String }],
    mainImage: { type: String },
    categories: [{ type: Number }],
    createdAtTN: { type: Date },
    updatedAtTN: { type: Date },
    syncedAt: { type: Date, default: Date.now },
    syncError: { type: String },
  },
  { 
    versionKey: false,
    timestamps: false // Usamos nuestras propias fechas
  }
);

// Índices
ProductSchema.index({ storeId: 1, productId: 1 }, { unique: true });
ProductSchema.index({ storeId: 1, published: 1 });
ProductSchema.index({ storeId: 1, tags: 1 });
ProductSchema.index({ storeId: 1, categories: 1 });

// Transform para JSON
ProductSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

// Métodos custom del documento (opcional)
// ProductSchema.methods.getFullUrl = function() {
//   return `https://store.com/products/${this.handle}`;
// };

/**
 * Modelo tipado
 */
export const ProductModel = model<IProductDocument>("Product", ProductSchema);