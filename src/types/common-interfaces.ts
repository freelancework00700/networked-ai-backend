import { User } from "../models";
import { NetworkCategory } from "./enums";

export interface Response {
    success: boolean;
    message: string;
    data?: unknown;
    totalData?: number;
    errorCode?: string;
}

export interface CustomError {
    status?: number;
    message: string;
    stack?: string;
    name: string;
    code?: string;
}

export interface RemoveMediaResponse {
    success: boolean;
    message: string;
}

export interface UserResult { 
    user: User; 
    distance: number; 
    category: NetworkCategory 
}
