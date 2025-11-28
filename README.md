# 🛍️ Tiendanube Integration Backend

Backend para integración con Tiendanube (plataforma de e-commerce). Sistema de autenticación, sincronización de productos/categorías, y gestión de webhooks.

---

## 📋 Índice

- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Estado Actual](#-estado-actual-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Endpoints Principales](#-endpoints-principales)
- [Flujo OAuth](#-flujo-oauth)
- [Webhooks](#-webhooks)
- [Testing](#-testing)
- [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 🚀 Tecnologías

- **Node.js** + **TypeScript**
- **Express** 5.x
- **MongoDB** + **Mongoose**
- **JWT** para autenticación
- **bcryptjs** para encriptación
- **Nodemailer** para emails
- **Tiendanube API** v1

---

## 🏗️ Arquitectura

### Clean Architecture en Capas

```
src/
├── config/           # Configuración (JWT, bcrypt, envs)
├── data/            # Modelos de MongoDB
├── domain/          # Lógica de negocio
│   ├── dtos/        # Data Transfer Objects
│   ├── entities/    # Entidades de dominio
│   └── errors/      # Custom errors
├── presentation/    # Capa HTTP
│   ├── controllers/ # Controllers HTTP
│   ├── middlewares/ # Middlewares
│   ├── routes/      # Definición de rutas
│   └── services/    # Servicios de negocio
└── app.ts           # Entry point
```

### Patrón Entity-DTO

```
Request → Controller (INPUT DTO) → Service (ENTITY) → Controller (OUTPUT DTO/Entity) → Response
```

**Filosofía actual:**
- **Input DTOs**: Validación de datos entrantes
- **Entities**: Lógica de dominio y validaciones de negocio
- **Output**: Service retorna Entity (sin campos sensibles) - Opción A

---

## 📊 Estado Actual del Proyecto

### ✅ Implementado y Funcionando

#### Autenticación
- [x] Registro de usuarios con validación
- [x] Login con JWT
- [x] Verificación de email
- [x] Middleware de autenticación
- [x] Encriptación de passwords (bcrypt)

#### Tiendas
- [x] CRUD completo de tiendas
- [x] OAuth 2.0 con Tiendanube
- [x] Almacenamiento de credenciales
- [x] Verificación de tokens

#### Productos
- [x] Sincronización completa desde Tiendanube
- [x] Filtros avanzados (precio, stock, tags, búsqueda)
- [x] Ordenamiento múltiple
- [x] Paginación
- [x] Productos destacados
- [x] Búsqueda por texto
- [x] Productos relacionados (por tags)
- [x] Estadísticas de productos
- [x] Gestión de variantes e imágenes

#### Categorías
- [x] Sincronización desde Tiendanube
- [x] Árbol jerárquico
- [x] Relación con productos

#### Webhooks
- [x] Validación HMAC
- [x] Registro automático post-OAuth
- [x] Webhooks obligatorios:
  - `app/uninstalled`
  - `product/created`, `product/updated`, `product/deleted`
  - `category/created`, `category/updated`, `category/deleted`
- [x] Webhooks GDPR:
  - `app/suspended`
  - `customer/redact`
  - `customer/data_request`
  - `store/redact`
- [x] Debouncing para duplicados

### ⚠️ Áreas con Deuda Técnica

#### 1. Uso Inconsistente de DTOs (PRIORIDAD ALTA)

**Problema:**
- `ProductService` retorna documentos de Mongoose directamente
- `ProductController` no valida filtros con DTOs
- `TiendanubeProductService` no usa Entities al guardar

**Archivos afectados:**
- `src/presentation/services/product/product.service.ts`
- `src/presentation/controllers/product.controller.ts`
- `src/presentation/services/tiendanube/tiendanube-product.service.ts`

**Solución propuesta:**
```typescript
// ✅ DEBE SER ASÍ
const productsData = await ProductModel.find(query).lean();
const products = productsData.map(p => 
  ProductResponseDTO.fromEntity(ProductEntity.fromObject(p))
);
```

#### 2. Validación de Entrada Inconsistente

**Problema:**
- Algunos controllers validan manualmente
- Falta `ProductFiltersDTO` para validar query params

**Solución:**
- Crear DTOs para todos los inputs complejos
- Usar el patrón `[error, dto] = DTO.create(data)`

#### 3. CategoryService Sin DTOs de Respuesta

**Problema:**
- `CategoryService` retorna documentos raw
- No tiene `CategoryResponseDTO`

---

## 🔧 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.template .env
# Editar .env con tus credenciales

# Levantar MongoDB con Docker
docker-compose up -d

# Modo desarrollo
npm run dev

# Compilar
npm run build

# Producción
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URL=mongodb://mongo-user:123456@localhost:27017
MONGO_DB_NAME=my-store-db

# JWT
JWT_SECRET=tu_clave_secreta_super_segura

# Email (opcional)
SEND_EMAIL=false
MAILER_SERVICE=Gmail
MAILER_EMAIL=tu_email@gmail.com
MAILER_SECRET_KEY=tu_password_de_aplicacion

# URLs
WEBSERVICE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Tiendanube OAuth (CRÍTICO)
TIENDANUBE_CLIENT_ID=tu_app_id_de_tiendanube
TIENDANUBE_CLIENT_SECRET=tu_secret_de_tiendanube
```

### Obtener Credenciales de Tiendanube

1. Ir a [Tiendanube Partners](https://partners.tiendanube.com)
2. Crear una app
3. Configurar Redirect URL: `http://localhost:3000/api/auth/tiendanube/callback`
4. Copiar `Client ID` y `Client Secret`

---

## 🌐 Endpoints Principales

### Autenticación

```http
POST   /api/auth/register          # Registrar usuario
POST   /api/auth/login             # Login
GET    /api/auth/validate-email/:token  # Validar email
```

### OAuth Tiendanube

```http
GET    /api/auth/tiendanube/install    # Iniciar OAuth
GET    /api/auth/tiendanube/callback   # Callback OAuth
GET    /api/auth/tiendanube/status/:id # Estado conexión
```

### Tiendas

```http
POST   /api/stores                 # Crear tienda (DEPRECADO)
GET    /api/stores                 # Listar tiendas
GET    /api/stores/:id             # Obtener tienda
PUT    /api/stores/:id             # Actualizar tienda
DELETE /api/stores/:id             # Eliminar tienda

POST   /api/stores/:id/sync        # Sincronizar TODO
POST   /api/stores/:id/sync/products     # Solo productos
POST   /api/stores/:id/sync/categories   # Solo categorías
GET    /api/stores/:id/sync-status       # Estado sync
```

### Productos

```http
GET    /api/products/:storeId      # Listar con filtros
GET    /api/products/:storeId/:productId  # Detalles
GET    /api/products/:storeId/:productId/related  # Relacionados
GET    /api/products/:storeId/search?q=texto      # Buscar
GET    /api/products/:storeId/featured            # Destacados
GET    /api/products/:storeId/tags                # Tags
GET    /api/products/:storeId/category/:tag       # Por categoría
GET    /api/products/:storeId/price-range         # Rango precios
GET    /api/products/:storeId/stats               # Estadísticas
```

**Filtros disponibles:**
- `page`, `limit`: Paginación
- `published`: true/false
- `minPrice`, `maxPrice`: Rango de precios
- `inStock`: true/false
- `tags`: remera,ropa (separados por coma)
- `sort`: newest, oldest, price-asc, price-desc, name-asc, name-desc
- `search`: Término de búsqueda

### Webhooks

```http
# Webhooks obligatorios
POST   /api/webhooks/tiendanube/mandatory/app/uninstalled
POST   /api/webhooks/tiendanube/mandatory/product/create
POST   /api/webhooks/tiendanube/mandatory/product/update
POST   /api/webhooks/tiendanube/mandatory/product/delete
POST   /api/webhooks/tiendanube/mandatory/category/created
POST   /api/webhooks/tiendanube/mandatory/category/updated
POST   /api/webhooks/tiendanube/mandatory/category/deleted

# Webhooks GDPR
POST   /api/webhooks/tiendanube/gdpr/app/suspended
POST   /api/webhooks/tiendanube/gdpr/store/redact
POST   /api/webhooks/tiendanube/gdpr/customers/redact
POST   /api/webhooks/tiendanube/gdpr/customers/data_request
```

---

## 🔐 Flujo OAuth

### 1. Usuario Instala la App

```
Usuario hace clic en "Instalar App"
  ↓
GET /api/auth/tiendanube/install
  ↓
Redirige a Tiendanube para autorización
  ↓
Usuario acepta permisos
  ↓
Tiendanube redirige a /api/auth/tiendanube/callback?code=ABC123
```

### 2. Backend Procesa Callback

```typescript
1. Intercambiar code por access_token
2. Obtener info de la tienda
3. Crear/actualizar Store en MongoDB
4. Registrar webhooks automáticamente
5. Iniciar sincronización inicial (background)
6. Redirigir al usuario al frontend
```

### 3. Sincronización Post-OAuth

```
POST /api/stores/:id/sync
  ↓
Sincroniza productos Y categorías en paralelo
  ↓
Usuario puede consultar productos con filtros
```

---

## 🪝 Webhooks

### Validación HMAC

Todos los webhooks validan HMAC SHA256:

```typescript
const signature = crypto
  .createHmac('sha256', CLIENT_SECRET)
  .update(rawBody)
  .digest('base64');

if (signature !== req.headers['x-hmac-sha256']) {
  // ❌ Webhook inválido
}
```

### Webhooks Críticos

| Webhook | Acción | Importancia |
|---------|--------|-------------|
| `app/uninstalled` | Invalidar token | 🔴 CRÍTICO |
| `app/suspended` | Borrar TODO | 🔴 CRÍTICO |
| `product/*` | Sincronizar productos | 🟡 IMPORTANTE |
| `category/*` | Sincronizar categorías | 🟡 IMPORTANTE |

### Debouncing

Webhooks duplicados se agrupan con debounce de 2 segundos:

```typescript
webhookDebouncer.scheduleSync(storeId, productId, syncFunction);
```

---

## 🧪 Testing

### Script de Testing Modular

```bash
node
> const api = require('./src/test/test-api.js')

# Auth
> await api.testRegister()
> await api.testLogin('email@test.com', '123456')

# Stores
> await api.testCreateStore()
> await api.testListStores()
> await api.testSyncProducts()

# Products
> await api.testListProducts()
> await api.testSearchProducts('remera')
> await api.testProductStats()

# Utils
> api.showState()
> api.clearState()
```

---

## 📁 Estructura del Proyecto

```
src/
├── app.ts                          # Entry point
├── config/                         # Configuración
│   ├── bcrypt.adapter.ts
│   ├── jwt.adapter.ts
│   ├── envs.ts
│   └── regular-exp.ts
├── data/                           # Data Layer
│   └── mongo/
│       ├── mongo-database.ts
│       └── models/
│           ├── user.model.ts
│           ├── store.model.ts
│           ├── product.model.ts
│           ├── variant.model.ts
│           ├── image.model.ts
│           ├── category.model.ts
│           └── favorite.model.ts
├── domain/                         # Domain Layer
│   ├── dtos/
│   │   ├── auth/                   # ✅ Completos
│   │   │   ├── login-user.dto.ts
│   │   │   └── register-user.dto.ts
│   │   ├── product/                # ⚠️ Falta ProductFiltersDTO
│   │   │   ├── create-product.dto.ts
│   │   │   └── product-response.dto.ts
│   │   ├── store/                  # ✅ Completos
│   │   │   ├── create-store.dto.ts
│   │   │   ├── update-store.dto.ts
│   │   │   └── store-response.dto.ts
│   │   └── shared/
│   │       └── pagination.dto.ts   # ✅ Reutilizable
│   ├── entities/
│   │   ├── user/                   # ✅ Completo
│   │   │   └── user.entity.ts
│   │   ├── store/                  # ✅ Completo
│   │   │   └── store.entity.ts
│   │   ├── product/                # ✅ Completo
│   │   │   └── product.entity.ts
│   │   └── category/               # ✅ Completo
│   │       └── category.entity.ts
│   └── errors/
│       └── custom.error.ts
├── presentation/                   # Presentation Layer
│   ├── controllers/
│   │   ├── auth.controller.ts      # ✅ Usa DTOs correctamente
│   │   ├── product.controller.ts   # ⚠️ Falta validación con DTO
│   │   ├── store.controller.ts
│   │   ├── tiendanube-oauth.controller.ts
│   │   ├── mandatory-webhook.controller.ts
│   │   └── gdpr-webhook.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── tiendanube-hmac.middleware.ts
│   ├── routes/
│   │   ├── routes.ts               # Router principal
│   │   ├── auth.routes.ts
│   │   ├── store.routes.ts
│   │   ├── product.routes.ts
│   │   ├── tiendanube-oauth.routes.ts
│   │   ├── mandatory-webhook.routes.ts
│   │   └── gdpr-webhook.routes.ts
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.ts     # ✅ Usa Entity correctamente
│   │   │   └── email.service.ts
│   │   ├── store/
│   │   │   └── store.service.ts    # ✅ Usa DTOs
│   │   ├── product/
│   │   │   └── product.service.ts  # ⚠️ Retorna raw docs
│   │   └── tiendanube/
│   │       ├── tiendanube.service.ts           # Orquestador
│   │       ├── tiendanube-oauth.service.ts
│   │       ├── tiendanube-product.service.ts   # ⚠️ No usa Entity
│   │       ├── tiendanube-category.service.ts
│   │       └── tiendanube-webhooks.service.ts
│   ├── utils/
│   │   └── webhook-debouncer.ts
│   └── server.ts
└── test/
    └── test-api.js                 # Testing modular
```

---

## 🎯 Próximos Pasos (Roadmap)

### Prioridad Alta
- [ ] Refactorizar `ProductService` para retornar DTOs
- [ ] Crear `ProductFiltersDTO` para validación
- [ ] Refactorizar `TiendanubeProductService` para usar Entities
- [ ] Agregar tests unitarios (Jest)

### Prioridad Media
- [ ] Implementar rate limiting
- [ ] Agregar logging estructurado (Winston/Pino)
- [ ] Implementar cache (Redis) para productos
- [ ] Agregar health checks
- [ ] Documentación OpenAPI/Swagger

### Prioridad Baja
- [ ] Implementar favoritos
- [ ] Agregar soporte para imágenes
- [ ] Implementar búsqueda avanzada (Elasticsearch)
- [ ] Agregar métricas (Prometheus)

---

## 🐛 Problemas Conocidos

1. **ProductService retorna documentos raw** (ver sección Deuda Técnica)
2. **Webhooks duplicados durante testing** (solucionado con debouncer)
3. **Sin manejo de rate limits de Tiendanube** (TODO: implementar retry con backoff)

---

## 📚 Recursos

- [Tiendanube API Docs](https://tiendanube.github.io/api-documentation/)
- [Tiendanube Partners](https://partners.tiendanube.com)
- [MongoDB Docs](https://www.mongodb.com/docs/)
- [Express 5 Docs](https://expressjs.com/en/5x/api.html)

---

## 👤 Autor

**Daniel Ferreiro**

---

## 📝 Notas de Desarrollo

### Comandos Útiles

```bash
# Ver logs de MongoDB
docker-compose logs -f mongo-db

# Entrar a MongoDB
docker exec -it <container-id> mongosh -u mongo-user -p 123456

# Limpiar base de datos
db.dropDatabase()

# Ver colecciones
show collections

# Ver productos
db.products.find().pretty()
```

### Convenciones de Código

- **Nombres de archivo**: kebab-case (`product.service.ts`)
- **Clases**: PascalCase (`ProductService`)
- **Métodos/variables**: camelCase (`getProducts`)
- **Constantes**: UPPER_SNAKE_CASE (`BASE_API_URL`)
- **Interfaces**: PascalCase con prefijo I opcional (`IProduct` o `Product`)

### Git Workflow

```bash
# Feature branch
git checkout -b feature/nombre-feature

# Commit messages
feat: agregar filtro por precio
fix: corregir validación de email
refactor: mejorar ProductService
docs: actualizar README

# Push y PR
git push origin feature/nombre-feature
```

---

## ⚠️ Importante

- **NUNCA** commitear `.env` con credenciales reales
- **SIEMPRE** validar webhooks con HMAC
- **NUNCA** exponer passwords en responses
- **SIEMPRE** usar DTOs para inputs complejos
- **NUNCA** confiar en datos del cliente sin validar

---

**Versión:** 1.0.0  
**Última actualización:** 2024