/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class VendorBookingsService {
    /**
     * Vendor inbox - list bookings for my vendor (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeBookings({
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
            url: "/api/vendors/me/bookings",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Get a booking (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeBookings1({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/bookings/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * Accept or reject a booking request (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiVendorsMeBookingsDecision({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            decision: "ACCEPT" | "REJECT";
            vendorNote?: string;
            rejectReason?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me/bookings/{id}/decision",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Invalid transition`,
                404: `Booking not found`
            }
        });
    }

    /**
     * Mark a booking as completed (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiVendorsMeBookingsComplete({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/vendors/me/bookings/{id}/complete",
            path: {
                id: id
            },
            errors: {
                400: `Invalid transition`,
                404: `Booking not found`
            }
        });
    }
}
