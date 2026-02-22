/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AuthService {
    /**
     * Register a customer account
     * @returns any Customer created
     * @throws ApiError
     */
    public static postApiAuthRegisterCustomer({
        requestBody
    }: {
        requestBody: {
            fullName: string;
            email: string;
            phone?: string;
            password: string;
            acceptTerms?: boolean;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/auth/register/customer",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Validation error / duplicate email`
            }
        });
    }
    /**
     * Register a vendor account (creates user + vendor profile + optional packages)
     * @returns any Vendor onboarding created
     * @throws ApiError
     */
    public static postApiAuthRegisterVendor({
        requestBody
    }: {
        requestBody: {
            account: {
                fullName: string;
                email: string;
                phone?: string;
                password: string;
                acceptTerms?: boolean;
            };
            business: {
                businessName: string;
                categoryId?: string;
                description?: string;
                primaryLocationId?: string;
                serviceAreas?: Array<string>;
                website?: string;
                instagram?: string;
                facebook?: string;
            };
            packages?: Array<{
                title: string;
                description?: string;
                priceMin?: number;
                priceMax?: number;
                includes?: Array<string>;
            }>;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/auth/register/vendor",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Validation error / duplicate email`
            }
        });
    }
    /**
     * Login (Customer/Vendor/Admin)
     * @returns any JWT token + user
     * @throws ApiError
     */
    public static postApiAuthLogin({
        requestBody
    }: {
        requestBody: {
            email: string;
            password: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/auth/login",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                401: `Invalid credentials`
            }
        });
    }
}
