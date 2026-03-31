import type { CancelablePromise } from "@/core/CancelablePromise";
import { OpenAPI } from "@/core/OpenAPI";
import { request as __request } from "@/core/request";
import type { CommissionPaymentRecord, CommissionSummary, PaginatedResponse } from "@/types";

export class CommissionPaymentsService {
    public static getApiVendorsMeCommissionsSummary(month?: string): CancelablePromise<CommissionSummary> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/commissions/summary",
            query: {
                month,
            },
        });
    }

    public static getApiVendorsMeCommissionsPayments({
        month,
        page = 1,
        limit = 20,
    }: {
        month?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<PaginatedResponse<CommissionPaymentRecord>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/commissions/payments",
            query: {
                month,
                page,
                limit,
            },
        });
    }

    public static postApiVendorsMeCommissionsPaymentsInitiate({
        requestBody,
    }: {
        requestBody: {
            month: string;
            amount: number;
            provider: string;
        };
    }): CancelablePromise<{ paymentId: string; payUrl?: string; formData?: Record<string, string> }> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/commissions/payments/initiate",
            body: requestBody,
            mediaType: "application/json",
        });
    }

    public static postApiVendorsMeCommissionsPaymentsConfirm({
        id,
    }: {
        id: string;
    }): CancelablePromise<CommissionPaymentRecord> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/vendors/me/commissions/payments/{id}/confirm",
            path: {
                id,
            },
        });
    }
}
