import { Router } from "express";
import { TiendanubeWebhookController } from "../controllers/tiendanube-webhook.controller";
import { validateTiendanubeHmac } from "../middlewares/tiendanube-hmac.middleware";

export class TiendanubeWebhookRoutes {

  static get routes(): Router {
    const router = Router();

    // Webhooks obligatorios
    router.post(
      "/store/created",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onStoreCreated
    );

    router.post(
      "/store/updated",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onStoreUpdated
    );

    router.post(
      "/app/uninstalled",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onAppUninstalled
    );

    // router.post(
    //   "/products/create",
    //   validateTiendanubeHmac,
    //   TiendanubeWebhookController.onProductCreate
    // );

    router.post(
      "/products/update",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onProductUpdate
    );

    // router.post(
    //   "/products/delete",
    //   validateTiendanubeHmac,
    //   TiendanubeWebhookController.onProductDelete
    // );

    // // Variantes
    // router.post(
    //   "/variants/create",
    //   validateTiendanubeHmac,
    //   TiendanubeWebhookController.onVariantCreate
    // );

    // router.post(
    //   "/variants/update",
    //   validateTiendanubeHmac,
    //   TiendanubeWebhookController.onVariantUpdate
    // );

    // router.post(
    //   "/variants/delete",
    //   validateTiendanubeHmac,
    //   TiendanubeWebhookController.onVariantDelete
    // );


    return router;
  }

}
