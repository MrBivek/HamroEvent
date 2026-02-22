/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentsService {
    /**
     * Upload a document record (Vendor only, mock storage)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiVendorsMeDocuments({
        requestBody
    }: {
        requestBody: {
            name: string;
            type?: string;
            url: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/documents",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my documents (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeDocuments({
        page = 1,
        limit = 20
    }: {
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/documents",
            query: {
                page: page,
                limit: limit
            }
        });
    }
}
