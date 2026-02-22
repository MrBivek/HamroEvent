/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class VendorPaymentsService {
    /**
     * Get vendor payment summary
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMePaymentsSummary(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/payments/summary"
        });
    }
    /**
     * List vendor transactions
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMePaymentsTransactions(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/payments/transactions"
        });
    }
    /**
     * List vendor payouts
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMePaymentsPayouts(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/payments/payouts"
        });
    }
    /**
     * Request a payout
     * @returns any Created
     * @throws ApiError
     */
    public static postApiVendorsMePaymentsPayouts({
        requestBody
    }: {
        requestBody: {
            amount: number;
            bankLast4?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/payments/payouts",
            body: requestBody,
            mediaType: "application/json"
        });
    }
}
