import 'dotenv/config';
import { get } from 'env-var';

export const envs = {

  PORT: get('PORT').required().asPortNumber(),

  MONGO_URL: get('MONGO_URL').required().asString(),
  MONGO_DB_NAME: get('MONGO_DB_NAME').required().asString(),

  JWT_SECRET: get('JWT_SECRET').required().asString(),

  SEND_EMAIL: get('SEND_EMAIL').default('false').asBool(),
  MAILER_SERVICE: get('MAILER_SERVICE').required().asString(),
  MAILER_EMAIL: get('MAILER_EMAIL').required().asString(),
  MAILER_SECRET_KEY: get('MAILER_SECRET_KEY').required().asString(),

  // URLs
  WEBSERVICE_URL: get('WEBSERVICE_URL').required().asString(),
  FRONTEND_URL: get('FRONTEND_URL').default('http://localhost:3000').asString(),

    // Tiendanube OAuth
  TIENDANUBE_CLIENT_ID: get('TIENDANUBE_CLIENT_ID').asString(),
  TIENDANUBE_CLIENT_SECRET: get('TIENDANUBE_CLIENT_SECRET').asString(),

}
