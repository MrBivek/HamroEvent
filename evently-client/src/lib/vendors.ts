import { API_BASE } from "@/lib/api";
import type { VendorAvailabilityResponse, VendorListResponse } from "@/types";

type AvailabilityParams = {
    vendorId: string;
    from?: string;
    to?: string;
};

type VendorQueryParams = {
    date?: string;
    startTime?: string;
    endTime?: string;
    page?: number;
    limit?: number;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        search.append(key, String(value));
    });
    const qs = search.toString();
    return qs ? `?${qs}` : "";
};

export const fetchVendorAvailability = async ({
    vendorId,
    from,
    to
}: AvailabilityParams): Promise<VendorAvailabilityResponse> => {
    const query = buildQuery({ from, to });
    const res = await fetch(`${API_BASE}/api/vendors/${vendorId}/availability${query}`);
    if (!res.ok) {
        throw new Error("Failed to load vendor availability");
    }
    return (await res.json()) as VendorAvailabilityResponse;
};

export const fetchAvailableVendors = async ({
    date,
    startTime,
    endTime,
    page = 1,
    limit = 20
}: VendorQueryParams): Promise<VendorListResponse> => {
    const query = buildQuery({ date, startTime, endTime, page, limit });
    const res = await fetch(`${API_BASE}/api/vendors${query}`);
    if (!res.ok) {
        throw new Error("Failed to load vendors");
    }
    return (await res.json()) as VendorListResponse;
};
