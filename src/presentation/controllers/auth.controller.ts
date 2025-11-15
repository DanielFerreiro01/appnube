import { Request, Response } from "express";
import { CustomError, LoginUserDto, RegisterUserDto } from "../../domain";
import { AuthService } from "../services/auth/auth.service";


export class AuthController {

    // Inyecciones de dependencias
    constructor(
        public readonly authService: AuthService,
    ) { }

    private handleError = (error: unknown, res: Response ) => {
        if ( error instanceof CustomError ) {
        return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        return res.status(500).json({ error: 'Internal server error' })
    } 


    registerUser = async (req: Request, res: Response) => {
        const [error, registerDto] = RegisterUserDto.create(req.body);
        
        if (error) return res.status(400).json({ error });

        try {
            const user = await this.authService.registerUser(registerDto!);
            return res.status(201).json( user );
        } catch (error) {
            this.handleError(error, res);
        }
    }

    loginUser = async ( req: Request, res: Response ) => { 
        const [error, loginUserDto] = LoginUserDto.create(req.body);
        
        if (error) return res.status(400).json({ error });

        try {
            const user = await this.authService.loginUser(loginUserDto!);
            return res.status(200).json( user );
        } catch (error) {
            this.handleError(error, res);
        }

    }

    validateEmail = ( req: Request, res: Response ) => { 
        const { token } = req.params;
       
        this.authService.validateEmail(token)
            .then( () => res.json({ message: 'Email validated successfully' }) )
            .catch( error => this.handleError(error, res));
        
    }


}