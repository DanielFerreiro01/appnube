// ============================================
// Auth services
// ============================================
export * from "./auth/auth.service";
export * from "./auth/email.service";

// ============================================
// Store services
// ============================================
export * from "./store/store.service";

// ============================================
// Tiendanube services (separados por responsabilidad)
// ============================================

// Servicio principal/orquestador
export * from "./tiendanube/tiendanube.service";

// Servicios especializados
export * from "./tiendanube/tiendanube-product.service";
export * from "./tiendanube/tiendanube-category.service";

// OAuth
export * from "./tiendanube/tiendanube-oauth.service";

// Webhooks
export * from "./tiendanube/tiendanube-webhooks.service";

// ============================================
// Product services - Category services (queries locales)
// ============================================
export * from "./product/product.service";

export * from "./category/category.service";