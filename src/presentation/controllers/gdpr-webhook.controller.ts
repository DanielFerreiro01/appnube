import { Request, Response } from "express";
import { StoreModel, ProductModel, VariantModel, ImageModel, CategoryModel, FavoriteModel } from "../../data/mongo";

/**
 * Controlador para webhooks GDPR (OBLIGATORIOS por ley)
 * 
 * Estos webhooks son requeridos por Tiendanube para cumplir con GDPR.
 * Documentación: https://tiendanube.github.io/api-documentation/resources/webhook#gdpr-webhooks
 * 
 * IMPORTANTE: Estos webhooks se configuran en el Partners Panel,
 * NO se pueden registrar vía API
 */
export class GDPRWebhookController {
  
  /**
   * 🧹 STORE REDACT (GDPR)
   * Tiendanube lo llama cuando la tienda solicita eliminar
   * TODOS los datos personales de sus clientes
   * 
   * POST /api/webhooks/tiendanube/gdpr/store/redact
   */
  static async storeRedact(req: Request, res: Response) {
    try {
      const { shop_id } = req.body;

      console.log("🧹 STORE REDACT (GDPR):", { shop_id });

      if (!shop_id) {
        return res.status(400).json({ error: "Missing shop_id" });
      }

      // 👉 Aquí deberías borrar datos PERSONALES de clientes
      // En tu caso actual NO almacenas datos personales de clientes
      // Solo productos, categorías, etc.

      // Si en el futuro almacenas:
      // - Direcciones de clientes
      // - Historial de compras
      // - Datos de contacto
      // Bórralos aquí

      console.log(`✅ Store redact completed for shop_id ${shop_id}`);

      return res.status(200).json({
        message: "Store customer data redacted",
        shop_id,
        deleted: true,
        note: "This app does not store customer personal data"
      });

    } catch (error) {
      console.error("❌ Error in storeRedact:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: String(error)
      });
    }
  }

  /**
   * 🧹 CUSTOMER REDACT (GDPR)
   * Tiendanube lo llama cuando un cliente específico
   * solicita eliminar sus datos personales
   * 
   * POST /api/webhooks/tiendanube/gdpr/customers/redact
   */
  static async customerRedact(req: Request, res: Response) {
    try {
      const { shop_id, customer } = req.body;

      console.log("🧹 CUSTOMER REDACT (GDPR):", { 
        shop_id, 
        customer_id: customer?.id,
        customer_email: customer?.email 
      });

      if (!shop_id || !customer) {
        return res.status(400).json({ error: "Missing shop_id or customer data" });
      }

      // 👉 Si guardas datos de clientes, bórralos aquí
      // Por ejemplo:
      // - Favoritos vinculados al email del cliente
      // - Direcciones guardadas
      // - Historial de compras

      // Ejemplo si guardas favoritos por email:
      // await FavoriteModel.deleteMany({ customerEmail: customer.email });

      console.log(`✅ Customer ${customer.id} data redacted`);

      return res.status(200).json({ 
        message: "Customer data redacted",
        shop_id,
        customer_id: customer.id,
        deleted: true,
        note: "This app does not store customer personal data"
      });

    } catch (error) {
      console.error("❌ Error in customerRedact:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: String(error)
      });
    }
  }

  /**
   * 🔍 CUSTOMER DATA REQUEST (GDPR)
   * Tiendanube lo llama cuando un cliente solicita
   * acceder a TODOS sus datos personales que tu app almacena
   * 
   * POST /api/webhooks/tiendanube/gdpr/customers/data_request
   */
  static async customerDataRequest(req: Request, res: Response) {
    try {
      const { shop_id, customer } = req.body;

      console.log("🔍 CUSTOMER DATA REQUEST (GDPR):", { 
        shop_id, 
        customer_id: customer?.id,
        customer_email: customer?.email 
      });

      if (!shop_id || !customer) {
        return res.status(400).json({ error: "Missing shop_id or customer data" });
      }

      // 👉 Recopilar TODOS los datos que tu app tiene sobre este cliente
      const customerData: any = {
        customer_id: customer.id,
        email: customer.email,
        shop_id: shop_id,
        data_collected_by_app: {
          // Ejemplo si guardas favoritos:
          // favorites: await FavoriteModel.find({ customerEmail: customer.email }),
          
          // Ejemplo si guardas direcciones:
          // addresses: await AddressModel.find({ customerEmail: customer.email }),
          
          // Tu app actual NO guarda datos de clientes
          message: "This app does not store customer personal data",
          stored_data: {
            favorites: [],
            addresses: [],
            orders: [],
            preferences: null
          }
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Customer ${customer.id} data request processed`);

      return res.status(200).json(customerData);

    } catch (error) {
      console.error("❌ Error in customerDataRequest:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: String(error)
      });
    }
  }

  /**
   * 🧹 APP SUSPENDED (GDPR - CRÍTICO)
   * Tiendanube lo llama cuando el dueño de la tienda
   * solicita eliminar TODOS los datos de la tienda
   * 
   * POST /api/webhooks/tiendanube/gdpr/app/suspended
   * 
   * IMPORTANTE: Esto es diferente a "uninstall"
   * Aquí debes borrar TODO, incluida la tienda
   */
  static async appSuspended(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("🧹 APP SUSPENDED (GDPR):", { store_id });

      if (!store_id) {
        return res.status(400).json({ error: "Missing store_id" });
      }

      const store = await StoreModel.findOne({ storeId: store_id });

      if (!store) {
        console.log(`⚠️  Store ${store_id} not found`);
        return res.status(200).json({ 
          message: "Store not found, nothing to delete",
          store_id 
        });
      }

      console.log(`🔴 DELETING ALL DATA for store: ${store.name} (${store_id})`);

      // Borrar TODO relacionado con esta tienda
      await Promise.all([
        StoreModel.deleteOne({ storeId: store_id }),
        ProductModel.deleteMany({ storeId: store_id }),
        VariantModel.deleteMany({ storeId: store_id }),
        ImageModel.deleteMany({ storeId: store_id }),
        CategoryModel.deleteMany({ storeId: store_id }),
        FavoriteModel.deleteMany({ storeId: String(store_id) }),
        // Si tienes más modelos, agrégalos aquí
      ]);

      console.log(`✅ Store ${store_id} and ALL related data deleted`);

      return res.status(200).json({ 
        message: "Store data deleted successfully",
        store_id,
        deleted: true
      });

    } catch (error) {
      console.error("❌ Error in appSuspended:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: String(error)
      });
    }
  }
}