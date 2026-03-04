/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ReviewsService {
    /**
     * Create a review (Customer only)
     * @returns any Created
     * @throws ApiError
     */
    public static postApiReviews({
        requestBody
    }: {
        requestBody: {
            bookingId: string;
            rating: number;
            comment?: string;
        };
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/reviews",
            body: requestBody,
            mediaType: "application/json"
        });
    }
    /**
     * List reviews (public)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiReviews({
        vendorId,
        page = 1,
        limit = 20
    }: {
        vendorId?: string;
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/reviews",
            query: {
                vendorId: vendorId,
                page: page,
                limit: limit
            }
        });
    }

    /**
     * Get my review for a booking (Customer only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiReviewsBooking({ bookingId }: { bookingId: string }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/reviews/booking/{bookingId}",
            path: {
                bookingId: bookingId
            }
        });
    }
    /**
     * List my vendor reviews (Vendor only)
     * @returns any OK
     * @throws ApiError
     */
    public static getApiVendorsMeReviews({
        page = 1,
        limit = 20
    }: {
        page?: number;
        limit?: number;
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/vendors/me/reviews",
            query: {
                page: page,
                limit: limit
            }
        });
    }
}
