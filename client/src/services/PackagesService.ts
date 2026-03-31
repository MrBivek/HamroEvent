/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PackagesService {
    /**
     * List my packages (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMePackages(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/packages",
            errors: {
                401: `Unauthorized`,
                404: `Vendor profile not found`
            }
        });
    }
    /**
     * Create a package (Vendor only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiVendorsMePackages({
        requestBody
    }: {
        requestBody: {
            categoryId?: string;
            title: string;
            description?: string;
            priceMin?: number;
            priceMax?: number;
            includes?: Array<string>;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/packages",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                401: `Unauthorized`,
                404: `Vendor profile not found`
            }
        });
    }
    /**
     * Update my package (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiVendorsMePackages({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            categoryId?: string;
            title?: string;
            description?: string;
            priceMin?: number;
            priceMax?: number;
            includes?: Array<string>;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me/packages/{id}",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                401: `Unauthorized`,
                404: `Package not found`
            }
        });
    }
    /**
     * Delete my package (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static deleteApiVendorsMePackages({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/vendors/me/packages/{id}",
            path: {
                id: id
            },
            errors: {
                401: `Unauthorized`,
                404: `Package not found`
            }
        });
    }
    /**
     * Publish my package (Vendor must be verified APPROVED)
     * @returns any OK
     * @throws ApiError
     */
    public static postApiVendorsMePackagesPublish({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/packages/{id}/publish",
            path: {
                id: id
            },
            errors: {
                400: `Vendor must be verified before publishing packages`,
                401: `Unauthorized`,
                404: `Package not found`
            }
        });
    }
    /**
     * Unpublish my package (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static postApiVendorsMePackagesUnpublish({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/packages/{id}/unpublish",
            path: {
                id: id
            },
            errors: {
                401: `Unauthorized`,
                404: `Package not found`
            }
        });
    }
}
