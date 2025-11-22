import { Router } from "express";
import { TiendanubeWebhookController } from "../controllers/tiendanube-webhook.controller";
import { validateTiendanubeHmac } from "../middlewares/tiendanube-hmac.middleware";

/**
 * Rutas para webhooks de instalación y productos
 * IMPORTANTE: Estas rutas usan express.raw() configurado en server.ts
 */
export class TiendanubeWebhookRoutes {
  static get routes(): Router {
    const router = Router();

    // ============================================
    // WEBHOOKS OBLIGATORIOS DE INSTALACIÓN
    // ============================================

    /**
     * App Installed - Se llama cuando instalan tu app
     * POST /api/webhooks/tiendanube/mandatory/app/installed
     * NOTA: Se configura en Partners Panel, no por API
     */
    router.post(
      "/app/installed",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onAppInstalled
    );

    /**
     * App Uninstalled - Se llama cuando desinstalan tu app
     * POST /api/webhooks/tiendanube/mandatory/app/uninstalled
     */
    router.post(
      "/app/uninstalled",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onAppUninstalled
    );

    // ============================================
    // WEBHOOKS DE PRODUCTOS (OPCIONAL PERO ÚTIL)
    // ============================================

    /**
     * Product Create
     * POST /api/webhooks/tiendanube/mandatory/product/create
     */
    router.post(
      "/product/create",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onProductCreate
    );

    /**
     * Product Update
     * POST /api/webhooks/tiendanube/mandatory/product/update
     */
    router.post(
      "/product/update",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onProductUpdate
    );

    /**
     * Product Delete
     * POST /api/webhooks/tiendanube/mandatory/product/delete
     */
    router.post(
      "/product/delete",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onProductDelete
    );

    // ============================================
    // WEBHOOKS DE VARIANTES
    // ============================================
    // NOTA: Tiendanube NO tiene webhooks específicos para variantes
    // Los cambios en variantes disparan product/updated
    // Dejamos estas rutas comentadas por si Tiendanube las agrega en el futuro
    
    /*
    router.post(
      "/variant/create",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onVariantCreate
    );

    router.post(
      "/variant/update",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onVariantUpdate
    );

    router.post(
      "/variant/delete",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onVariantDelete
    );
    */

    // ============================================
    // WEBHOOKS DE CATEGORÍAS (OPCIONAL)
    // ============================================

    router.post(
      "/category/created",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onCategoryCreated
    );

    router.post(
      "/category/updated",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onCategoryUpdated
    );

    router.post(
      "/category/deleted",
      validateTiendanubeHmac,
      TiendanubeWebhookController.onCategoryDeleted
    );

    return router;
  }
}


/**
 * ============================================
 * GDPR WEBHOOKS (SEPARADOS)
 * ============================================
 */
// import { WebhookController } from "../controllers/webhook.controller";

// export class WebhookRoutes {
//   static get routes(): Router {
//     const router = Router();

//     /**
//      * App Suspended (GDPR) - Borrar TODOS los datos de una tienda
//      * POST /api/webhooks/tiendanube/gdpr/app/suspended
//      * NOTA: Se configura en Partners Panel, no por API
//      */
//     router.post(
//       "/app/suspended",
//       validateTiendanubeHmac,
//       WebhookController.appSuspended
//     );

//     /**
//      * Customer Redact (GDPR) - Borrar datos de un cliente específico
//      * POST /api/webhooks/tiendanube/gdpr/customer/redact
//      * NOTA: Se configura en Partners Panel, no por API
//      */
//     router.post(
//       "/customer/redact",
//       validateTiendanubeHmac,
//       WebhookController.customerRedact
//     );

//     /**
//      * Customer Data Request (GDPR) - Devolver datos de un cliente
//      * POST /api/webhooks/tiendanube/gdpr/customer/data_request
//      * NOTA: Se configura en Partners Panel, no por API
//      */
//     router.post(
//       "/customer/data_request",
//       validateTiendanubeHmac,
//       WebhookController.customerDataRequest
//     );

//     return router;
//   }
// }