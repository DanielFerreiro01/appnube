import { Router } from "express";
import { TiendanubeOAuthController } from "../controllers/tiendanube-oauth.controller";
import { TiendanubeOAuthService } from "../services/tiendanube/tiendanube-oauth.service";

export class TiendanubeOAuthRoutes {
  static get routes(): Router {
    const router = Router();

    // Obtener credenciales de variables de entorno
    const clientId = process.env.TIENDANUBE_CLIENT_ID || "";
    const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      console.warn(
        "⚠️  WARNING: Tiendanube OAuth credentials not configured. OAuth flow will not work."
      );
      console.warn(
        "   Add TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET to your .env file"
      );
    }

    // Inicializar servicio y controlador
    const oauthService = new TiendanubeOAuthService(clientId, clientSecret);
    const controller = new TiendanubeOAuthController(oauthService);

    // ============================================
    // Rutas OAuth
    // ============================================

    /**
     * Iniciar instalación de la app
     * El usuario es redirigido a Tiendanube para autorizar
     */
    router.get("/install", controller.install);

    /**
     * Callback de OAuth
     * Tiendanube redirige aquí después de que el usuario autoriza
     * Esta URL debe estar configurada en tu app de Tiendanube Partners
     */
    router.get("/callback", controller.handleCallback);

    /**
     * Verificar estado de conexión
     * Opcional: para debugging o UI
     */
    router.get("/status/:storeId", controller.checkStatus);

    return router;
  }
}