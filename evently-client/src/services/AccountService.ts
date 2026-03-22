/* generated manually to match account security endpoints */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { AccountSecurityStatus, TwoFactorSetupResponse, TwoFactorToggleResponse } from "../types";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AccountService {
    public static getApiAccountSecurity(): CancelablePromise<AccountSecurityStatus> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/account/security"
        });
    }

    public static postApiAccount2faSetup(): CancelablePromise<TwoFactorSetupResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/account/2fa/setup"
        });
    }

    public static postApiAccount2faEnable({
        requestBody
    }: {
        requestBody: { code: string };
    }): CancelablePromise<TwoFactorToggleResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/account/2fa/enable",
            body: requestBody,
            mediaType: "application/json"
        });
    }

    public static postApiAccount2faDisable({
        requestBody
    }: {
        requestBody: { code: string };
    }): CancelablePromise<TwoFactorToggleResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/account/2fa/disable",
            body: requestBody,
            mediaType: "application/json"
        });
    }
}
