# 🤖 Instrucciones para Agente de IA - Backend Tiendanube

## 📋 Contexto del Proyecto

Estás trabajando en un **backend Node.js + TypeScript** para integración con **Tiendanube** (plataforma de e-commerce). El proyecto usa:

- **Arquitectura limpia** con separación en capas (config, data, domain, presentation)
- **MongoDB + Mongoose** para persistencia
- **Express 5** para HTTP
- **JWT** para autenticación
- **OAuth 2.0** para conectar con Tiendanube
- **Webhooks** con validación HMAC para sincronización en tiempo real

---

## 🎯 Tu Misión Principal

Ayudar a **refactorizar y mejorar** el código siguiendo las mejores prácticas de Clean Architecture, con especial énfasis en:

1. **Uso correcto de DTOs y Entities**
2. **Validación consistente de inputs**
3. **Separación de responsabilidades**
4. **Código mantenible y escalable**

---

## 🏗️ Arquitectura y Patrones Actuales

### Patrón Entity-DTO (MUY IMPORTANTE)

```
Request → Controller (INPUT DTO) → Service (ENTITY) → Response (Entity sin campos sensibles)
```

**Filosofía del proyecto:**

1. **INPUT DTOs**: Validan datos que llegan del cliente
   ```typescript
   const [error, loginDto] = LoginUserDto.create(req.body);
   if (error) return res.status(400).json({ error });
   ```

2. **Entities**: Lógica de dominio y validaciones de negocio
   ```typescript
   const userEntity = UserEntity.fromObject(user);
   ```

3. **OUTPUT**: Service retorna **Entity sin campos sensibles** (Opción A)
   ```typescript
   const { password, ...userEntity } = UserEntity.fromObject(user);
   return { user: userEntity, token };
   ```

4. **Controller**: Solo maneja HTTP, NO transforma datos
   ```typescript
   const result = await this.service.method(dto);
   return res.json(result); // Express serializa automáticamente
   ```

### ⚠️ Patrón Actual vs Patrón Objetivo

| Componente | ❌ Evitar | ✅ Hacer |
|------------|-----------|----------|
| **Controller** | Construir objetos manualmente | Validar con DTOs |
| **Service** | Retornar documentos Mongoose raw | Retornar Entities/DTOs |
| **Service** | Guardar sin validar | Pasar por Entity primero |

---

## 📊 Estado Actual - Áreas con Deuda Técnica

### 🔴 PRIORIDAD ALTA - Problemas Críticos

#### 1. ProductService retorna documentos raw

**Archivo:** `src/presentation/services/product/product.service.ts`

**Problema:**
```typescript
// ❌ ACTUAL (INCORRECTO)
const [products, total] = await Promise.all([
  ProductModel.find(query).lean(),
  ProductModel.countDocuments(query),
]);

return {
  products, // ❌ Retorna array raw
  pagination: { ... }
};
```

**Solución esperada:**
```typescript
// ✅ CORRECTO
const [productsData, total] = await Promise.all([
  ProductModel.find(query).lean(),
  ProductModel.countDocuments(query),
]);

// Transformar a Entity y luego a DTO (o solo Entity)
const products = productsData.map(p => 
  ProductResponseDTO.fromEntity(ProductEntity.fromObject(p))
);

return {
  products,
  pagination: { ... }
};
```

#### 2. ProductController no valida con DTOs

**Archivo:** `src/presentation/controllers/product.controller.ts`

**Problema:**
```typescript
// ❌ ACTUAL (INCORRECTO)
getProducts = async (req: Request, res: Response) => {
  const filters: any = {
    storeId: Number(storeId),
  };
  
  if (published !== undefined) {
    filters.published = published === "true";
  }
  // ... construye manualmente
```

**Solución esperada:**
```typescript
// ✅ CORRECTO
// 1. Crear ProductFiltersDTO en src/domain/dtos/product/
export class ProductFiltersDTO {
  constructor(
    public readonly storeId: number,
    public readonly published?: boolean,
    public readonly minPrice?: number,
    // ...
  ) {}

  static create(params: any): [string?, ProductFiltersDTO?] {
    // Validaciones aquí
  }
}

// 2. Usar en controller
getProducts = async (req: Request, res: Response) => {
  const [error, filtersDto] = ProductFiltersDTO.create({
    storeId: req.params.storeId,
    ...req.query
  });
  
  if (error) return res.status(400).json({ error });
  
  const result = await this.service.getProducts(filtersDto!, paginationDto!);
  return res.json(result);
};
```

#### 3. TiendanubeProductService no usa Entities

**Archivo:** `src/presentation/services/tiendanube/tiendanube-product.service.ts`

**Problema:**
```typescript
// ❌ ACTUAL (INCORRECTO)
await ProductModel.findOneAndUpdate(
  { storeId, productId: tnProduct.id },
  {
    storeId,
    productId: tnProduct.id,
    name: tnProduct.name.es || tnProduct.name,
    // ... mapeo manual
  }
);
```

**Solución esperada:**
```typescript
// ✅ CORRECTO
// 1. Transformar datos de Tiendanube a un objeto plano
const productData = {
  storeId,
  productId: tnProduct.id,
  name: tnProduct.name.es || tnProduct.name,
  // ...
};

// 2. Validar con Entity
const productEntity = ProductEntity.fromObject(productData);

// 3. Guardar
await ProductModel.findOneAndUpdate(
  { storeId, productId: tnProduct.id },
  productEntity,
  { upsert: true }
);
```

---

## 🟡 PRIORIDAD MEDIA

### 4. CategoryService sin DTOs de respuesta

**Archivos:**
- `src/presentation/services/tiendanube/tiendanube-category.service.ts`
- `src/domain/dtos/category/` (crear)

**Acción:** Aplicar el mismo patrón que productos.

### 5. Validación inconsistente en otros controllers

**Acción:** Revisar todos los controllers y asegurar que validen con DTOs.

---

## 📝 Reglas de Código (MUY IMPORTANTE)

### ✅ SIEMPRE hacer:

1. **Validar inputs con DTOs**
   ```typescript
   const [error, dto] = SomeDTO.create(data);
   if (error) return res.status(400).json({ error });
   ```

2. **Usar Entities para validaciones de dominio**
   ```typescript
   const entity = EntityName.fromObject(data);
   ```

3. **Retornar Entities sin campos sensibles**
   ```typescript
   const { password, ...userEntity } = UserEntity.fromObject(user);
   return userEntity;
   ```

4. **Mantener Controllers simples**
   ```typescript
   // Controller solo debe: validar, llamar service, responder
   const [error, dto] = DTO.create(req.body);
   if (error) return res.status(400).json({ error });
   
   const result = await this.service.method(dto);
   return res.json(result);
   ```

5. **Services con lógica de negocio**
   ```typescript
   // Service debe: usar entities, aplicar reglas de negocio
   const entity = Entity.fromObject(data);
   // ... lógica aquí
   return entity;
   ```

### ❌ NUNCA hacer:

1. **NO construir objetos manualmente en controllers**
   ```typescript
   // ❌ MAL
   const filters: any = { 
     storeId: Number(storeId),
     published: published === "true"
   };
   ```

2. **NO retornar documentos de Mongoose sin transformar**
   ```typescript
   // ❌ MAL
   const products = await ProductModel.find(query).lean();
   return products; // Sin transformar a Entity
   ```

3. **NO exponer campos sensibles**
   ```typescript
   // ❌ MAL
   return user; // Incluye password
   
   // ✅ BIEN
   const { password, ...userEntity } = UserEntity.fromObject(user);
   return userEntity;
   ```

4. **NO mezclar lógica de negocio en controllers**
   ```typescript
   // ❌ MAL
   if (user.role.includes('ADMIN')) { ... }
   
   // ✅ BIEN (en Service)
   if (userEntity.isAdmin()) { ... }
   ```

5. **NO guardar en DB sin pasar por Entity**
   ```typescript
   // ❌ MAL
   await Model.create({ name: data.name, ... });
   
   // ✅ BIEN
   const entity = Entity.fromObject(data);
   await Model.create(entity);
   ```

---

## 🛠️ Tareas Específicas

### Tarea 1: Refactorizar ProductService

**Objetivo:** Hacer que todos los métodos retornen DTOs/Entities en vez de documentos raw.

**Archivos:**
- `src/presentation/services/product/product.service.ts`
- `src/domain/dtos/product/product-response.dto.ts` (ya existe)

**Pasos:**
1. En cada método que retorne productos, agregar:
   ```typescript
   const products = productsData.map(p => 
     ProductResponseDTO.fromEntity(ProductEntity.fromObject(p))
   );
   ```
2. Aplicar a: `getProducts`, `getProductById`, `searchProducts`, `getProductsByTag`, `getFeaturedProducts`, `getRelatedProducts`

### Tarea 2: Crear ProductFiltersDTO

**Objetivo:** Validar query params en vez de construirlos manualmente.

**Archivos:**
- `src/domain/dtos/product/product-filters.dto.ts` (CREAR)

**Estructura esperada:**
```typescript
export class ProductFiltersDTO {
  constructor(
    public readonly storeId: number,
    public readonly published?: boolean,
    public readonly minPrice?: number,
    public readonly maxPrice?: number,
    public readonly inStock?: boolean,
    public readonly tags?: string[],
    public readonly searchTerm?: string
  ) {}

  static create(params: any): [string?, ProductFiltersDTO?] {
    const { storeId, published, minPrice, maxPrice, inStock, tags, searchTerm } = params;

    // Validaciones
    if (!storeId || isNaN(Number(storeId))) {
      return ['Store ID is required and must be a number'];
    }

    if (minPrice !== undefined && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
      return ['Min price must be a positive number'];
    }

    // ... más validaciones

    return [
      undefined,
      new ProductFiltersDTO(
        Number(storeId),
        published !== undefined ? published === 'true' : undefined,
        minPrice !== undefined ? Number(minPrice) : undefined,
        // ...
      )
    ];
  }
}
```

### Tarea 3: Refactorizar ProductController

**Objetivo:** Usar ProductFiltersDTO para validar.

**Archivo:** `src/presentation/controllers/product.controller.ts`

**Cambios:**
```typescript
getProducts = async (req: Request, res: Response) => {
  // Usar DTO para validar
  const [filterError, filtersDto] = ProductFiltersDTO.create({
    storeId: req.params.storeId,
    ...req.query
  });

  if (filterError) return res.status(400).json({ error: filterError });

  const [paginationError, paginationDto] = PaginationDto.create(
    Number(req.query.page || 1),
    Number(req.query.limit || 20)
  );

  if (paginationError) return res.status(400).json({ error: paginationError });

  try {
    const result = await this.productService.getProducts(
      filtersDto!,
      paginationDto!,
      req.query.sort as any
    );
    return res.json(result);
  } catch (error) {
    this.handleError(error, res);
  }
};
```

### Tarea 4: Refactorizar TiendanubeProductService

**Objetivo:** Usar ProductEntity antes de guardar.

**Archivo:** `src/presentation/services/tiendanube/tiendanube-product.service.ts`

**Cambios en método `saveProduct`:**
```typescript
private async saveProduct(storeId: number, tnProduct: TiendanubeProduct) {
  // 1. Transformar datos de Tiendanube
  const productData = {
    id: undefined, // MongoDB generará el _id
    storeId,
    productId: tnProduct.id,
    name: tnProduct.name.es || tnProduct.name,
    // ... resto de mapeo
  };

  // 2. Validar con Entity
  const productEntity = ProductEntity.fromObject(productData);

  // 3. Guardar (Entity ya está validado)
  await ProductModel.findOneAndUpdate(
    { storeId, productId: tnProduct.id },
    productEntity,
    { upsert: true, new: true }
  );
}
```

---

## 🎨 Estilo de Código

### Naming Conventions

```typescript
// Archivos: kebab-case
product.service.ts
product-response.dto.ts

// Clases: PascalCase
class ProductService {}
class ProductResponseDTO {}

// Métodos/variables: camelCase
getProducts()
const userEntity = ...

// Constantes: UPPER_SNAKE_CASE
const BASE_API_URL = "...";

// Interfaces: PascalCase (con o sin I)
interface Product {}
interface IProduct {}
```

### Imports

```typescript
// 1. Node modules
import { Request, Response } from "express";

// 2. Config/data
import { CustomError } from "../../domain";
import { ProductModel } from "../../data/mongo";

// 3. Domain (DTOs, Entities)
import { ProductEntity } from "../../domain/entities/product/product.entity";
import { ProductResponseDTO } from "../../domain/dtos/product/product-response.dto";

// 4. Services
import { ProductService } from "../services/product/product.service";
```

### Error Handling

```typescript
// En Services: throw CustomError
if (!user) {
  throw CustomError.notFound("User not found");
}

// En Controllers: catch y usar handleError
try {
  const result = await this.service.method();
  return res.json(result);
} catch (error) {
  this.handleError(error, res);
}
```

---

## 🔍 Criterios de Revisión

Antes de considerar una tarea completa, verifica:

### ✅ Checklist de Calidad

- [ ] **DTOs usados para validar inputs**
- [ ] **Entities usados para lógica de dominio**
- [ ] **Services retornan Entities (sin campos sensibles)**
- [ ] **Controllers NO tienen lógica de negocio**
- [ ] **NO se exponen documentos de Mongoose directamente**
- [ ] **Campos sensibles eliminados (password, tokens)**
- [ ] **Validaciones explícitas con mensajes claros**
- [ ] **Error handling consistente**
- [ ] **Imports organizados**
- [ ] **Naming conventions respetadas**

---

## 💡 Tips para el Desarrollo

### Cuando crees un nuevo DTO

1. Siempre incluir método `static create()`
2. Validar todos los campos obligatorios
3. Validar tipos y rangos
4. Retornar `[error?, dto?]`

### Cuando crees una nueva Entity

1. Constructor con `readonly` para inmutabilidad
2. Método `static fromObject()` con validaciones
3. Métodos de negocio si aplica (ej: `isAdmin()`)
4. Lanzar `CustomError` en validaciones

### Cuando modifiques un Service

1. Verificar que retorne Entity o DTO
2. Eliminar campos sensibles antes de retornar
3. Usar Entity para validaciones de dominio
4. Mantener lógica de negocio acá

### Cuando modifiques un Controller

1. Solo debe validar, llamar service, responder
2. Usar DTOs para validar inputs
3. NO construir objetos manualmente
4. NO incluir lógica de negocio

---

## 🚨 Casos Especiales

### Webhooks

- **SIEMPRE** validar HMAC antes de procesar
- **SIEMPRE** responder 200 inmediatamente
- Procesar en background con debouncer
- Usar `webhookDebouncer.scheduleSync()` para evitar duplicados

### OAuth

- **NUNCA** exponer `client_secret` en responses
- **SIEMPRE** guardar `accessToken` encriptado (opcional)
- Registrar webhooks automáticamente post-OAuth
- Iniciar sincronización en background

### Sincronización

- Usar `lean()` en queries grandes para performance
- Paginar requests a Tiendanube (50 items/página)
- Rate limiting: esperar 300ms entre requests
- Guardar errores en `syncError` field

---

## 📚 Referencias Rápidas

### Estructura de Archivos

```
src/domain/dtos/[recurso]/
  ├── create-[recurso].dto.ts       # Input para crear
  ├── update-[recurso].dto.ts       # Input para actualizar
  ├── [recurso]-filters.dto.ts      # Input para filtros
  └── [recurso]-response.dto.ts     # Output

src/domain/entities/[recurso]/
  └── [recurso].entity.ts

src/presentation/services/[recurso]/
  └── [recurso].service.ts

src/presentation/controllers/
  └── [recurso].controller.ts
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Testing
node
> const api = require('./src/test/test-api.js')
> await api.runBasicTests()

# MongoDB
docker-compose up -d
docker-compose logs -f mongo-db
```

---

## 🎯 Resumen Ejecutivo

**Tu objetivo:** Asegurar que TODOS los Services retornen Entities/DTOs y que TODOS los Controllers validen con DTOs.

**Prioridad:**
1. 🔴 ProductService + ProductController + ProductFiltersDTO
2. 🔴 TiendanubeProductService
3. 🟡 CategoryService
4. 🟡 Otros controllers

**Patrón a seguir:**
```
Request → Controller (validar con DTO) → Service (usar Entity) → Controller → Response
```

**Recordatorio clave:**
- Input → DTO
- Lógica → Entity
- Output → Entity (sin sensibles) o DTO
- Controller → Solo orquesta

---

## ❓ Ante Dudas

Si algo no está claro:

1. **Revisa AuthService**: Es el ejemplo perfecto de cómo debe ser
2. **Lee el README.md**: Tiene toda la info del proyecto
3. **Busca en el código**: `UserEntity`, `LoginUserDto`, `AuthService`, `AuthController`
4. **Pregunta**: "¿Este código sigue el patrón de AuthService?"

---

**¡Manos a la obra! 🚀**