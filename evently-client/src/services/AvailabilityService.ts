/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AvailabilityService {
    /**
     * List availability for date range (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeAvailability({
        from,
        to,
        page = 1,
        limit = 20
    }: {
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/availability",
            query: {
                from: from,
                to: to,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Set availability for a date (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static putApiVendorsMeAvailability({
        date,
        requestBody
    }: {
        date: string;
        requestBody: {
            isAvailable?: boolean;
            slots?: Array<{
                start?: string;
                end?: string;
            }>;
            note?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/vendors/me/availability/{date}",
            path: {
                date: date
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Conflict with confirmed bookings`
            }
        });
    }
    /**
     * Remove availability for a date (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static deleteApiVendorsMeAvailability({ date }: { date: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/vendors/me/availability/{date}",
            path: {
                date: date
            }
        });
    }
}
