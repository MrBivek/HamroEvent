/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class NotificationsService {
    /**
     * List my notifications
     * @returns any OK
     * @throws ApiError
     */
    public static getApiNotifications({
        unread,
        page = 1,
        limit = 20
    }: {
        unread?: boolean;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/notifications",
            query: {
                unread: unread,
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Mark notification as read
     * @returns any OK
     * @throws ApiError
     */
    public static postApiNotificationsRead({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/notifications/{id}/read",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * Mark all notifications as read
     * @returns any OK
     * @throws ApiError
     */
    public static postApiNotificationsReadAll(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/notifications/read-all"
        });
    }
}
