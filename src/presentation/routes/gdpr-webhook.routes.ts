import { Router } from "express";
import { GDPRWebhookController } from "../controllers/gdpr-webhook.controller";
import { validateTiendanubeHmac } from "../middlewares/tiendanube-hmac.middleware";

/**
 * Rutas para webhooks GDPR (OBLIGATORIOS por ley)
 * 
 * IMPORTANTE: Estos webhooks se configuran en el Partners Panel de Tiendanube
 * NO se pueden registrar vía API
 */
export class GDPRWebhookRoutes {
  static get routes(): Router {
    const router = Router();

    /**
     * Store Redact - Borrar datos personales de clientes de una tienda
     * POST /api/webhooks/tiendanube/gdpr/store/redact
     */
    router.post(
      "/store/redact",
      validateTiendanubeHmac,
      GDPRWebhookController.storeRedact
    );

    /**
     * Customer Redact - Borrar datos de un cliente específico
     * POST /api/webhooks/tiendanube/gdpr/customers/redact
     */
    router.post(
      "/customers/redact",
      validateTiendanubeHmac,
      GDPRWebhookController.customerRedact
    );

    /**
     * Customer Data Request - Devolver datos de un cliente
     * POST /api/webhooks/tiendanube/gdpr/customers/data_request
     */
    router.post(
      "/customers/data_request",
      validateTiendanubeHmac,
      GDPRWebhookController.customerDataRequest
    );

    /**
     * App Suspended - Borrar TODA la información de la tienda
     * POST /api/webhooks/tiendanube/gdpr/app/suspended
     */
    router.post(
      "/app/suspended",
      validateTiendanubeHmac,
      GDPRWebhookController.appSuspended
    );

    return router;
  }
}