import { AccountType } from "./enums";

// Create verification params
export interface CreateVerificationParams {
    email?: string;
    mobile?: string;
}

// Verify params
export interface VerifyParams {
    email?: string;
    mobile?: string;
    code: string;
}

// Register user payload
export interface RegisterUserPayload {
    email?: string;
    mobile?: string;
    password?: string;
}

// Update user payload
export interface UpdateUserPayload {
    firebase_uid?: string;
    email?: string;
    mobile?: string;
    title?: string;
    name?: string;
    username?: string;
    dob?: Date | null;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    company_name?: string;
    college_university_name?: string;
    image_url?: string;
    thumbnail_url?: string;
    account_type?: AccountType;
    fcm_tokens?: string;
    password?: string;
    stripe_account_id?: string;
    stripe_account_status?: string;
}