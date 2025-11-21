import { Request, Response } from "express";
import { StoreModel } from "../../data/mongo/models/store.model";
import { ProductModel } from "../../data/mongo/models/product.model";
import { VariantModel } from "../../data/mongo/models/variant.model";
import { ImageModel } from "../../data/mongo/models/image.model";

export class TiendanubeWebhookController {
  
  // 1) store/created
  static async onStoreCreated(req: Request, res: Response) {
    console.log("Webhook: store/created", req.body);
    return res.status(200).json({ received: true });
  }

  // 2) store/updated
  static async onStoreUpdated(req: Request, res: Response) {
    console.log("Webhook: store/updated", req.body);
    return res.status(200).json({ received: true });
  }

  // 3) app/uninstalled → borrar TODO de esa tienda
  static async onAppUninstalled(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("Webhook: app/uninstalled", store_id);

      if (!store_id) {
        return res.status(400).json({ message: "Missing store_id" });
      }

      await Promise.all([
        StoreModel.deleteOne({ storeId: store_id }),
        ProductModel.deleteMany({ storeId: store_id }),
        VariantModel.deleteMany({ storeId: store_id }),
        ImageModel.deleteMany({ storeId: store_id }),
      ]);

      console.log(`🔴 Tienda ${store_id} eliminada por desinstalación`);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error deleting store data:", err);
      return res.status(500).json({ message: "Error deleting store data" });
    }
  }

  static async onProductUpdate(req: Request, res: Response) {
  console.log("🔄 PRODUCT UPDATE:", req.body);
  return res.status(200).json({ ok: true });
}
}
