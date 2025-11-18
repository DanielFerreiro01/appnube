import { envs } from "./config/envs";
import { MongoDatabase } from "./data/mongo";
import { AppRoutes } from "./presentation/routes/routes";
import { Server } from "./presentation/server";


(async()=> {
    main();
})();

async function main() {

    await MongoDatabase.connect({
        dbName: envs.MONGO_DB_NAME,
        mongoUrl: envs.MONGO_URL,
    });
    
    const server = new Server({
        port: envs.PORT,
        routes: AppRoutes.routes,
    })

    server.start();

    const api = require('./test/test-api.js');

    // Test básicos
    await api.testRegister();
    await api.testCreateStore();
    await api.testListStores();

    // Ver estado
    api.showState();

}