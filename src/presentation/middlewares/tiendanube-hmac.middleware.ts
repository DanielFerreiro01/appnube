import crypto from "crypto";
import { envs } from "../../config";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware para validar HMAC de webhooks de Tiendanube
 * IMPORTANTE: Debe usarse DESPUÉS de express.raw() y ANTES de parsear el body
 */
export const validateTiendanubeHmac = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const secret = envs.TIENDANUBE_CLIENT_SECRET;
    
    if (!secret) {
      console.error("❌ Missing TIENDANUBE_CLIENT_SECRET");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const receivedHmac = req.headers["x-hmac-sha256"];

    if (!receivedHmac || typeof receivedHmac !== "string") {
      console.warn(`⚠️  Webhook received without HMAC header: ${req.url}`);
      console.warn("   This might be a test webhook from Tiendanube during setup");
      
      // ⚠️ WEBHOOKS CRÍTICOS: Siempre requieren HMAC, incluso en desarrollo
      const criticalWebhooks = [
        '/app/uninstalled',
        '/app/suspended',
        '/customer/redact',
        '/customer/data_request'
      ];
      
      const isCriticalWebhook = criticalWebhooks.some(path => req.url.includes(path));
      
      if (isCriticalWebhook) {
        console.error(`❌ CRITICAL: ${req.url} requires HMAC validation!`);
        console.error("   This webhook was REJECTED to prevent accidental data loss");
        return res.status(401).json({ 
          error: "Missing HMAC header",
          message: "Critical webhooks require HMAC validation"
        });
      }
      
      // Durante OAuth, Tiendanube puede enviar webhooks de prueba sin HMAC
      // Solo los rechazamos si no estamos en desarrollo
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: "Missing HMAC header" });
      }
      
      // En desarrollo, permitir pasar para testing (SOLO webhooks no críticos)
      console.warn("   ⚠️  DEV MODE: Allowing webhook without HMAC for testing");
      
      // Intentar parsear el body si viene como Buffer
      if (Buffer.isBuffer(req.body)) {
        try {
          req.body = JSON.parse(req.body.toString("utf8"));
        } catch (e) {
          // Si no es JSON válido, continuar con el Buffer
        }
      }
      
      next();
      return;
    }

    // El body viene como Buffer desde express.raw()
    let rawBody: string;
    
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString("utf8");
      // Parsear el JSON manualmente y guardarlo en req.body
      try {
        req.body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("❌ Error parsing webhook body:", parseError);
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    } else {
      // Fallback si ya viene parseado (no debería pasar)
      rawBody = JSON.stringify(req.body);
    }

    // Generar HMAC
    const generatedHmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

    // Comparar HMACs
    if (generatedHmac !== receivedHmac) {
      console.warn("⚠️  Invalid HMAC signature");
      console.log("Expected:", generatedHmac);
      console.log("Received:", receivedHmac);
      return res.status(401).json({ error: "Invalid HMAC signature" });
    }

    console.log("✅ HMAC validated successfully");
    next();
  } catch (err) {
    console.error("❌ HMAC validation error:", err);
    return res.status(500).json({ error: "Internal HMAC validation error" });
  }
};