import type { CancelablePromise } from "@/core/CancelablePromise";
import { OpenAPI } from "@/core/OpenAPI";
import { request as __request } from "@/core/request";
import type {
    AdminCommissionSummary,
    AdminPaymentConfig,
    CommissionPaymentRecord,
    PaginatedResponse,
} from "@/types";

export class AdminPaymentsService {
    public static getApiAdminPaymentsConfig(): CancelablePromise<AdminPaymentConfig | null> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/payments/config",
        });
    }

    public static putApiAdminPaymentsConfig({
        requestBody,
    }: {
        requestBody: AdminPaymentConfig;
    }): CancelablePromise<AdminPaymentConfig> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/admin/payments/config",
            body: requestBody,
            mediaType: "application/json",
        });
    }

    public static getApiAdminCommissionsSummary(month?: string): CancelablePromise<AdminCommissionSummary> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/commissions/summary",
            query: {
                month,
            },
        });
    }

    public static getApiAdminCommissionsPayments({
        month,
        vendorId,
        page = 1,
        limit = 20,
    }: {
        month?: string;
        vendorId?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<PaginatedResponse<CommissionPaymentRecord>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/commissions/payments",
            query: {
                month,
                vendorId,
                page,
                limit,
            },
        });
    }
}
