import { Request, Response } from "express";
import { StoreModel, ProductModel, VariantModel, ImageModel, FavoriteModel } from "../../data/mongo";
import { UserModel } from "../../data/mongo/models/user.model";

/**
 * Controlador para los 3 webhooks obligatorios de GDPR
 * Documentación: https://tiendanube.github.io/api-documentation/resources/webhook#gdpr-webhooks
 */
export class WebhookController {
  
  /**
   * 🧹 1) APP SUSPENDED (GDPR)
   * Tiendanube lo llama cuando el dueño de la tienda solicita eliminar todos sus datos
   * Debes borrar TODA la información relacionada con esa tienda
   * 
   * POST /api/webhooks/tiendanube/gdpr/app/suspended
   */
  static async appSuspended(req: Request, res: Response) {
    try {
      const { store_id } = req.body;

      console.log("🧹 APP SUSPENDED (GDPR) webhook received:", { store_id });

      if (!store_id) {
        return res.status(400).json({ error: "Missing store_id" });
      }

      // Buscar la tienda por storeId
      const store = await StoreModel.findOne({ storeId: store_id });

      if (!store) {
        console.log(`⚠️  Store ${store_id} not found in database`);
        // Aún así responder 200 porque Tiendanube espera confirmación
        return res.status(200).json({ 
          message: "Store not found, nothing to delete",
          store_id 
        });
      }

      console.log(`Deleting all data for store: ${store.name} (${store_id})`);

      // Borrar TODO relacionado con esta tienda
      await Promise.all([
        StoreModel.deleteOne({ storeId: store_id }),
        ProductModel.deleteMany({ storeId: store_id }),
        VariantModel.deleteMany({ storeId: store_id }),
        ImageModel.deleteMany({ storeId: store_id }),
        FavoriteModel.deleteMany({ storeId: String(store_id) }),
        // Si tienes más modelos relacionados, agrégalos aquí
      ]);

      console.log(`✅ Store ${store_id} and all related data deleted successfully`);

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

  /**
   * 🧹 2) CUSTOMER REDACT
   * Tiendanube lo llama cuando un cliente solicita eliminar sus datos personales
   * 
   * POST /api/webhooks/tiendanube/gdpr/customers/redact
   */
  static async customerRedact(req: Request, res: Response) {
    try {
      const { shop_id, customer } = req.body;

      console.log("🧹 CUSTOMER REDACT webhook received:", { 
        shop_id, 
        customer_id: customer?.id,
        customer_email: customer?.email 
      });

      if (!shop_id || !customer) {
        return res.status(400).json({ error: "Missing shop_id or customer data" });
      }

      // Si tu app almacena datos de clientes, bórralos aquí
      // Por ejemplo, si guardas emails, órdenes, etc.
      
      // En tu caso actual, no almacenas datos de clientes directamente
      // Solo tienes usuarios de tu app, que son diferentes
      
      // Si en el futuro guardas:
      // - Direcciones de envío
      // - Historial de compras
      // - Datos personales
      // Deberías borrarlos aquí

      console.log(`✅ Customer ${customer.id} data redacted (no customer data stored)`);

      return res.status(200).json({ 
        message: "Customer data redacted",
        shop_id,
        customer_id: customer.id,
        deleted: true
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
   * 🔍 3) CUSTOMER DATA REQUEST
   * Tiendanube lo llama cuando un cliente solicita acceder a sus datos personales
   * Debes devolver TODOS los datos que tu app tiene sobre ese cliente
   * 
   * POST /api/webhooks/tiendanube/gdpr/customers/data_request
   */
  static async customerDataRequest(req: Request, res: Response) {
    try {
      const { shop_id, customer } = req.body;

      console.log("🔍 CUSTOMER DATA REQUEST webhook received:", { 
        shop_id, 
        customer_id: customer?.id,
        customer_email: customer?.email 
      });

      if (!shop_id || !customer) {
        return res.status(400).json({ error: "Missing shop_id or customer data" });
      }

      // Aquí debes recopilar TODOS los datos que tu app tiene sobre este cliente
      const customerData: any = {
        customer_id: customer.id,
        email: customer.email,
        shop_id: shop_id,
        data_collected_by_app: {
          // Ejemplo: si guardas favoritos por email de cliente
          // favorites: await FavoriteModel.find({ customerEmail: customer.email }),
          
          // Por ahora tu app no guarda datos de clientes
          message: "This app does not store customer personal data"
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
 * 🧹 4) STORE REDACT (GDPR)
 * Tiendanube lo llama cuando la tienda solicita eliminar TODOS los datos personales
 * de sus clientes que tu app pudiera estar almacenando.
 * 
 * POST /api/webhooks/tiendanube/store/redact
 */
static async storeRedact(req: Request, res: Response) {
  try {
    const { shop_id } = req.body;

    console.log("🧹 STORE REDACT webhook received:", { shop_id });

    if (!shop_id) {
      return res.status(400).json({ error: "Missing shop_id" });
    }

    // 👉 Aquí deberías borrar datos PERSONALES
    // que tu app tenga de los clientes de esa tienda.
    // En este momento tu app **NO almacena datos personales** de clientes
    // por lo que simplemente devolvemos éxito.

    console.log(`✅ Store redact completed for shop_id ${shop_id} (no customer data stored)`);

    return res.status(200).json({
      message: "Store customer data redacted",
      shop_id,
      deleted: true
    });

  } catch (error) {
    console.error("❌ Error in storeRedact:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: String(error)
    });
  }
}

}