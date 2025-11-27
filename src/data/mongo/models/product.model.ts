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
    
    // 🆕 NUEVO: Relación con categorías
    categories: [{ type: Number }], // IDs de categorías de Tiendanube
    
    createdAtTN: { type: Date },  // fechas originales de Tiendanube
    updatedAtTN: { type: Date },

    /** Opcional pero MUY útil: */
    syncedAt: { type: Date, default: Date.now }, // última sincronización
    syncError: { type: String }, // Para debugging
  },
  { versionKey: false }
);

// Índices para búsquedas rápidas
ProductSchema.index({ storeId: 1, productId: 1 }, { unique: true });
ProductSchema.index({ storeId: 1, published: 1 });
ProductSchema.index({ storeId: 1, tags: 1 });
// 🆕 NUEVO: Índice para buscar productos por categoría
ProductSchema.index({ storeId: 1, categories: 1 });

ProductSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: Record<string, any>) {
    delete ret._id;
  },
});

export const ProductModel = model("Product", ProductSchema);