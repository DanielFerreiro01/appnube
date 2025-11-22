import { envs } from "../../../config";

export class TiendanubeWebhookService {
  private readonly baseUrl = "https://api.tiendanube.com/v1";

  async registerRequiredWebhooks(storeId: number, accessToken: string) {
    const requiredWebhooks = [
      "store/created",
      "store/updated",
      "app/uninstalled",
    ];

    for (const topic of requiredWebhooks) {
      await this.createWebhook(storeId, accessToken, topic);
    }
  }

  private async createWebhook(storeId: number, token: string, topic: string) {
    const response = await fetch(
      `${this.baseUrl}/${storeId}/webhooks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authentication: `bearer ${token}`,
          "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
        },
        body: JSON.stringify({
          topic,
          url: `${envs.WEBSERVICE_URL}/api/webhooks/tiendanube/${topic}`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error creating webhook ${topic}:`, errorText);
    }
  }
}
