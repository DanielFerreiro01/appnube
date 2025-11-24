import { Router } from "express";
import { MandatoryWebhookController } from "../controllers/mandatory-webhook.controller";
import { validateTiendanubeHmac } from "../middlewares/tiendanube-hmac.middleware";

/**
 * Rutas para webhooks OBLIGATORIOS de funcionalidad
 * Estos webhooks mantienen tu app sincronizada en tiempo real
 */
export class MandatoryWebhookRoutes {
  static get routes(): Router {
    const router = Router();

    // ============================================
    // INSTALACIÓN / DESINSTALACIÓN
    // ============================================

    /**
     * App Uninstalled - CRÍTICO
     * Se llama cuando desinstalan tu app
     */
    router.post(
      "/app/uninstalled",
      validateTiendanubeHmac,
      MandatoryWebhookController.onAppUninstalled
    );

    // ============================================
    // PRODUCTOS
    // ============================================

    router.post(
      "/product/create",
      validateTiendanubeHmac,
      MandatoryWebhookController.onProductCreate
    );

    router.post(
      "/product/update",
      validateTiendanubeHmac,
      MandatoryWebhookController.onProductUpdate
    );

    router.post(
      "/product/delete",
      validateTiendanubeHmac,
      MandatoryWebhookController.onProductDelete
    );

    // ============================================
    // CATEGORÍAS
    // ============================================

    router.post(
      "/category/created",
      validateTiendanubeHmac,
      MandatoryWebhookController.onCategoryCreated
    );

    router.post(
      "/category/updated",
      validateTiendanubeHmac,
      MandatoryWebhookController.onCategoryUpdated
    );

    router.post(
      "/category/deleted",
      validateTiendanubeHmac,
      MandatoryWebhookController.onCategoryDeleted
    );

    return router;
  }
}