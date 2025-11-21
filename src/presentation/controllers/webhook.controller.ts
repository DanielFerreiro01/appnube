import { Request, Response } from "express";
import crypto from "crypto";
import { StoreModel } from "../../data/mongo/models/store.model";
import { ProductModel } from "../../data/mongo/models/product.model";
import { VariantModel } from "../../data/mongo/models/variant.model";
import { ImageModel } from "../../data/mongo/models/image.model";
import { envs } from "../../config";

// ✔ Valida que el webhook venga de Tiendanube
function validateHmac(req: Request): boolean {
  const secret = envs.TIENDANUBE_CLIENT_SECRET!;
  const receivedHmac = req.headers["x-hmac-sha256"] as string;

  if (!receivedHmac) return false;

  const bodyRaw = JSON.stringify(req.body);
  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(bodyRaw)
    .digest("base64");

  return generatedHmac === receivedHmac;
}

export class WebhookController {
  
  // 🧹 1) STORE REDACT → borrar la tienda + sus datos
  static async storeRedact(req: Request, res: Response) {
    if (!validateHmac(req)) return res.status(401).json({ error: "Invalid HMAC" });

    const { store_id } = req.body;

    // borrar tienda
    await StoreModel.deleteOne({ storeId: store_id });

    // borrar productos, variantes e imágenes asociadas
    await ProductModel.deleteMany({ storeId: store_id });
    await VariantModel.deleteMany({ storeId: store_id });
    await ImageModel.deleteMany({ storeId: store_id });

    return res.status(200).json({ message: "Store data deleted" });
  }

  // 🧹 2) CUSTOMER REDACT → borrar datos del cliente
  static async customerRedact(req: Request, res: Response) {
    if (!validateHmac(req)) return res.status(401).json({ error: "Invalid HMAC" });

    const { store_id, customer } = req.body;

    // Si tu app guarda clientes, los borrarías aquí.
    // Por ahora no almacenás clientes, así que solo respondemos OK.

    return res.status(200).json({ message: "Customer data redacted" });
  }

  // 🔍 3) CUSTOMER DATA REQUEST → devolver datos del cliente
  static async customerDataRequest(req: Request, res: Response) {
    if (!validateHmac(req)) return res.status(401).json({ error: "Invalid HMAC" });

    // Como todavía no guardás datos de clientes, devolvés un JSON vacío.
    // Si luego almacenás info, acá devolverías todo lo que tu app tenga guardado.

    return res.status(200).json({
      message: "Customer data request received",
      data: {}
    });
  }
}
