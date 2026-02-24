/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { ApiOkResponse, PaginatedResponse, VendorProfile } from "../types";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FavoritesService {
    /**
     * Add vendor to favorites (Customer only)
     * @returns OK
     * @throws ApiError
     */
    public static postApiFavoritesVendors({ vendorId }: { vendorId: string }): CancelablePromise<ApiOkResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/favorites/vendors/{vendorId}",
            path: {
                vendorId: vendorId
            }
        });
    }
    /**
     * Remove vendor from favorites (Customer only)
     * @returns OK
     * @throws ApiError
     */
    public static deleteApiFavoritesVendors({ vendorId }: { vendorId: string }): CancelablePromise<ApiOkResponse> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/favorites/vendors/{vendorId}",
            path: {
                vendorId: vendorId
            }
        });
    }
    /**
     * List my favorites (Customer only)
     * @returns OK
     * @throws ApiError
     */
    public static getApiFavorites({
        page = 1,
        limit = 20
    }: {
        page?: number;
        limit?: number;
    }): CancelablePromise<PaginatedResponse<VendorProfile>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/favorites",
            query: {
                page: page,
                limit: limit
            }
        });
    }
}
