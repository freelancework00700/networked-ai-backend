import { AccountType } from "../types/enums";

/** Schema to validate social login. */
export const socialLoginSchema = {
    type: 'object',
    properties: {
        firebase_token: {
            type: 'string',
            minLength: 1
        }
    },
    required: ['firebase_token'],
    additionalProperties: false,
};

/** Schema to validate user login. */
export const loginSchema = {
    type: 'object',
    properties: {
        mobile: {
            type: 'string',
            minLength: 6
        },
        otp: {
            type: 'string',
            minLength: 6,
            maxLength: 6,
            pattern: '^[0-9]{6}$'
        },
        email: {
            type: 'string',
            format: 'email',
            minLength: 1
        },
        password: {
            type: 'string',
            minLength: 6
        },
        bearer_token: {
            type: 'string',
            minLength: 1
        }
    },
    oneOf: [
        // Phone login: requires mobile + otp
        {
            required: ['mobile', 'otp']
        },
        // Email/Password login: requires email + password
        {
            required: ['email', 'password']
        },
        {
            required: ['bearer_token']
        }
    ],
    additionalProperties: false,
};

/** Schema to validate sending verification OTP (email or mobile). */
export const sendVerificationOTPSchema = {
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email',
            minLength: 1
        },
        mobile: {
            type: 'string',
            minLength: 6
        }
    },
    anyOf: [
        { required: ['email'] },
        { required: ['mobile'] }
    ],
    additionalProperties: false,
};

/** Schema to validate verify email OTP. */
export const verifyEmailOTPSchema = {
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email',
            minLength: 1
        },
        mobile: {
            type: 'string',
            minLength: 6
        },
        code: {
            type: 'string',
            minLength: 6,
            maxLength: 6,
            pattern: '^[0-9]{6}$'
        }
    },
    required: ['code'],
    anyOf: [
        { required: ['email'] },
        { required: ['mobile'] }
    ],
    additionalProperties: false,
};

/** Schema to validate user registration. Similar to update user schema but with required fields. */
export const registerSchema = {
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email',
            minLength: 1
        },
        mobile: {
            type: 'string',
            minLength: 10,
            maxLength: 20,
            pattern: '^[0-9+\\-() ]+$'
        },
        password: {
            type: 'string',
            minLength: 6
        }
    },
    anyOf: [
        { required: ['email', 'password'] },
        { required: ['mobile'] }
    ],
    additionalProperties: false,
};

/** Schema to validate forgot password. */
export const forgotPasswordSchema = {
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email',
        }
    },
    required: ['email'],
    additionalProperties: false,
};

/** Schema to validate reset password. */
export const resetPasswordSchema = {
    type: 'object',
    properties: {
        password: {
            type: 'string',
            minLength: 6
        },
        new_password: {
            type: 'string',
            minLength: 6
        }
    },
    required: ['password'],
    additionalProperties: false,
};