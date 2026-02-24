/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { PaginatedResponse, SupportTicket } from "../types";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SupportService {
    /**
     * Create a support ticket
     * @returns Created
     * @throws ApiError
     */
    public static postApiSupportTickets({
        requestBody
    }: {
        requestBody: {
            subject: string;
            message: string;
        };
    }): CancelablePromise<SupportTicket> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/support-tickets",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my support tickets
     * @returns OK
     * @throws ApiError
     */
    public static getApiSupportTickets({
        status,
        page = 1,
        limit = 20
    }: {
        status?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<PaginatedResponse<SupportTicket>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/support-tickets",
            query: {
                status: status,
                page: page,
                limit: limit
            }
        });
    }
}
