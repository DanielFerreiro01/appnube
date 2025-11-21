import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";

export class WebhookRoutes {
  static get routes(): Router {
    const router = Router();

    router.post("/store/redact", WebhookController.storeRedact);
    router.post("/customers/redact", WebhookController.customerRedact);
    router.post("/customers/data_request", WebhookController.customerDataRequest);

    return router;
  }
}
