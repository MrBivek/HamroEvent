/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class VendorVerificationService {
    /**
     * Submit a verification request (Vendor only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiVendorsMeVerificationRequests({
        requestBody
    }: {
        requestBody: {
            documentIds?: Array<string>;
            vendorNote?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/verification-requests",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Validation error`
            }
        });
    }
    /**
     * List my verification requests (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeVerificationRequests({
        status,
        page = 1,
        limit = 20
    }: {
        status?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/verification-requests",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Get a verification request (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeVerificationRequests1({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/verification-requests/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
}
