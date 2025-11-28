import { Schema, model, Document } from "mongoose";

/**
 * Interfaz base del documento
 */
export interface IUser {
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  role: string[];
  img?: string;
  favorites?: string[];
}

/**
 * Interfaz del documento de Mongoose
 */
export interface IUserDocument extends IUser, Document {
  // Métodos custom
  // comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * Schema de Mongoose
 */
const UserSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  img: {
    type: String,
  },
  role: {
    type: [String],
    enum: ["ADMIN_ROLE", "USER_ROLE"],
    default: ["USER_ROLE"],
  },
  favorites: {
    type: [String],
    default: [],
  },
});

// Transform para JSON
UserSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
    delete (ret as any).password; // NUNCA exponer password
  },
});

/**
 * Modelo tipado
 */
export const UserModel = model<IUserDocument>("User", UserSchema);