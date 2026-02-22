/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class VendorsService {
    /**
     * Get my vendor profile (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMe(): CancelablePromise<any> {
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
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiVendorsMe(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me"
        });
    }
}
