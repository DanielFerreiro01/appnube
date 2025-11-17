import { Router } from "express";
import { AuthRoutes } from "./auth.routes";
import { StoreRoutes } from "./store.routes";
import { ProductRoutes } from "./product.routes";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    // Definir las rutas
    router.use("/api/auth", AuthRoutes.routes);
    router.use("/api/stores", StoreRoutes.routes);
    router.use("/api/products", ProductRoutes.routes);

    return router;
  }
}