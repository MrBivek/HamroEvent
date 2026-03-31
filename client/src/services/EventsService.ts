/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class EventsService {
    /**
     * Create an event (Customer only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiEvents({
        requestBody
    }: {
        requestBody: {
            title: string;
            eventType: string;
            eventDate?: string;
            date?: string;
            startTime?: string;
            endTime?: string;
            locationText?: string;
            location?: string;
            guestCount?: number;
            budgetMin?: number;
            budgetMax?: number;
            budget?: number;
            notes?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/events",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List my events (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiEvents({ page = 1, limit = 20 }: { page?: number; limit?: number }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/events",
            query: {
                page: page,
                limit: limit
            }
        });
    }
    /**
     * Get an event (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiEvents1({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/events/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * Update an event (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static patchApiEvents({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/events/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
    /**
     * Delete an event (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static deleteApiEvents({ id }: { id: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/events/{id}",
            path: {
                id: id
            },
            errors: {
                404: `Not found`
            }
        });
    }
}
