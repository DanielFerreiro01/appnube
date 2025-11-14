import { Schema, model } from "mongoose";

const ImageSchema = new Schema(
  {
    storeId: { type: Number, required: true },
    productId: { type: Number, required: true },
    imageId: { type: Number, required: true },

    src: { type: String, required: true },
    alt: { type: String },
    position: { type: Number },
  },
  { versionKey: false }
);

export const ImageModel = model("Image", ImageSchema);
