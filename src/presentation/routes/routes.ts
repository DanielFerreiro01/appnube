import { Router } from "express";
import { AuthRoutes } from "./auth.routes";
import { StoreRoutes } from "./store.routes";
import { ProductRoutes } from "./product.routes";
import { TiendanubeOAuthRoutes } from "./tiendanube-oauth.routes";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    // Definir las rutas
    router.use("/api/auth", AuthRoutes.routes);
    router.use("/api/stores", StoreRoutes.routes);
    router.use("/api/products", ProductRoutes.routes);
    
    // Rutas OAuth de Tiendanube
    router.use("/api/auth/tiendanube", TiendanubeOAuthRoutes.routes);

    return router;
  }
}