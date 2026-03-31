/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CatalogService {
    /**
     * List categories
     * @returns any OK
     * @throws ApiError
     */
    public static getApiCategories({
        active
    }: {
        /**
         * If true, only active categories
         */
        active?: boolean;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/categories",
            query: {
                active: active
            }
        });
    }
    /**
     * List locations
     * @returns any OK
     * @throws ApiError
     */
    public static getApiLocations({
        q,
        type,
        parentId
    }: {
        /**
         * Search by name (contains)
         */
        q?: string;
        /**
         * Filter by type (e.g., CITY)
         */
        type?: string;
        /**
         * Filter by parent location id
         */
        parentId?: string;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/locations",
            query: {
                q: q,
                type: type,
                parentId: parentId
            }
        });
    }
}
