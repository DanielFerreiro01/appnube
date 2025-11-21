import { Router } from "express";
import { AuthRoutes } from "./auth.routes";
import { StoreRoutes } from "./store.routes";
import { ProductRoutes } from "./product.routes";
import { TiendanubeOAuthRoutes } from "./tiendanube-oauth.routes";
import { WebhookRoutes } from "./webhook.routes";
import { TiendanubeWebhookRoutes } from "./tiendanube-webhook.routes";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    // Rutas de la app
    router.use("/api/auth", AuthRoutes.routes);
    router.use("/api/stores", StoreRoutes.routes);
    router.use("/api/products", ProductRoutes.routes);
    
    // Rutas OAuth de Tiendanube
    router.use("/api/auth/tiendanube", TiendanubeOAuthRoutes.routes);

    // Webhooks obligatorios
    router.use("/api/webhooks/tiendanube/mandatory", TiendanubeWebhookRoutes.routes);

    // Webhooks GDPR
    router.use("/api/webhooks/tiendanube/gdpr", WebhookRoutes.routes);

    return router;
  }
}