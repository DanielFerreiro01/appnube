import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface IStore {
  name: string;
  tiendanubeUrl: string;
  description?: string;
  logo?: string;
  categories?: string[];
  storeId?: number;
  accessToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interfaz del documento de Mongoose
 */
export interface IStoreDocument extends IStore, Document {
  // Virtual computed property
  isConnected?: boolean;
}

/**
 * Schema de Mongoose
 */
const StoreSchema = new Schema<IStoreDocument>(
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
    storeId: {
      type: Number,
      sparse: true,
      unique: true,
    },
    accessToken: {
      type: String,
    },
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

// Pre-save middleware
StoreSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual para isConnected
StoreSchema.virtual("isConnected").get(function () {
  return !!(this.storeId && this.accessToken);
});

// Transform para JSON
StoreSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.accessToken; // No exponer el token
  },
});

/**
 * Modelo tipado
 */
export const StoreModel = model<IStoreDocument>("Store", StoreSchema);