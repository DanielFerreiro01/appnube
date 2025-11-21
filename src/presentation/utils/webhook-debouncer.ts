/**
 * Sistema de debouncing para webhooks duplicados
 * Evita procesar el mismo producto múltiples veces en rápida sucesión
 */

interface PendingSync {
  productId: number;
  storeId: number;
  timeout: NodeJS.Timeout;
}

class WebhookDebouncer {
  private pendingSyncs: Map<string, PendingSync> = new Map();
  private readonly debounceTime: number;

  constructor(debounceTimeMs: number = 2000) {
    this.debounceTime = debounceTimeMs;
  }

  /**
   * Programa una sincronización con debounce
   * Si ya hay una pendiente, la cancela y programa una nueva
   */
  scheduleSync(
    storeId: number,
    productId: number,
    syncFunction: () => Promise<void>
  ): void {
    const key = `${storeId}-${productId}`;
    
    // Si ya hay una sincronización pendiente, cancelarla
    const existing = this.pendingSyncs.get(key);
    if (existing) {
      console.log(`[DEBOUNCE] Canceling previous sync for product ${productId} (duplicate webhook)`);
      clearTimeout(existing.timeout);
    }

    // Programar nueva sincronización
    const timeout = setTimeout(async () => {
      console.log(`[DEBOUNCE] Executing sync for product ${productId}`);
      try {
        await syncFunction();
      } catch (error) {
        console.error(`[DEBOUNCE] Error syncing product ${productId}:`, error);
      } finally {
        // Limpiar después de ejecutar
        this.pendingSyncs.delete(key);
      }
    }, this.debounceTime);

    this.pendingSyncs.set(key, { productId, storeId, timeout });
    console.log(`[DEBOUNCE] Scheduled sync for product ${productId} in ${this.debounceTime}ms`);
  }

  /**
   * Obtiene estadísticas de sincronizaciones pendientes
   */
  getPendingCount(): number {
    return this.pendingSyncs.size;
  }

  /**
   * Limpia todas las sincronizaciones pendientes
   */
  clear(): void {
    for (const [key, pending] of this.pendingSyncs.entries()) {
      clearTimeout(pending.timeout);
      this.pendingSyncs.delete(key);
    }
  }
}

// Exportar instancia singleton
export const webhookDebouncer = new WebhookDebouncer(2000); // 2 segundos de debounce