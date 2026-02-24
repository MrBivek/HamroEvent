/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { DocumentItem, PaginatedResponse } from "../types";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentsService {
    /**
     * Upload a document record (Vendor only, mock storage)
     * @returns Created
     * @throws ApiError
     */
    public static postApiVendorsMeDocuments({
        requestBody
    }: {
        requestBody: {
            name: string;
            type?: string;
            url?: string;
            /**
             * Base64 or data URL
             */
            data?: string;
            mimeType?: string;
        };
    }): CancelablePromise<DocumentItem> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/documents",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my documents (Vendor only)
     * @returns OK
     * @throws ApiError
     */
    public static getApiVendorsMeDocuments({
        page = 1,
        limit = 20
    }: {
        page?: number;
        limit?: number;
    }): CancelablePromise<PaginatedResponse<DocumentItem>> {
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
