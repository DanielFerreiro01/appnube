import { Request, Response } from "express";
import { StoreModel, ProductModel, VariantModel, ImageModel } from "../../data/mongo";
import { webhookDebouncer } from "../utils/webhook-debouncer";

/**
 * Controlador para webhooks obligatorios de instalación/desinstalación
 * Documentación: https://tiendanube.github.io/api-documentation/resources/webhook
 */
export class TiendanubeWebhookController {
  
  /**
   * 📦 1) APP INSTALLED
   * Se llama cuando instalan tu app (alternativa al OAuth callback)
   * 
   * POST /api/webhooks/tiendanube/mandatory/app/installed
   */
  static async onAppInstalled(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("📦 APP INSTALLED webhook received:", { store_id });

      // El OAuth ya maneja la instalación, solo logueamos
      return res.status(200).json({ 
        received: true,
        message: "App installation logged"
      });

    } catch (error) {
      console.error("❌ Error in onAppInstalled:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * 🗑️ 3) APP UNINSTALLED
   * Se llama cuando el usuario desinstala tu app
   * DEBES invalidar el access token y opcionalmente borrar datos
   * 
   * POST /api/webhooks/tiendanube/mandatory/app/uninstalled
   */
  static async onAppUninstalled(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("🗑️ APP UNINSTALLED webhook received:", { store_id });

      if (!store_id) {
        return res.status(400).json({ error: "Missing store_id" });
      }

      const store = await StoreModel.findOne({ storeId: store_id });

      if (!store) {
        console.log(`ℹ️  Store ${store_id} not found (might be a test webhook or already deleted)`);
        // Responder 200 de todas formas - es idempotente
        return res.status(200).json({ 
          received: true,
          message: "Store not found (already processed or test webhook)"
        });
      }

      console.log(`Invalidating tokens for store: ${store.name} (${store_id})`);

      // OPCIÓN 1: Invalidar token pero mantener datos (recomendado)
      store.accessToken = undefined;
      await store.save();

      // OPCIÓN 2: Borrar TODA la información (más agresivo)
      // Descomentar si prefieres borrar todo al desinstalar
      /*
      await Promise.all([
        StoreModel.deleteOne({ storeId: store_id }),
        ProductModel.deleteMany({ storeId: store_id }),
        VariantModel.deleteMany({ storeId: store_id }),
        ImageModel.deleteMany({ storeId: store_id }),
      ]);
      console.log(`🔴 Store ${store_id} and all data deleted`);
      */

      console.log(`✅ Store ${store_id} uninstall processed`);

      return res.status(200).json({ 
        success: true,
        message: "App uninstalled successfully",
        store_id
      });

    } catch (error) {
      console.error("❌ Error in onAppUninstalled:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * 📦 4) PRODUCT CREATE
   * Se llama cuando se crea un producto
   * 
   * POST /api/webhooks/tiendanube/mandatory/product/create
   */
  static async onProductCreate(req: Request, res: Response) {
    // Responder inmediatamente
    res.status(200).json({ 
      received: true,
      product_id: req.body.id
    });

    // Procesar en background - reutilizar la lógica de update
    await TiendanubeWebhookController.onProductUpdate(
      { ...req, _responseSent: true } as any,
      { status: () => ({ json: () => {} }) } as any
    );
  }

  /**
   * 🔄 5) PRODUCT UPDATE
   * Se llama cuando se actualiza un producto
   * Sincroniza SOLO ese producto específico
   * 
   * POST /api/webhooks/tiendanube/mandatory/product/update
   */
  static async onProductUpdate(req: Request, res: Response) {
    // Responder inmediatamente con 200 (buena práctica)
    res.status(200).json({ 
      received: true,
      product_id: req.body.id
    });

    // Procesar en background (sin bloquear la respuesta)
    try {
      const { id: productId, store_id: storeId } = req.body;

      console.log("🔄 PRODUCT UPDATE webhook:", { product_id: productId, store_id: storeId });

      if (!productId || !storeId) {
        console.error("Missing product_id or store_id in webhook");
        return;
      }

      // Buscar la tienda para obtener el access token
      const store = await StoreModel.findOne({ storeId });

      if (!store || !store.accessToken) {
        console.error(`Store ${storeId} not found or no access token`);
        return;
      }

      console.log(`[WEBHOOK] Syncing product ${productId} for store ${storeId}...`);

      // Obtener el producto actualizado desde Tiendanube
      const response = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/products/${productId}`,
        {
          method: "GET",
          headers: {
            Authentication: `bearer ${store.accessToken}`,
            "User-Agent": "AppNube (daniiferreiro26@gmail.com)",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`Error fetching product ${productId}: ${response.status}`);
        return;
      }

      const product = await response.json();

      // Actualizar el producto en tu DB
      const basePrice = parseFloat(product.variants[0]?.price || "0");
      const permalink = product.canonical_url || 
                       `https://${storeId}.mitiendanube.com/productos/${product.handle}`;

      await ProductModel.findOneAndUpdate(
        { storeId, productId },
        {
          storeId,
          productId,
          name: product.name.es || product.name,
          description: product.description?.es || product.description || "",
          price: basePrice,
          handle: product.handle,
          permalink,
          published: product.published,
          tags: product.tags ? product.tags.split(",").map((t: string) => t.trim()) : [],
          mainImage: product.images[0]?.src,
          updatedAtTN: new Date(product.updated_at),
          syncedAt: new Date(),
        },
        { upsert: true }
      );

      // Actualizar variantes
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          await VariantModel.findOneAndUpdate(
            { storeId, productId, variantId: variant.id },
            {
              storeId,
              productId,
              variantId: variant.id,
              sku: variant.sku || "",
              price: parseFloat(variant.price),
              stock: variant.stock || 0,
              options: variant.values ? variant.values.map((v: any) => v.es || v) : [],
              updatedAtTN: new Date(variant.updated_at),
            },
            { upsert: true }
          );
        }
      }

      // Actualizar imágenes
      if (product.images && product.images.length > 0) {
        // Primero borrar las imágenes viejas
        await ImageModel.deleteMany({ storeId, productId });
        
        // Luego insertar las nuevas
        for (const image of product.images) {
          await ImageModel.create({
            storeId,
            productId,
            imageId: image.id,
            src: image.src,
            alt: image.alt?.[0]?.es || image.alt?.[0] || "",
            position: image.position || 0,
          });
        }
      }

      console.log(`✅ Product ${productId} synced successfully via webhook`);

    } catch (error) {
      console.error("❌ Error processing product update webhook:", error);
    }
  }

  /**
   * 🗑️ 6) PRODUCT DELETE
   * Se llama cuando se elimina un producto
   * 
   * POST /api/webhooks/tiendanube/mandatory/product/delete
   */
  static async onProductDelete(req: Request, res: Response) {
    try {
      const { id, store_id } = req.body;

      console.log("🗑️ PRODUCT DELETE webhook:", { product_id: id, store_id });

      // Borrar el producto de tu DB
      await Promise.all([
        ProductModel.deleteOne({ storeId: store_id, productId: id }),
        VariantModel.deleteMany({ storeId: store_id, productId: id }),
        ImageModel.deleteMany({ storeId: store_id, productId: id }),
      ]);

      console.log(`✅ Product ${id} deleted from store ${store_id}`);

      return res.status(200).json({ 
        received: true,
        deleted: true,
        product_id: id
      });

    } catch (error) {
      console.error("❌ Error in onProductDelete:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * VARIANT CREATE/UPDATE/DELETE
   * NOTA: Tiendanube NO tiene webhooks específicos para variantes
   * Los cambios en variantes disparan product/updated
   */
  static async onVariantCreate(req: Request, res: Response) {
    return res.status(200).json({ 
      received: true,
      message: "Variant webhooks not supported by Tiendanube. Use product/updated instead."
    });
  }

  static async onVariantUpdate(req: Request, res: Response) {
    return res.status(200).json({ 
      received: true,
      message: "Variant webhooks not supported by Tiendanube. Use product/updated instead."
    });
  }

  static async onVariantDelete(req: Request, res: Response) {
    return res.status(200).json({ 
      received: true,
      message: "Variant webhooks not supported by Tiendanube. Use product/updated instead."
    });
  }

  /**
   * CATEGORY CREATED
   */
  static async onCategoryCreated(req: Request, res: Response) {
    try {
      const { id, store_id, name } = req.body;
      console.log("📁 CATEGORY CREATED:", { category_id: id, store_id, name });
      
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ Error in onCategoryCreated:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * CATEGORY UPDATED
   */
  static async onCategoryUpdated(req: Request, res: Response) {
    try {
      const { id, store_id, name } = req.body;
      console.log("🔄 CATEGORY UPDATED:", { category_id: id, store_id, name });
      
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ Error in onCategoryUpdated:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * CATEGORY DELETED
   */
  static async onCategoryDeleted(req: Request, res: Response) {
    try {
      const { id, store_id } = req.body;
      console.log("🗑️ CATEGORY DELETED:", { category_id: id, store_id });
      
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ Error in onCategoryDeleted:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}