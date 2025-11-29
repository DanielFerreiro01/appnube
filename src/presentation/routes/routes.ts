import { Router } from "express";
import { AuthRoutes } from "./auth.routes";
import { StoreRoutes } from "./store.routes";
import { ProductRoutes } from "./product.routes";
import { TiendanubeOAuthRoutes } from "./tiendanube-oauth.routes";
import { MandatoryWebhookRoutes } from "./mandatory-webhook.routes";
import { GDPRWebhookRoutes } from "./gdpr-webhook.routes";
import { CategoryRoutes } from "./category.routes";
import { authLimiter, apiLimiter } from "../middlewares/rate-limit.middleware";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    // Webhooks SIN rate limiting
    router.use("/api/webhooks/tiendanube/mandatory", MandatoryWebhookRoutes.routes);
    router.use("/api/webhooks/tiendanube/gdpr", GDPRWebhookRoutes.routes);

    // Auth con rate-limit
    router.use("/api/auth", authLimiter, AuthRoutes.routes);

    // Resto de la API con rate-limit
    router.use("/api/stores", apiLimiter, StoreRoutes.routes);
    router.use("/api/products", apiLimiter, ProductRoutes.routes);
    router.use("/api/categories", apiLimiter, CategoryRoutes.routes);

    // OAuth
    router.use("/api/auth/tiendanube", TiendanubeOAuthRoutes.routes);

    return router;
  }
}