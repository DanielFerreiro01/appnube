import { envs } from "../../../config";

export class TiendanubeWebhookService {
  static async registerAll(storeId: number, accessToken: string) {
    const baseUrl = envs.WEBSERVICE_URL + "/api/webhooks/tiendanube";

    const webhooks = [
      // Productos
      { topic: "products/create", url: `${baseUrl}/products/create` },
      { topic: "products/update", url: `${baseUrl}/products/update` },
      { topic: "products/delete", url: `${baseUrl}/products/delete` },

      // Variantes
      { topic: "variants/create", url: `${baseUrl}/variants/create` },
      { topic: "variants/update", url: `${baseUrl}/variants/update` },
      { topic: "variants/delete", url: `${baseUrl}/variants/delete` },
    ];

    for (const wh of webhooks) {
      const resp = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/webhooks`,
        {
          method: "POST",
          headers: {
            Authentication: `bearer ${accessToken}`,
            "User-Agent": "AppNube (contact@appnube.com)",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(wh),
        }
      );

      if (!resp.ok) {
        const error = await resp.text();
        console.error(`❌ Error creando webhook ${wh.topic}:`, error);
      } else {
        console.log(`✅ Webhook creado: ${wh.topic}`);
      }
    }
  }
}
