import { Router } from "express";
import { AuthRoutes } from "./auth.routes";
import { StoreRoutes } from "./store.routes";
import { ProductRoutes } from "./product.routes";
import { TiendanubeOAuthRoutes } from "./tiendanube-oauth.routes";
import { MandatoryWebhookRoutes } from "./mandatory-webhook.routes";
import { GDPRWebhookRoutes } from "./gdpr-webhook.routes";
import { CategoryRoutes } from "./category.routes";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    // Rutas de la app
    router.use("/api/auth", AuthRoutes.routes);
    router.use("/api/stores", StoreRoutes.routes);
    router.use("/api/products", ProductRoutes.routes);
    router.use("/api/categories", CategoryRoutes.routes);
    
    // OAuth de Tiendanube
    router.use("/api/auth/tiendanube", TiendanubeOAuthRoutes.routes);

    // Webhooks obligatorios (funcionalidad)
    router.use("/api/webhooks/tiendanube/mandatory", MandatoryWebhookRoutes.routes);

    // Webhooks GDPR (legal)
    router.use("/api/webhooks/tiendanube/gdpr", GDPRWebhookRoutes.routes);

    return router;
  }
}