/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ConversationsService {
    /**
     * Create or get a conversation
     * @returns any OK
     * @throws ApiError
     */
    public static postApiConversations({
        requestBody
    }: {
        requestBody: {
            bookingId?: string;
            vendorId?: string;
            customerUserId?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/conversations",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my conversations
     * @returns any OK
     * @throws ApiError
     */
    public static getApiConversations({
        page = 1,
        limit = 20
    }: {
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/conversations",
            query: {
                page: page,
                limit: limit
            }
        });
    }
    /**
     * List messages in a conversation
     * @returns any OK
     * @throws ApiError
     */
    public static getApiConversationsMessages({
        id,
        page = 1,
        limit = 50
    }: {
        id: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/conversations/{id}/messages",
            path: {
                id: id
            },
            query: {
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Send a message
     * @returns any Created
     * @throws ApiError
     */
    public static postApiConversationsMessages({
        id,
        requestBody
    }: {
        id: string;
        requestBody: {
            text: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/conversations/{id}/messages",
            path: {
                id: id
            },
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * Mark messages as read
     * @returns any OK
     * @throws ApiError
     */
    public static postApiConversationsRead({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/conversations/{id}/read",
            path: {
                id: id
            }
        });
    }
}
