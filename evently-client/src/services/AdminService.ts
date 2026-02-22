/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AdminService {
    /**
     * Admin dashboard stats
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminDashboard(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/dashboard"
        });
    }
    /**
     * Update vendor verification status (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiAdminVendorsVerification({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            status: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMIT_REQUIRED";
            note?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/admin/vendors/{id}/verification",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List users (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminUsers({
        q,
        role,
        status,
        page = 1,
        limit = 20
    }: {
        q?: string;
        role?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/users",
            query: {
                q: q,
                role: role,
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Update a user (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiAdminUsers({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            isActive?: boolean;
            status?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/admin/users/{id}",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * List reviews (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminReviews({
        hidden,
        page = 1,
        limit = 20
    }: {
        hidden?: boolean;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/reviews",
            query: {
                hidden: hidden,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Analytics overview (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminAnalytics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/analytics"
        });
    }
    /**
     * Moderate a review (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiAdminReviews({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            isHidden: boolean;
            moderationReason?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/admin/reviews/{id}",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * List audit logs (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminAuditLogs({
        action,
        targetType,
        targetId,
        page = 1,
        limit = 20
    }: {
        action?: string;
        targetType?: string;
        targetId?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/admin/audit-logs",
            query: {
                action: action,
                targetType: targetType,
                targetId: targetId,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * List reports (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminReports({
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
            url: "/api/admin/reports",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * List support tickets (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminSupportTickets({
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
            url: "/api/admin/support-tickets",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Update support ticket (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiAdminSupportTickets({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            status?: string;
            assignedTo?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/admin/support-tickets/{id}",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List verification requests (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiAdminVerificationRequests({
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
            url: "/api/admin/verification-requests",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Approve or reject a verification request (Admin only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiAdminVerificationRequestsDecision({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            decision: "APPROVE" | "REJECT" | "RESUBMIT_REQUIRED";
            note?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/admin/verification-requests/{id}/decision",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                400: `Invalid transition`,
                404: `Not found`
            }
        });
    }
}
