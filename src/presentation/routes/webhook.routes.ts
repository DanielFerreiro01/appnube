import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";
import { validateTiendanubeHmac } from "../middlewares/tiendanube-hmac.middleware";

export class WebhookRoutes {
  static get routes(): Router {
    const router = Router();

    router.post("/store/redact", validateTiendanubeHmac, WebhookController.storeRedact);
    router.post("/customers/redact", validateTiendanubeHmac, WebhookController.customerRedact);
    router.post("/customers/data_request", validateTiendanubeHmac, WebhookController.customerDataRequest);

    return router;
  }
}
