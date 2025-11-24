import { Schema, model } from "mongoose";

const CategorySchema = new Schema(
  {
    storeId: { type: Number, required: true }, // ID de Tiendanube
    categoryId: { type: Number, required: true }, // ID real de la categoría en TN
    
    name: { type: String, required: true },
    description: { type: String },
    handle: { type: String }, // URL slug
    parent: { type: Number }, // ID de categoría padre (null si es raíz)
    
    // SEO
    seoTitle: { type: String },
    seoDescription: { type: String },
    
    // Metadatos de Tiendanube
    subcategories: [{ type: Number }], // IDs de subcategorías
    googleShoppingCategory: { type: String },
    
    // Fechas de Tiendanube
    createdAtTN: { type: Date },
    updatedAtTN: { type: Date },
    
    // Control de sincronización
    syncedAt: { type: Date, default: Date.now },
    syncError: { type: String }, // Para debugging
  },
  { versionKey: false }
);

// Índices para búsquedas rápidas
CategorySchema.index({ storeId: 1, categoryId: 1 }, { unique: true });
CategorySchema.index({ storeId: 1, handle: 1 });
CategorySchema.index({ storeId: 1, parent: 1 }); // Para obtener subcategorías

CategorySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: Record<string, any>) {
    delete ret._id;
  },
});

export const CategoryModel = model("Category", CategorySchema);

// Agregar al src/data/mongo/index.ts:
// export * from './models/category.model';