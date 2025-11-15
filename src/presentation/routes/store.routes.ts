import { Router } from 'express';
import { StoreService } from '../services/store/store.service';
import { StoreController } from '../controllers/store.controller';
import { TiendanubeService } from '../services/tiendanube/tiendanube.service';


export class StoreRoutes {

  static get routes(): Router {
    
    const storeService = new StoreService();
    const tiendanubeService = new TiendanubeService();

    const controller = new StoreController( storeService, tiendanubeService );

    const router = Router();
    
    router.post('/stores', controller.createStore );
    router.get('/stores', controller.getStores );
    router.get('/stores/:id', controller.getStoreById );
    router.put('/stores/:id', controller.updateStore );
    router.delete('/stores/:id', controller.deleteStore );

    router.post('/stores/:id/sync', controller.syncProducts );

    router.get('/stores/:id/products', controller.getStoreProducts );
    router.get('/stores/:id/products/:id', controller.getProductDetails );

    return router;
  }


}

