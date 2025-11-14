# 🧩 Node Auth Template

Plantilla base para proyectos en Node.js con autenticación lista para usar. Incluye registro, login, validación de tokens JWT, manejo de roles y estructura modular lista para escalar.

## 🚀 Características principales

* 🔐 Autenticación JWT (registro, login y protección de rutas)
* 🔒 Encriptación de contraseñas con `bcryptjs`
* 📧 Verificación de email con `nodemailer`
* 🧱 Arquitectura limpia con separación por capas (`application`, `domain`, `presentation`, `config`)
* 🧩 Sistema de roles (por ejemplo: `admin`, `user`)
* ✉️ Servicio de envío de emails integrado
* ⚙️ Configuración lista para entorno de desarrollo y producción

## 🧠 Estructura del proyecto

```
src/
├── application/
│   └── auth/
│       ├── auth.service.ts
│       └── email.service.ts
├── config/
│   ├── bcrypt.adapter.ts
│   ├── envs.ts
│   ├── jwt.adapter.ts
│   └── regular-exp.ts
├── data/
│   └── UserModel.ts         # Template básico - Personalizar según tu DB
├── domain/
│   ├── dtos/
│   │   └── auth/
│   │       ├── login-user.dto.ts
│   │       └── register-user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── errors/
│       ├── custom.error.ts
│       └── index.ts
├── presentation/
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── routes.ts
│   └── server.ts
└── app.ts

```

## 🪄 Scripts disponibles

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start
```

## 🔧 Variables de entorno (.env)

Ejemplo de configuración mínima:

```env
PORT=3000
JWT_SECRET=tu_clave_secreta
WEBSERVICE_URL=http://localhost:3000

# Nodemailer - Configuración de email
MAILER_SERVICE=gmail
MAILER_EMAIL=tu_email@gmail.com
MAILER_SECRET_KEY=tu_contraseña_de_aplicacion
```

## 🧰 Tecnologías usadas

* Node.js
* Express
* TypeScript
* JWT
* bcryptjs
* nodemailer
* dotenv

## 🧪 Rutas principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/protected` | Ruta protegida (requiere token) |

## 🧩 Cómo usar esta plantilla

1. Cloná este repositorio:

```bash
git clone https://github.com/tuusuario/node-auth-template.git
```

2. Eliminá el control de versiones y creá tu nuevo repo:

```bash
rm -rf .git
git init
git remote add origin https://github.com/tuusuario/mi-nuevo-proyecto.git
git add .
git commit -m "Init project from template"
git push -u origin main
```

3. **Importante**: Implementá tu propia capa de datos:

El archivo `src/data/UserModel.ts` es un template básico que deberás reemplazar con tu propia implementación según la base de datos que uses (MongoDB, PostgreSQL, MySQL, etc.). El template incluye la interfaz mínima requerida para que `AuthService` funcione correctamente.

**Métodos requeridos en tu UserModel:**
- `findOne({ email })` - Buscar usuario por email
- `save()` - Guardar/actualizar usuario
- Propiedades: `id`, `email`, `password`, `emailVerified`

Podés implementarlo con Mongoose, Prisma, TypeORM, o cualquier ORM/ODM de tu preferencia.

## 🧑‍💻 Autor

**Daniel Ferreiro**  
[GitHub](https://github.com/tuusuario)