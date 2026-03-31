/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MarketplaceService {
    /**
     * List active packages for a vendor (public)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsPackages({ vendorId }: { vendorId: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/{vendorId}/packages",
            path: {
                vendorId: vendorId
            },
            errors: {
                404: `Vendor not found`
            }
        });
    }
    /**
     * List vendors (public)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendors({
        q,
        categoryId,
        category,
        locationId,
        location,
        verifiedStatus,
        verified,
        priceMin,
        priceMax,
        minRating,
        sortBy,
        page = 1,
        limit = 20
    }: {
        q?: string;
        categoryId?: string;
        category?: string;
        locationId?: string;
        location?: string;
        verifiedStatus?: string;
        verified?: boolean;
        priceMin?: number;
        priceMax?: number;
        minRating?: number;
        sortBy?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors",
            query: {
                q: q,
                categoryId: categoryId,
                category: category,
                locationId: locationId,
                location: location,
                verifiedStatus: verifiedStatus,
                verified: verified,
                priceMin: priceMin,
                priceMax: priceMax,
                minRating: minRating,
                sortBy: sortBy,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Get vendor public profile (public)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendors1({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
}
