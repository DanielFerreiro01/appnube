import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { TiendanubeOAuthService } from "../services/tiendanube/tiendanube-oauth.service";

export class TiendanubeOAuthController {
  constructor(private readonly oauthService: TiendanubeOAuthService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.log(`${error}`);
    return res.status(500).json({ error: "Internal server error" });
  };

  /**
   * Endpoint que recibe el callback de Tiendanube después de que el usuario
   * autoriza la app
   * 
   * GET /api/auth/tiendanube/callback?code=ABC123&state=csrf-token
   */
  handleCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    // Validar que tengamos el code
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        error: "Missing or invalid authorization code",
        message: "The 'code' parameter is required",
      });
    }

    // IMPORTANTE: En producción, deberías validar el 'state' para prevenir CSRF
    // Ejemplo: if (state !== req.session.oauthState) { ... }

    try {
      console.log("Processing OAuth callback...");
      
      // Procesar el callback (intercambiar code por token y crear/actualizar store)
      const result = await this.oauthService.handleCallback(
        code,
        state as string
      );

      console.log(`Store ${result.store.id} processed successfully`);

      // Redirigir al usuario a tu panel de administración
      // con un mensaje de éxito
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?store=${result.store.id}&success=true&new=${result.isNewStore}`;
      
      return res.redirect(redirectUrl);

      // Si prefieres responder con JSON (útil para testing):
      // return res.json({
      //   message: "Store connected successfully",
      //   store: result.store,
      //   isNewStore: result.isNewStore,
      //   scopes: result.scopes,
      // });

    } catch (error) {
      console.error("OAuth callback error:", error);
      
      // Redirigir al usuario a una página de error
      const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/error?message=oauth_failed`;
      return res.redirect(errorUrl);

      // O responder con JSON:
      // this.handleError(error, res);
    }
  };

  /**
   * Endpoint para iniciar el flujo OAuth
   * Redirige al usuario a Tiendanube para autorizar la app
   * 
   * GET /api/auth/tiendanube/install
   */
  install = async (req: Request, res: Response) => {
    try {
      // Generar un CSRF token aleatorio
      const state = Math.random().toString(36).substring(7);
      
      // IMPORTANTE: En producción, guarda el state en la sesión
      // req.session.oauthState = state;

      // Generar URL de autorización
      const authUrl = this.oauthService.getAuthorizationUrl(state);

      // Redirigir al usuario a Tiendanube
      return res.redirect(authUrl);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Endpoint para verificar el estado de la conexión de una tienda
   * 
   * GET /api/auth/tiendanube/status/:storeId
   */
  checkStatus = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    try {
      // Aquí podrías verificar si el token sigue siendo válido
      // y retornar información sobre la tienda
      
      return res.json({
        message: "Status check endpoint",
        storeId,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Endpoint para desconectar una tienda (webhook de Tiendanube)
   * Se llama cuando el usuario desinstala tu app desde Tiendanube
   * 
   * POST /api/webhooks/tiendanube/uninstall
   */
  handleUninstall = async (req: Request, res: Response) => {
    try {
      const { store_id } = req.body;

      if (!store_id) {
        return res.status(400).json({ error: "Missing store_id" });
      }

      console.log(`Store ${store_id} uninstalled the app`);

      // Invalidar el token en tu DB (opcional: marcar como inactivo en vez de borrar)
      // const store = await StoreModel.findOne({ storeId: store_id });
      // if (store) {
      //   store.accessToken = null;
      //   store.isActive = false;
      //   await store.save();
      // }

      return res.status(200).json({ message: "Uninstall processed" });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}