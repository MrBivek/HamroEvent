/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class BookingsService {
    /**
     * Create a booking request (Customer only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiBookings({
        requestBody
    }: {
        requestBody: {
            vendorId: string;
            packageId?: string;
            eventId: string;
            customerNote?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/bookings",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my bookings (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiBookings({
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
            url: "/api/bookings",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Get a booking (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiBookings1({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/bookings/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
}
