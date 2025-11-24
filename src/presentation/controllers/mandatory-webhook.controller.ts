import { Request, Response } from "express";
import { StoreModel, ProductModel, VariantModel, ImageModel, CategoryModel } from "../../data/mongo";
import { TiendanubeProductService } from "../services/tiendanube/tiendanube-product.service";
import { TiendanubeCategoryService } from "../services/tiendanube/tiendanube-category.service";

/**
 * Controlador para webhooks OBLIGATORIOS
 * 
 * Webhooks que DEBEN estar implementados para que tu app funcione:
 * - app/uninstalled (desinstalación)
 * - product/* (sincronización en tiempo real)
 * - category/* (sincronización en tiempo real)
 */
export class MandatoryWebhookController {
  private static productService = new TiendanubeProductService();
  private static categoryService = new TiendanubeCategoryService();

  // ============================================
  // WEBHOOKS DE INSTALACIÓN (OBLIGATORIOS)
  // ============================================

  /**
   * 🗑️ APP UNINSTALLED (CRÍTICO)
   * Se llama cuando el usuario desinstala tu app
   * DEBES invalidar el access token
   */
  static async onAppUninstalled(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("🗑️ APP UNINSTALLED webhook:", { store_id });

      if (!store_id) {
        return res.status(400).json({ error: "Missing store_id" });
      }

      const store = await StoreModel.findOne({ storeId: store_id });

      if (!store) {
        console.log(`ℹ️  Store ${store_id} not found (already processed)`);
        return res.status(200).json({ 
          received: true,
          message: "Store not found"
        });
      }

      console.log(`Invalidating tokens for store: ${store.name} (${store_id})`);

      // OPCIÓN 1: Solo invalidar token (RECOMENDADO)
      store.accessToken = undefined;
      await store.save();

      // OPCIÓN 2: Borrar todo (descomenta si prefieres esto)
      /*
      await Promise.all([
        StoreModel.deleteOne({ storeId: store_id }),
        ProductModel.deleteMany({ storeId: store_id }),
        VariantModel.deleteMany({ storeId: store_id }),
        ImageModel.deleteMany({ storeId: store_id }),
        CategoryModel.deleteMany({ storeId: store_id }),
      ]);
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

  // ============================================
  // WEBHOOKS DE PRODUCTOS (OBLIGATORIOS)
  // ============================================

  /**
   * 📦 PRODUCT CREATE
   */
  static async onProductCreate(req: Request, res: Response) {
    // Responder inmediatamente
    res.status(200).json({ 
      received: true,
      product_id: req.body.id
    });

    // Procesar en background
    await MandatoryWebhookController.syncProduct(req.body);
  }

  /**
   * 🔄 PRODUCT UPDATE
   */
  static async onProductUpdate(req: Request, res: Response) {
    // Responder inmediatamente
    res.status(200).json({ 
      received: true,
      product_id: req.body.id
    });

    // Procesar en background
    await MandatoryWebhookController.syncProduct(req.body);
  }

  /**
   * 🗑️ PRODUCT DELETE
   */
  static async onProductDelete(req: Request, res: Response) {
    try {
      const { id: productId, store_id: storeId } = req.body;

      console.log("🗑️ PRODUCT DELETE:", { product_id: productId, store_id: storeId });

      if (!productId || !storeId) {
        return res.status(400).json({ error: "Missing product_id or store_id" });
      }

      // Responder inmediatamente
      res.status(200).json({ 
        received: true,
        product_id: productId
      });

      // Procesar en background
      await MandatoryWebhookController.productService.deleteProduct(
        storeId,
        productId
      );

    } catch (error) {
      console.error("❌ Error in onProductDelete:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // ============================================
  // WEBHOOKS DE CATEGORÍAS (OBLIGATORIOS)
  // ============================================

  /**
   * 📁 CATEGORY CREATED
   */
  static async onCategoryCreated(req: Request, res: Response) {
    // Responder inmediatamente
    res.status(200).json({ 
      received: true,
      category_id: req.body.id
    });

    // Procesar en background
    await MandatoryWebhookController.syncCategory(req.body);
  }

  /**
   * 🔄 CATEGORY UPDATED
   */
  static async onCategoryUpdated(req: Request, res: Response) {
    // Responder inmediatamente
    res.status(200).json({ 
      received: true,
      category_id: req.body.id
    });

    // Procesar en background
    await MandatoryWebhookController.syncCategory(req.body);
  }

  /**
   * 🗑️ CATEGORY DELETED
   */
  static async onCategoryDeleted(req: Request, res: Response) {
    try {
      const { id: categoryId, store_id: storeId } = req.body;

      console.log("🗑️ CATEGORY DELETE:", { category_id: categoryId, store_id: storeId });

      if (!categoryId || !storeId) {
        return res.status(400).json({ error: "Missing category_id or store_id" });
      }

      // Responder inmediatamente
      res.status(200).json({ 
        received: true,
        category_id: categoryId
      });

      // Procesar en background
      await MandatoryWebhookController.categoryService.deleteCategory(
        storeId,
        categoryId
      );

    } catch (error) {
      console.error("❌ Error in onCategoryDeleted:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Sincroniza un producto (para create/update)
   */
  private static async syncProduct(body: any) {
    try {
      const { id: productId, store_id: storeId } = body;

      if (!productId || !storeId) {
        console.error("Missing product_id or store_id");
        return;
      }

      const store = await StoreModel.findOne({ storeId });

      if (!store || !store.accessToken) {
        console.error(`Store ${storeId} not found or no access token`);
        return;
      }

      await MandatoryWebhookController.productService.syncSingleProduct(
        storeId,
        productId,
        store.accessToken
      );

    } catch (error) {
      console.error("❌ Error syncing product:", error);
    }
  }

  /**
   * Sincroniza una categoría (para create/update)
   */
  private static async syncCategory(body: any) {
    try {
      const { id: categoryId, store_id: storeId } = body;

      if (!categoryId || !storeId) {
        console.error("Missing category_id or store_id");
        return;
      }

      const store = await StoreModel.findOne({ storeId });

      if (!store || !store.accessToken) {
        console.error(`Store ${storeId} not found or no access token`);
        return;
      }

      await MandatoryWebhookController.categoryService.syncSingleCategory(
        storeId,
        categoryId,
        store.accessToken
      );

    } catch (error) {
      console.error("❌ Error syncing category:", error);
    }
  }
}