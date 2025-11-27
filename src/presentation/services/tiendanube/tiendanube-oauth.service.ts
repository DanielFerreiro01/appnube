import { CustomError } from "../../../domain";
import { StoreModel } from "../../../data/mongo";
import { TiendanubeWebhookService } from "./tiendanube-webhooks.service";

/**
 * Interfaz para la respuesta del token de Tiendanube
 */
interface TiendanubeTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  user_id: number; // Este es el store_id en Tiendanube
}

/**
 * Servicio para manejar OAuth 2.0 con Tiendanube
 */
export class TiendanubeOAuthService {
  private readonly TIENDANUBE_TOKEN_URL = "https://www.tiendanube.com/apps/authorize/token";
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      throw new Error("Tiendanube OAuth credentials are required");
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Intercambia el authorization code por un access token
   */
  async exchangeCodeForToken(code: string): Promise<TiendanubeTokenResponse> {
    try {
      const response = await fetch(this.TIENDANUBE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "authorization_code",
          code: code,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw CustomError.badRequest(
          `Tiendanube OAuth error: ${response.status} - ${errorText}`
        );
      }

      const tokenData: TiendanubeTokenResponse = await response.json();

      if (!tokenData.access_token || !tokenData.user_id) {
        throw CustomError.internalServerError(
          "Invalid token response from Tiendanube"
        );
      }

      return tokenData;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error exchanging code for token: ${error}`
      );
    }
  }

  /**
   * Obtiene información básica de la tienda usando el access token
   */
  async getStoreInfo(storeId: number, accessToken: string) {
    try {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/store`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (contact@yourapp.com)",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw CustomError.badRequest(
          `Error fetching store info: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error getting store info: ${error}`
      );
    }
  }

  /**
   * Procesa el callback de OAuth y crea/actualiza la tienda en la DB
   */
  async handleCallback(code: string, state?: string) {
    try {
      // 1. Intercambiar code por token
      console.log("🔐 Exchanging code for token...");
      const tokenData = await this.exchangeCodeForToken(code);
      console.log(`✅ Token received for store ${tokenData.user_id}`);

      // 2. Obtener información de la tienda
      console.log("📋 Fetching store info...");
      const storeInfo = await this.getStoreInfo(
        tokenData.user_id,
        tokenData.access_token
      );

      // 3. Buscar si la tienda ya existe
      let store = await StoreModel.findOne({ storeId: tokenData.user_id });
      const isNewStore = !store;

      if (store) {
        // Actualizar tienda existente
        console.log(`🔄 Updating existing store ${store.id}`);
        store.accessToken = tokenData.access_token;
        store.name = storeInfo.name?.es || storeInfo.name || store.name;
        
        if (storeInfo.url) {
          store.tiendanubeUrl = storeInfo.url;
        }

        await store.save();
      } else {
        // Crear nueva tienda
        console.log(`🆕 Creating new store for Tiendanube ID ${tokenData.user_id}`);
        
        store = new StoreModel({
          name: storeInfo.name?.es ?? storeInfo.name ?? `Store ${tokenData.user_id}`,
          tiendanubeUrl: storeInfo.url ?? `https://store-${tokenData.user_id}.mitiendanube.com`,
          description: storeInfo.description?.es ?? "",
          logo: storeInfo.logo ?? "",
          storeId: tokenData.user_id,
          accessToken: tokenData.access_token,
          categories: [],
        });

        await store.save();
      }

      // 4. Registrar webhooks (crítico para mantener sincronización)
      console.log("🔔 Registering webhooks...");
      await TiendanubeWebhookService.registerAll(
        tokenData.user_id,
        tokenData.access_token
      );

      // 🆕 5. SINCRONIZACIÓN INICIAL (en background)
      console.log("🔄 Starting initial sync...");
      this.startInitialSync(store.id).catch(error => {
        console.error("❌ Initial sync failed:", error);
        // No lanzar error para no interrumpir el flujo OAuth
      });

      return {
        store: {
          id: store.id,
          name: store.name,
          storeId: store.storeId,
          tiendanubeUrl: store.tiendanubeUrl,
        },
        scopes: tokenData.scope,
        isNewStore,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(
        `Error handling OAuth callback: ${error}`
      );
    }
  }

  /**
   * 🆕 Inicia la sincronización inicial en background
   * Esto NO bloquea el flujo OAuth
   */
  private async startInitialSync(mongoStoreId: string): Promise<void> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { TiendanubeService } = await import("./tiendanube.service");
      
      const tiendanubeService = new TiendanubeService();
      
      console.log(`[INITIAL-SYNC] Starting sync for store ${mongoStoreId}`);
      
      const result = await tiendanubeService.syncAll(mongoStoreId);
      
      console.log(
        `[INITIAL-SYNC] ✅ Completed: ${result.summary.totalProducts} products, ` +
        `${result.summary.totalCategories} categories`
      );
    } catch (error) {
      console.error(`[INITIAL-SYNC] ❌ Error:`, error);
      // No lanzar el error - la sincronización es en background
    }
  }

  /**
   * Verifica si un access token es válido
   */
  async verifyAccessToken(storeId: number, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/store`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (contact@yourapp.com)",
          },
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Genera la URL de autorización para que el usuario instale la app
   */
  getAuthorizationUrl(state?: string): string {
    const baseUrl = `https://www.tiendanube.com/apps/${this.clientId}/authorize`;
    
    if (state) {
      return `${baseUrl}?state=${encodeURIComponent(state)}`;
    }
    
    return baseUrl;
  }
}