import crypto from "crypto";
import { envs } from "../../config";
import { Request, Response, NextFunction } from "express";

export const validateTiendanubeHmac = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const secret = envs.TIENDANUBE_CLIENT_SECRET;
    if (!secret) {
      throw new Error("Missing TIENDANUBE_CLIENT_SECRET");
    }

    const receivedHmac = req.headers["x-hmac-sha256"];

    if (!receivedHmac) {
      return res.status(401).json({ message: "Missing HMAC header" });
    }

    const rawBody = JSON.stringify(req.body);

    const generatedHmac = crypto
      .createHmac("sha256", secret) // ahora TS sabe que es string
      .update(rawBody)
      .digest("base64");

    if (generatedHmac !== receivedHmac) {
      return res.status(401).json({ message: "Invalid HMAC signature" });
    }

    next();
  } catch (err) {
    console.error("HMAC validation error:", err);
    return res.status(500).json({ message: "Internal HMAC validation error" });
  }
};
