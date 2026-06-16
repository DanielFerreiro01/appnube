import { envs } from "../../../config";
import { CustomError } from "../../../domain";

/**
 * Servicio para registrar webhooks en Tiendanube
 * Documentación: https://tiendanube.github.io/api-documentation/resources/webhook
 */
export class TiendanubeWebhookService {
  private readonly baseApiUrl = "https://api.tiendanube.com/v1";

  /**
   * Registra todos los webhooks necesarios para la app
   * Se llama automáticamente después del OAuth
   */
  static async registerAll(storeId: number, accessToken: string) {
    try {
      const service = new TiendanubeWebhookService();
      
      console.log(`Registering webhooks for store ${storeId}...`);

      // Primero, obtener webhooks existentes para evitar duplicados
      const existingWebhooks = await service.listWebhooks(storeId, accessToken);
      const existingTopics = new Set(existingWebhooks.map((wh: any) => wh.event));

      const baseUrl = envs.WEBSERVICE_URL;
      
      // Webhooks obligatorios
      const mandatoryWebhooks = [
        // Instalación/Desinstalación (NOTA: estos no se pueden registrar vía API)
        // Se configuran en Tiendanube Partners panel
        // { event: "app/installed", url: `...` },
        { event: "app/uninstalled", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/app/uninstalled` },
        
        // GDPR (obligatorios - se configuran en Partners)
        // Estos 3 NO se pueden registrar vía API, deben configurarse en el panel de Partners
        // { event: "app/suspended", url: `${baseUrl}/api/webhooks/tiendanube/gdpr/store/redact` },
        // { event: "customer/redact", url: `${baseUrl}/api/webhooks/tiendanube/gdpr/customers/redact` },
        // { event: "customer/data_request", url: `${baseUrl}/api/webhooks/tiendanube/gdpr/customers/data_request` },
      ];

      // Webhooks opcionales (útiles para tu app)
      const optionalWebhooks = [
        // Productos
        { event: "product/created", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/product/create` },
        { event: "product/updated", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/product/update` },
        { event: "product/deleted", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/product/delete` },
        
        // Categorías
        { event: "category/created", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/category/created` },
        { event: "category/updated", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/category/updated` },
        { event: "category/deleted", url: `${baseUrl}/api/webhooks/tiendanube/mandatory/category/deleted` },
        
      ];

      const allWebhooks = [...mandatoryWebhooks, ...optionalWebhooks];
      const results = {
        registered: 0,
        skipped: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const webhook of allWebhooks) {
        try {
          // Skip si ya existe
          if (existingTopics.has(webhook.event)) {
            console.log(`Webhook ${webhook.event} already exists, skipping`);
            results.skipped++;
            continue;
          }

          await service.createWebhook(storeId, accessToken, webhook.event, webhook.url);
          console.log(`Webhook registered: ${webhook.event}`);
          results.registered++;
          
          // Rate limiting: esperar un poco entre requests
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error registering webhook ${webhook.event}:`, errorMsg);
          
          // Si es error 403 (scope faltante), dar más info
          if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            console.warn(`Webhook ${webhook.event} requires additional permissions (scopes)`);
            console.warn(`Configure scopes in Tiendanube Partners Panel for your app`);
          }
          
          results.failed++;
          results.errors.push(`${webhook.event}: ${errorMsg}`);
        }
      }

      console.log(`\n Webhook Registration Summary:`);
      console.log(`    Registered: ${results.registered}`);
      console.log(`    Skipped: ${results.skipped}`);
      console.log(`    Failed: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log(`\n Errors:`);
        results.errors.forEach(err => console.log(`   - ${err}`));
      }

      return results;
      
    } catch (error) {
      console.error("Fatal error registering webhooks:", error);
      throw error;
    }
  }

  /**
   * Lista todos los webhooks existentes
   */
  private async listWebhooks(storeId: number, accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/${storeId}/webhooks`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list webhooks: ${response.status} - ${errorText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error("Error listing webhooks:", error);
      return []; // Return empty array on error to continue registration
    }
  }

  /**
   * Crea un webhook individual
   */
  private async createWebhook(
    storeId: number,
    accessToken: string,
    event: string,
    url: string
  ): Promise<any> {
    const response = await fetch(
      `${this.baseApiUrl}/${storeId}/webhooks`,
      {
        method: "POST",
        headers: {
          Authentication: `bearer ${accessToken}`,
          "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event, url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      
      // Si el webhook ya existe (409), no es error crítico
      if (response.status === 409) {
        console.log(`Webhook ${event} already exists`);
        return { event, status: "already_exists" };
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Elimina todos los webhooks de una tienda
   * Útil para testing o cleanup
   */
  static async deleteAll(storeId: number, accessToken: string) {
    try {
      const service = new TiendanubeWebhookService();
      const webhooks = await service.listWebhooks(storeId, accessToken);

      console.log(`Deleting ${webhooks.length} webhooks...`);

      for (const webhook of webhooks) {
        try {
          await service.deleteWebhook(storeId, accessToken, webhook.id);
          console.log(`Deleted webhook: ${webhook.event} (${webhook.id})`);
        } catch (error) {
          console.error(`Error deleting webhook ${webhook.id}:`, error);
        }
      }

      return { deleted: webhooks.length };
      
    } catch (error) {
      console.error("Error deleting webhooks:", error);
      throw error;
    }
  }

  /**
   * Elimina un webhook específico
   */
  private async deleteWebhook(
    storeId: number,
    accessToken: string,
    webhookId: number
  ): Promise<void> {
    const response = await fetch(
      `${this.baseApiUrl}/${storeId}/webhooks/${webhookId}`,
      {
        method: "DELETE",
        headers: {
          Authentication: `bearer ${accessToken}`,
          "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  /**
   * Verifica el estado de los webhooks
   */
  static async checkStatus(storeId: number, accessToken: string) {
    try {
      const service = new TiendanubeWebhookService();
      const webhooks = await service.listWebhooks(storeId, accessToken);

      const requiredEvents = [
        "store/created",
        "store/updated", 
        "app/uninstalled",
        "store/redact",
        "customers/redact",
        "customers/data_request"
      ];

      const registeredEvents = webhooks.map((wh: any) => wh.event);
      const missingEvents = requiredEvents.filter(e => !registeredEvents.includes(e));

      return {
        total: webhooks.length,
        registered: webhooks,
        required: requiredEvents,
        missing: missingEvents,
        allRequiredPresent: missingEvents.length === 0,
      };
      
    } catch (error) {
      console.error("Error checking webhook status:", error);
      throw error;
    }
  }
}
