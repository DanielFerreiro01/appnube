import { Router } from 'express';
import { AuthController } from '../controllers';

import { envs } from '../../config';
import { AuthService, EmailService } from '../../presentation/services/auth';



export class AuthRoutes {

  static get routes(): Router {
    const emailService = new EmailService(
      envs.MAILER_SERVICE,
      envs.MAILER_EMAIL,
      envs.MAILER_SECRET_KEY,
      envs.SEND_EMAIL,
    );

    const authService = new AuthService( emailService);

    const controller = new AuthController( authService );

    const router = Router();
    
    router.post('/login', controller.loginUser );
    router.post('/register', controller.registerUser );

    router.get('/validate-email/:token', controller.validateEmail );



    return router;
  }


}

