/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AdminService {
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
