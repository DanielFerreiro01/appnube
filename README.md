# Tiendanube Integration Backend

Backend para integración con Tiendanube. Sistema de autenticación, sincronización de productos/categorías y gestión de webhooks.

## Tecnologías

- Node.js + TypeScript
- Express 5.x
- MongoDB + Mongoose
- JWT / bcryptjs / Nodemailer
- Tiendanube API v1

## Instalación

```bash
git clone <repo-url>
cd backend
npm install
cp .env.template .env
docker-compose up -d
npm run dev
```

## Configuración

```env
PORT=3000
NODE_ENV=development
MONGO_URL=mongodb://mongo-user:123456@localhost:27017
MONGO_DB_NAME=my-store-db
JWT_SECRET=tu_clave_secreta
SEND_EMAIL=false
MAILER_SERVICE=Gmail
MAILER_EMAIL=tu_email@gmail.com
MAILER_SECRET_KEY=tu_password_de_aplicacion
WEBSERVICE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
TIENDANUBE_CLIENT_ID=tu_app_id
TIENDANUBE_CLIENT_SECRET=tu_secret
```

Para obtener las credenciales de Tiendanube, crear una app en [Tiendanube Partners](https://partners.tiendanube.com) con redirect URL `http://localhost:3000/api/auth/tiendanube/callback`.

## Arquitectura

```
src/
├── config/
├── data/
├── domain/
│   ├── dtos/
│   ├── entities/
│   └── errors/
├── presentation/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── services/
└── app.ts
```

## Endpoints

### Auth
```
POST  /api/auth/register
POST  /api/auth/login
GET   /api/auth/validate-email/:token
GET   /api/auth/tiendanube/install
GET   /api/auth/tiendanube/callback
GET   /api/auth/tiendanube/status/:id
```

### Tiendas
```
GET    /api/stores
GET    /api/stores/:id
PUT    /api/stores/:id
DELETE /api/stores/:id
POST   /api/stores/:id/sync
POST   /api/stores/:id/sync/products
POST   /api/stores/:id/sync/categories
GET    /api/stores/:id/sync-status
```

### Productos
```
GET /api/products/:storeId
GET /api/products/:storeId/:productId
GET /api/products/:storeId/:productId/related
GET /api/products/:storeId/search?q=texto
GET /api/products/:storeId/featured
GET /api/products/:storeId/stats
```

Filtros: `page`, `limit`, `published`, `minPrice`, `maxPrice`, `inStock`, `tags`, `sort`, `search`.

### Webhooks
```
POST /api/webhooks/tiendanube/mandatory/app/uninstalled
POST /api/webhooks/tiendanube/mandatory/product/create
POST /api/webhooks/tiendanube/mandatory/product/update
POST /api/webhooks/tiendanube/mandatory/product/delete
POST /api/webhooks/tiendanube/mandatory/category/created
POST /api/webhooks/tiendanube/mandatory/category/updated
POST /api/webhooks/tiendanube/mandatory/category/deleted
POST /api/webhooks/tiendanube/gdpr/app/suspended
POST /api/webhooks/tiendanube/gdpr/store/redact
POST /api/webhooks/tiendanube/gdpr/customers/redact
POST /api/webhooks/tiendanube/gdpr/customers/data_request
```

## Flujo OAuth

1. `GET /api/auth/tiendanube/install` redirige a Tiendanube
2. El usuario acepta permisos
3. Tiendanube llama al callback con `?code=...`
4. El backend intercambia el code por un token, crea la tienda en MongoDB, registra webhooks e inicia sincronización

## Webhooks

Todos validan HMAC SHA256:

```typescript
const signature = crypto
  .createHmac('sha256', CLIENT_SECRET)
  .update(rawBody)
  .digest('base64');
```

Webhooks duplicados se agrupan con debounce de 2 segundos.

## Recursos

- [Tiendanube API Docs](https://tiendanube.github.io/api-documentation/)
- [Tiendanube Partners](https://partners.tiendanube.com)
