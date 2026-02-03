import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/constants';
import { sendBadRequestResponse } from '../utils/response.service';

// Initialize AJV ONCE at module load with strict mode disabled to prevent memory leaks
// Strict mode warnings cause excessive memory allocation when schemas are missing type definitions
const ajv = new Ajv({
    strict: false, // Disable all strict mode checks
    strictTypes: false, // Explicitly disable strictTypes to prevent "missing type" warnings
    strictTuples: false, // Disable strict tuple validation
    allErrors: true, // Still collect all validation errors
    verbose: false, // Reduce memory usage
    removeAdditional: false, // Don't modify input objects
});
addFormats(ajv);

// Cache compiled validators to prevent recompilation on every request
// This ensures validators are created once at route registration time, not per request
// Schemas are defined at module load, so cache size should be stable (one per route validation)
const validatorCache = new Map<string, ValidateFunction>();
const MAX_CACHE_SIZE = 500; // Safety limit to prevent unbounded growth

// Simple hash function for cache keys to avoid storing large JSON strings
// Uses object reference for schemas defined at module load (stable references)
// Falls back to JSON hash for dynamic schemas
const schemaRefMap = new WeakMap<any, string>();
let schemaCounter = 0;

function hashSchema(schema: any): string {
    // For schemas defined at module load, use object reference (more efficient)
    if (schemaRefMap.has(schema)) {
        return schemaRefMap.get(schema)!;
    }
    
    // For dynamic schemas, use JSON hash but limit stringification size
    try {
        // Limit stringification to prevent memory issues with very large schemas
        const str = JSON.stringify(schema);
        let hash = 0;
        const maxLength = Math.min(str.length, 10000); // Limit processing
        for (let i = 0; i < maxLength; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        const hashStr = Math.abs(hash).toString(36) + '_' + (schemaCounter++).toString(36);
        schemaRefMap.set(schema, hashStr);
        return hashStr;
    } catch (error) {
        // Fallback if stringification fails
        return 'schema_' + (schemaCounter++).toString(36);
    }
}

/** Validate schemas and missing params */
export const validateSchema = (schema: any, type: 'body' | 'query') => {
    // Create a cache key using hash to avoid storing large JSON strings
    const schemaHash = hashSchema(schema);
    const cacheKey = `${type}:${schemaHash}`;
    
    // Get or compile validator
    let validate = validatorCache.get(cacheKey);
    if (!validate) {
        // Safety: prevent cache from growing unbounded (shouldn't happen with static schemas)
        if (validatorCache.size >= MAX_CACHE_SIZE) {
            // Clear cache if it somehow grows too large (indicates a bug)
            console.warn('Validator cache exceeded limit, clearing cache');
            validatorCache.clear();
        }
        validate = ajv.compile(schema);
        validatorCache.set(cacheKey, validate);
    }

    return (req: Request, res: Response, next: NextFunction) => {
        const valid = validate(req[type]);
        if(!valid) return sendBadRequestResponse(res, responseMessages.validationFailed, validate.errors);

        next();
    };
};