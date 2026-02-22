/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ReportsService {
    /**
     * Submit a report (authenticated users)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiReports({
        requestBody
    }: {
        requestBody: {
            targetType: string;
            targetId: string;
            reason: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/reports",
            body: requestBody,
            mediaType: "application/json"
        });
    }
}
