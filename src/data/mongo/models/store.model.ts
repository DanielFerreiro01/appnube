import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    tiendanubeUrl: {
      type: String,
      required: [true, "Tiendanube URL is required"],
      unique: true,
    },
    description: {
      type: String,
    },
    logo: {
      type: String,
    },
    categories: {
      type: [String],
      default: [],
    },
    // Campos para la integración con Tiendanube
    storeId: {
      type: Number,
      sparse: true, // Permite null pero único si existe
      unique: true,
    },
    accessToken: {
      type: String,
    },
    // Campos de auditoría
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Actualizar updatedAt antes de guardar
storeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

storeSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    // No exponer el accessToken en las respuestas JSON
    delete ret.accessToken;
  },
});

export const StoreModel = mongoose.model("Store", storeSchema);