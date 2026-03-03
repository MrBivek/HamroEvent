/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PaymentsService {
    /**
     * Initiate payment (Customer only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiPayments({
        requestBody
    }: {
        requestBody: {
            bookingId: string;
            amount: number;
            provider: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/payments",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my payments (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiPayments({
        bookingId,
        eventId,
        page = 1,
        limit = 20
    }: {
        bookingId?: string;
        eventId?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/payments",
            query: {
                bookingId: bookingId,
                eventId: eventId,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Confirm payment (Customer only, mock)
     * @returns any OK
     * @throws ApiError
     */
    public static postApiPaymentsConfirm({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/payments/{id}/confirm",
            path: {
                id: id
            }
        });
    }
    /**
     * Create a refund (Admin/Vendor)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiRefunds({
        requestBody
    }: {
        requestBody: {
            paymentId: string;
            amount: number;
            reason?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/refunds",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List refunds (Admin/Vendor)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiRefunds({
        bookingId,
        page = 1,
        limit = 20
    }: {
        bookingId?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/refunds",
            query: {
                bookingId: bookingId,
                page: page,
                limit: limit
            }
        });
    }
}
