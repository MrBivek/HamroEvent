/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { VendorProfile } from "../types";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class VendorsService {
    /**
     * Get my vendor profile (Vendor only)
     * @returns OK
     * @throws ApiError
     */
    public static getApiVendorsMe(): CancelablePromise<VendorProfile> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me",
            errors: {
                401: `Unauthorized`
            }
        });
    }
    /**
     * Update my vendor profile (Vendor only)
     * @returns OK
     * @throws ApiError
     */
    public static patchApiVendorsMe(): CancelablePromise<VendorProfile> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me"
        });
    }
    /**
     * Upload portfolio images (Vendor only)
     * @returns OK
     * @throws ApiError
     */
    public static postApiVendorsMePortfolio({
        requestBody
    }: {
        requestBody: {
            images: Array<{
                /**
                 * Base64 or data URL
                 */
                data: string;
                filename?: string;
                mimeType?: string;
            }>;
        };
    }): CancelablePromise<VendorProfile> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/portfolio",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * Remove a portfolio image (Vendor only)
     * @returns OK
     * @throws ApiError
     */
    public static deleteApiVendorsMePortfolio({
        requestBody
    }: {
        requestBody: {
            url: string;
        };
    }): CancelablePromise<VendorProfile> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/vendors/me/portfolio",
            body: requestBody,
            mediaType: "application/json"
        });
    }
}
