import { CustomError } from "../../errors/custom.error";

export class UserEntity {

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: string,
        public readonly emailVerified: boolean,
        public readonly password: string,
        public readonly role: string[],
        public readonly img?: string,
        public readonly favorites: string[] = [],
        public readonly createdAt?: Date,
    ) {}

    static fromObject( obj: { [key: string]: any } ) {
        const { id, _id, name, email, emailVerified, password, role, img, favorites } = obj;

        if( !_id && !id ) throw CustomError.badRequest

        if( !name ) throw CustomError.badRequest('Name is required');

        if( !email ) throw CustomError.badRequest('Email is required');
        
        if ( emailVerified === undefined ) throw CustomError.badRequest('Email verification status is required');

        if( !password ) throw CustomError.badRequest('Password is required');

        if (!Array.isArray(role)) throw CustomError.badRequest('Role must be an array');

        if( !role ) throw CustomError.badRequest('Role is required');

        return new UserEntity( _id || id , name, email, emailVerified, password, role, img, favorites, new Date(), );
    }

}