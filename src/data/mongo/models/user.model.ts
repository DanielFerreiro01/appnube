import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'] 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true 
    },
    emailVerified: { 
        type: Boolean, 
        default: false
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'] 
    },
    img: { 
        type: String 
    },
    role: { 
        type: [String], 
        enum: ['ADMIN_ROLE', 'USER_ROLE'],
        default: ['USER_ROLE'] 
    },
});

userSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function ( doc, ret, options ) {
        delete (ret as any)._id;
        delete (ret as any).password; 
    },
});

export const UserModel = mongoose.model('User', userSchema);