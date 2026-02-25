/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class QuotesService {
    /**
     * List my quotes (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiQuotes({
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
            url: "/api/quotes",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Accept a quote (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static postApiQuotesAccept({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/quotes/{id}/accept",
            path: {
                id: id
            }
        });
    }
    /**
     * Reject a quote (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static postApiQuotesReject({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/quotes/{id}/reject",
            path: {
                id: id
            }
        });
    }
    /**
     * Send a quote for a booking (Vendor only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiVendorsMeBookingsQuote({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            amount: number;
            message?: string;
            expiresAt?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/bookings/{id}/quote",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Invalid request`
            }
        });
    }
    /**
     * Update a quote (Vendor only, pending only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiVendorsMeQuotes({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            amount?: number;
            message?: string;
            expiresAt?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me/quotes/{id}",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json"
        });
    }
}
