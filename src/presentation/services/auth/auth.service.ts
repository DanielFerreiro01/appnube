import { bcryptAdapter, envs, JWTAdapter } from "../../../config";
import { UserModel } from "../../../data/mongo";
import type { IUser, IUserDocument } from "../../../data/mongo/models/user.model";
import { CustomError, LoginUserDto, RegisterUserDto, UserEntity } from "../../../domain";
import { EmailService } from "./email.service";


export class AuthService {

    constructor(
        private readonly emailService: EmailService,
    ) {}

    public async registerUser( registerUserDto: RegisterUserDto ) {

        const existUser: IUserDocument | null = await UserModel.findOne({ email: registerUserDto.email });
        if (existUser) throw CustomError.badRequest('Email already in use');
        
        try {
            const newUser = new UserModel(registerUserDto);
            
            newUser.password = await bcryptAdapter.hash( registerUserDto.password );
            
            await newUser.save();

            await this.sendConfirmationEmail( newUser.email ).catch( console.log );

            const { password, ...userEntity } = UserEntity.fromObject(newUser);

            const token = await JWTAdapter.generateToken({ id: newUser.id });
            if ( !token ) throw CustomError.internalServerError('Error generating token');

            return {
                user: userEntity,
                token: token,
            };
            
        } catch (error) {
            throw CustomError.internalServerError(`Error registering user: ${error}`);
        }


    } 

    public async loginUser( loginUserDto: LoginUserDto ) {

        const user: IUserDocument | null = await UserModel.findOne({ email: loginUserDto.email });
        if (!user) throw CustomError.badRequest('Email or password incorrect');

        const isMatching = await bcryptAdapter.compare( loginUserDto.password, user.password );
        if(  !isMatching ) throw CustomError.unauthorized('Email or password incorrect');

        const { password, ...userEntity } = UserEntity.fromObject(user);

        const token = await JWTAdapter.generateToken({ id: user.id, email: user.email });
        if ( !token ) throw CustomError.internalServerError('Error generating token');
        
        return {
            user: userEntity,
            token: token,
        };
        
    }

    private sendConfirmationEmail = async ( email: string ) => {
        const token = await JWTAdapter.generateToken({ email });
        if ( !token ) throw CustomError.internalServerError('Error generating token for email confirmation');

        const confirmUrl = `${envs.WEBSERVICE_URL}/auth/validate-email/${ token }`;

        const html = `
            <h1>Welcome to Our App</h1>
            <p>Thank you for registering. Please confirm your email by clicking the link below:</p>
            <a href="${ confirmUrl }">Confirm Email</a>
            <p>If you did not register, please ignore this email.</p>
        `;
        
        const options = {
            to: email,
            subject: 'Please confirm your email',
            htmlBody: html,
        }

        const isSent = await this.emailService.sendEmail(options);
        if ( !isSent ) throw CustomError.internalServerError('Error sending confirmation email');

        return true;
    }

    public validateEmail = async ( token: string ) => {
        const payload = await JWTAdapter.validateToken( token );
        if ( !payload ) throw CustomError.unauthorized('Invalid or expired token');

        const { email } = payload as { email: string };
        if ( !email ) throw CustomError.internalServerError('Token payload does not contain email');

        const user: IUserDocument | null = await UserModel.findOne({ email });
        if ( !user ) throw CustomError.internalServerError('User not found');

        user.emailVerified = true;
        await user.save();
        
        return true;
    }

}