import mongoose from "mongoose";

interface Options {
    mongoUrl: string;
    dbName: string;
}

export class MongoDatabase {

    static async connect( options: Options ) {
        const { mongoUrl, dbName } = options;

        try {
            await mongoose.connect( mongoUrl, { dbName } );

            return true;
        } catch (error) {
            console.error('Error al conectar a la base de datos MongoDB', error);
            throw error;
        }
    }

    static async disconnect() {
        try {
            await mongoose.disconnect();
            return true;
        } catch (error) {
            console.error('Error al desconectar de la base de datos MongoDB', error);
            throw error;
        }
    }
}