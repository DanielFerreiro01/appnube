/**
 * Script de testing modular para la API de Tiendas y Productos
 * 
 * Uso:
 * const api = require('./test-api.js');
 * 
 * // Ejecutar tests individuales
 * await api.testRegister();
 * await api.testLogin();
 * await api.testCreateStore();
 * 
 * // O ejecutar todos
 * await api.runAllTests();
 */

const BASE_URL = "http://localhost:3000/api";

// Colores para la consola
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Estado global del testing
const state = {
  token: "",
  storeMongoId: "",
  storeId: null,
  productId: null,
};

// Helper para logs con colores
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}🧪 ${msg}${colors.reset}\n`),
  data: (label, value) => console.log(`${colors.cyan}   ${label}: ${value}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

// Helper para requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (state.token) {
    defaultHeaders.Authorization = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TESTS DE AUTENTICACIÓN
// ============================================

/**
 * Test 1: Registro de usuario
 */
async function testRegister(email = null) {
  log.test("Test: Registro de usuario");

  const userEmail = email || `test${Date.now()}@test.com`;

  const result = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test User API",
      email: userEmail,
      password: "123456",
    }),
  });

  if (result.success && result.data.token) {
    state.token = result.data.token;
    log.success("Usuario registrado exitosamente");
    log.data("Email", userEmail);
    log.data("Token", state.token.substring(0, 30) + "...");
    log.data("User ID", result.data.user.id);
    return { success: true, data: result.data };
  } else {
    log.error(`Registro falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 2: Login
 */
async function testLogin(email = "test@test.com", password = "123456") {
  log.test("Test: Login");

  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data.token) {
    state.token = result.data.token;
    log.success("Login exitoso");
    log.data("Email", email);
    log.data("Token", state.token.substring(0, 30) + "...");
    return { success: true, data: result.data };
  } else {
    log.error(`Login falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

// ============================================
// TESTS DE TIENDAS
// ============================================

/**
 * Test 3: Crear tienda
 */
async function testCreateStore(storeName = null, storeUrl = null) {
  log.test("Test: Crear tienda");

  if (!state.token) {
    log.warn("No hay token. Ejecuta testRegister() o testLogin() primero");
    return { success: false, error: "No token" };
  }

  const name = storeName || `Tienda Prueba ${Date.now()}`;
  const url = storeUrl || `https://test${Date.now()}.mitiendanube.com`;

  const result = await request("/stores", {
    method: "POST",
    body: JSON.stringify({
      name,
      tiendanubeUrl: url,
      description: "Tienda creada por el script de testing",
    }),
  });

  if (result.success && result.data.id) {
    state.storeMongoId = result.data.id;
    log.success("Tienda creada exitosamente");
    log.data("Store MongoDB ID", state.storeMongoId);
    log.data("Nombre", result.data.name);
    log.data("URL", result.data.tiendanubeUrl);
    return { success: true, data: result.data };
  } else {
    log.error(`Crear tienda falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 4: Listar tiendas
 */
async function testListStores(page = 1, limit = 10) {
  log.test("Test: Listar tiendas");

  if (!state.token) {
    log.warn("No hay token. Ejecuta testLogin() primero");
    return { success: false, error: "No token" };
  }

  const result = await request(`/stores?page=${page}&limit=${limit}`, {
    method: "GET",
  });

  if (result.success && result.data.stores) {
    log.success(`Listado exitoso: ${result.data.stores.length} tiendas`);
    log.data("Total", result.data.pagination.total);
    log.data("Página", `${result.data.pagination.page}/${result.data.pagination.totalPages}`);
    
    // Mostrar primeras 3 tiendas
    if (result.data.stores.length > 0) {
      console.log("\n   Primeras tiendas:");
      result.data.stores.slice(0, 3).forEach((store, i) => {
        console.log(`   ${i + 1}. ${store.name} (${store.id})`);
      });
    }
    
    return { success: true, data: result.data };
  } else {
    log.error(`Listar tiendas falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 5: Obtener tienda por ID
 */
async function testGetStore(storeId = null) {
  log.test("Test: Obtener tienda por ID");

  const id = storeId || state.storeMongoId;

  if (!id) {
    log.warn("No hay storeId. Ejecuta testCreateStore() primero o pasa un ID");
    return { success: false, error: "No store ID" };
  }

  const result = await request(`/stores/${id}`, { method: "GET" });

  if (result.success && result.data.id) {
    log.success("Tienda obtenida exitosamente");
    log.data("ID", result.data.id);
    log.data("Nombre", result.data.name);
    log.data("URL", result.data.tiendanubeUrl);
    if (result.data.storeId) {
      log.data("Store ID (Tiendanube)", result.data.storeId);
    }
    return { success: true, data: result.data };
  } else {
    log.error(`Obtener tienda falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 6: Actualizar tienda
 */
async function testUpdateStore(storeId = null, updates = {}) {
  log.test("Test: Actualizar tienda");

  const id = storeId || state.storeMongoId;

  if (!id) {
    log.warn("No hay storeId. Ejecuta testCreateStore() primero");
    return { success: false, error: "No store ID" };
  }

  const defaultUpdates = {
    description: "Descripción actualizada por el script",
    logo: "https://example.com/logo-updated.png",
  };

  const result = await request(`/stores/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...defaultUpdates, ...updates }),
  });

  if (result.success) {
    log.success("Tienda actualizada exitosamente");
    log.data("Nombre", result.data.name);
    if (result.data.description) log.data("Descripción", result.data.description);
    return { success: true, data: result.data };
  } else {
    log.error(`Actualizar tienda falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 7: Actualizar con credenciales de Tiendanube
 */
async function testUpdateStoreCredentials(tnStoreId, accessToken, storeId = null) {
  log.test("Test: Actualizar credenciales de Tiendanube");

  const id = storeId || state.storeMongoId;

  if (!id) {
    log.warn("No hay storeId. Ejecuta testCreateStore() primero");
    return { success: false, error: "No store ID" };
  }

  if (!tnStoreId || !accessToken) {
    log.warn("Necesitas proporcionar storeId y accessToken de Tiendanube");
    log.info("Uso: testUpdateStoreCredentials(123456, 'tu_token_aqui')");
    return { success: false, error: "Missing credentials" };
  }

  const result = await request(`/stores/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      storeId: tnStoreId,
      accessToken: accessToken,
    }),
  });

  if (result.success) {
    state.storeId = tnStoreId;
    log.success("Credenciales actualizadas exitosamente");
    log.data("Store ID (Tiendanube)", tnStoreId);
    log.data("Token configurado", "✓");
    return { success: true, data: result.data };
  } else {
    log.error(`Actualizar credenciales falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 8: Sincronizar productos
 */
async function testSyncProducts(storeId = null) {
  log.test("Test: Sincronizar productos");

  const id = storeId || state.storeMongoId;

  if (!id) {
    log.warn("No hay storeId. Ejecuta testCreateStore() primero");
    return { success: false, error: "No store ID" };
  }

  log.info("Iniciando sincronización... (esto puede tardar)");

  const result = await request(`/stores/${id}/sync`, { method: "POST" });

  if (result.success) {
    log.success("Sincronización exitosa");
    log.data("Productos sincronizados", result.data.totalSynced);
    log.data("Store ID", result.data.storeId);
    if (result.data.errors) {
      log.warn(`Errores: ${result.data.errors.length}`);
    }
    return { success: true, data: result.data };
  } else {
    log.error(`Sincronización falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 9: Eliminar tienda
 */
async function testDeleteStore(storeId = null) {
  log.test("Test: Eliminar tienda");

  const id = storeId || state.storeMongoId;

  if (!id) {
    log.warn("No hay storeId");
    return { success: false, error: "No store ID" };
  }

  const result = await request(`/stores/${id}`, { method: "DELETE" });

  if (result.success) {
    log.success("Tienda eliminada exitosamente");
    state.storeMongoId = "";
    state.storeId = null;
    return { success: true, data: result.data };
  } else {
    log.error(`Eliminar tienda falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

// ============================================
// TESTS DE PRODUCTOS
// ============================================

/**
 * Test 10: Listar productos
 */
async function testListProducts(tnStoreId = null, filters = {}) {
  log.test("Test: Listar productos");

  const storeId = tnStoreId || state.storeId;

  if (!storeId) {
    log.warn("No hay storeId de Tiendanube. Necesitas sincronizar productos primero");
    return { success: false, error: "No Tiendanube store ID" };
  }

  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10,
    ...(filters.published !== undefined && { published: filters.published }),
    ...(filters.inStock !== undefined && { inStock: filters.inStock }),
    ...(filters.sort && { sort: filters.sort }),
  });

  const result = await request(`/products/${storeId}?${params}`, {
    method: "GET",
  });

  if (result.success && result.data.products) {
    log.success(`Productos listados: ${result.data.products.length}`);
    log.data("Total", result.data.pagination.total);
    log.data("Página", `${result.data.pagination.page}/${result.data.pagination.totalPages}`);
    
    if (result.data.products.length > 0) {
      state.productId = result.data.products[0].productId;
      console.log("\n   Primeros productos:");
      result.data.products.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - $${p.price} (ID: ${p.productId})`);
      });
    }
    
    return { success: true, data: result.data };
  } else {
    log.error(`Listar productos falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 11: Buscar productos
 */
async function testSearchProducts(searchTerm, tnStoreId = null) {
  log.test("Test: Buscar productos");

  const storeId = tnStoreId || state.storeId;

  if (!storeId) {
    log.warn("No hay storeId de Tiendanube");
    return { success: false, error: "No store ID" };
  }

  if (!searchTerm) {
    log.warn("Necesitas proporcionar un término de búsqueda");
    log.info("Uso: testSearchProducts('remera')");
    return { success: false, error: "No search term" };
  }

  const result = await request(
    `/products/${storeId}/search?q=${encodeURIComponent(searchTerm)}&limit=10`,
    { method: "GET" }
  );

  if (result.success) {
    log.success(`Búsqueda exitosa: ${result.data.products.length} resultados`);
    log.data("Término", result.data.searchTerm);
    log.data("Total", result.data.pagination.total);
    
    if (result.data.products.length > 0) {
      console.log("\n   Resultados:");
      result.data.products.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - $${p.price}`);
      });
    }
    
    return { success: true, data: result.data };
  } else {
    log.error(`Búsqueda falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 12: Obtener productos destacados
 */
async function testFeaturedProducts(tnStoreId = null, limit = 10) {
  log.test("Test: Productos destacados");

  const storeId = tnStoreId || state.storeId;

  if (!storeId) {
    log.warn("No hay storeId de Tiendanube");
    return { success: false, error: "No store ID" };
  }

  const result = await request(
    `/products/${storeId}/featured?limit=${limit}`,
    { method: "GET" }
  );

  if (result.success) {
    log.success(`Productos destacados: ${result.data.products.length}`);
    log.data("Total encontrados", result.data.total);
    
    if (result.data.products.length > 0) {
      console.log("\n   Productos destacados:");
      result.data.products.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - $${p.price}`);
      });
    }
    
    return { success: true, data: result.data };
  } else {
    log.error(`Obtener destacados falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 13: Obtener estadísticas de productos
 */
async function testProductStats(tnStoreId = null) {
  log.test("Test: Estadísticas de productos");

  const storeId = tnStoreId || state.storeId;

  if (!storeId) {
    log.warn("No hay storeId de Tiendanube");
    return { success: false, error: "No store ID" };
  }

  const result = await request(`/products/${storeId}/stats`, {
    method: "GET",
  });

  if (result.success) {
    const stats = result.data;
    log.success("Estadísticas obtenidas");
    console.log("\n   Estadísticas:");
    log.data("Total productos", stats.totalProducts);
    log.data("Publicados", stats.publishedProducts);
    log.data("Con stock", stats.productsWithStock);
    log.data("Sin stock", stats.productsWithoutStock);
    log.data("Total variantes", stats.totalVariantes);
    log.data("Total stock", stats.totalStock);
    log.data("Rango precios", `$${stats.priceRange.minPrice} - $${stats.priceRange.maxPrice}`);
    
    if (stats.topTags && stats.topTags.length > 0) {
      console.log("\n   Top 5 Tags:");
      stats.topTags.slice(0, 5).forEach((tag, i) => {
        console.log(`   ${i + 1}. ${tag.tag} (${tag.count})`);
      });
    }
    
    return { success: true, data: result.data };
  } else {
    log.error(`Obtener estadísticas falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

/**
 * Test 14: Obtener detalles de un producto
 */
async function testProductDetails(productId = null, tnStoreId = null) {
  log.test("Test: Detalles de producto");

  const storeId = tnStoreId || state.storeId;
  const prodId = productId || state.productId;

  if (!storeId || !prodId) {
    log.warn("Necesitas storeId y productId");
    log.info("Ejecuta testListProducts() primero para obtener un productId");
    return { success: false, error: "Missing IDs" };
  }

  const result = await request(`/products/${storeId}/${prodId}`, {
    method: "GET",
  });

  if (result.success) {
    const { product, variants, images, stats } = result.data;
    log.success("Detalles obtenidos");
    console.log("\n   Producto:");
    log.data("Nombre", product.name);
    log.data("Precio", `$${product.price}`);
    log.data("Publicado", product.published ? "Sí" : "No");
    console.log("\n   Estadísticas:");
    log.data("Variantes", stats.totalVariants);
    log.data("Imágenes", stats.totalImages);
    log.data("Stock total", stats.totalStock);
    log.data("Precios", `$${stats.minPrice} - $${stats.maxPrice}`);
    
    return { success: true, data: result.data };
  } else {
    log.error(`Obtener detalles falló: ${result.error}`);
    return { success: false, error: result.error };
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Verificar que el servidor esté corriendo
 */
async function checkServer() {
  try {
    const response = await fetch(BASE_URL.replace("/api", ""));
    if (response.ok || response.status === 404) {
      log.success("Servidor está corriendo");
      return true;
    }
  } catch (error) {
    log.error("No se pudo conectar al servidor");
    log.info("Asegurate de que el servidor esté corriendo: npm run dev");
    return false;
  }
}

/**
 * Mostrar estado actual
 */
function showState() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Estado Actual del Testing");
  console.log("=".repeat(60));
  console.log(`${colors.cyan}Token:${colors.reset} ${state.token ? state.token.substring(0, 30) + "..." : "No configurado"}`);
  console.log(`${colors.cyan}Store MongoDB ID:${colors.reset} ${state.storeMongoId || "No configurado"}`);
  console.log(`${colors.cyan}Store ID (Tiendanube):${colors.reset} ${state.storeId || "No configurado"}`);
  console.log(`${colors.cyan}Product ID:${colors.reset} ${state.productId || "No configurado"}`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Limpiar estado
 */
function clearState() {
  state.token = "";
  state.storeMongoId = "";
  state.storeId = null;
  state.productId = null;
  log.info("Estado limpiado");
}

/**
 * Ejecutar todos los tests básicos
 */
async function runBasicTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Ejecutando Tests Básicos");
  console.log("=".repeat(60) + "\n");

  await checkServer();
  await testRegister();
  await testCreateStore();
  await testListStores();
  await testGetStore();
  await testUpdateStore();
  
  showState();
  
  log.info("Tests básicos completados");
  log.info("Para sincronizar productos, usa: testUpdateStoreCredentials(storeId, token)");
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Auth
  testRegister,
  testLogin,
  
  // Stores
  testCreateStore,
  testListStores,
  testGetStore,
  testUpdateStore,
  testUpdateStoreCredentials,
  testSyncProducts,
  testDeleteStore,
  
  // Products
  testListProducts,
  testSearchProducts,
  testFeaturedProducts,
  testProductStats,
  testProductDetails,
  
  // Utils
  checkServer,
  showState,
  clearState,
  runBasicTests,
  
  // State
  state,
};

// Mostrar ayuda si se ejecuta directamente
if (require.main === module) {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 API Testing Script - Modo Modular");
  console.log("=".repeat(60));
  console.log("\nPara usar este script, ejecútalo con Node.js:");
  console.log("\n  " + colors.cyan + "node" + colors.reset);
  console.log("  > const api = require('./test-api.js')");
  console.log("  > await api.testRegister()");
  console.log("  > await api.testCreateStore()");
  console.log("  > api.showState()");
  console.log("\nFunciones disponibles:");
  console.log("  " + colors.yellow + "Auth:" + colors.reset);
  console.log("    - testRegister(email?)");
  console.log("    - testLogin(email, password)");
  console.log("  " + colors.yellow + "Stores:" + colors.reset);
  console.log("    - testCreateStore(name?, url?)");
  console.log("    - testListStores(page?, limit?)");
  console.log("    - testGetStore(storeId?)");
  console.log("    - testUpdateStore(storeId?, updates?)");
  console.log("    - testUpdateStoreCredentials(tnStoreId, accessToken, storeId?)");
  console.log("    - testSyncProducts(storeId?)");
  console.log("    - testDeleteStore(storeId?)");
  console.log("  " + colors.yellow + "Products:" + colors.reset);
  console.log("    - testListProducts(tnStoreId?, filters?)");
  console.log("    - testSearchProducts(searchTerm, tnStoreId?)");
  console.log("    - testFeaturedProducts(tnStoreId?, limit?)");
  console.log("    - testProductStats(tnStoreId?)");
  console.log("    - testProductDetails(productId?, tnStoreId?)");
  console.log("  " + colors.yellow + "Utils:" + colors.reset);
  console.log("    - checkServer()");
  console.log("    - showState()");
  console.log("    - clearState()");
  console.log("    - runBasicTests()");
  console.log("\n" + "=".repeat(60) + "\n");
}