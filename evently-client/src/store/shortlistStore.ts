import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FavoritesService } from "@/services/FavoritesService";

interface ShortlistStore {
    shortlistedVendors: string[];
    addToShortlist: (vendorId: string) => Promise<void>;
    removeFromShortlist: (vendorId: string) => Promise<void>;
    loadShortlist: () => Promise<void>;
    isShortlisted: (vendorId: string) => boolean;
    clearShortlist: () => void;
}

export const useShortlistStore = create<ShortlistStore>()(
    persist(
        (set, get) => ({
            shortlistedVendors: [],

            addToShortlist: async (vendorId) => {
                set((state) => ({
                    shortlistedVendors: state.shortlistedVendors.includes(vendorId)
                        ? state.shortlistedVendors
                        : [...state.shortlistedVendors, vendorId]
                }));
                try {
                    await FavoritesService.postApiFavoritesVendors({ vendorId });
                } catch {
                    set((state) => ({
                        shortlistedVendors: state.shortlistedVendors.filter((id) => id !== vendorId)
                    }));
                }
            },

            removeFromShortlist: async (vendorId) => {
                set((state) => ({
                    shortlistedVendors: state.shortlistedVendors.filter((id) => id !== vendorId)
                }));
                try {
                    await FavoritesService.deleteApiFavoritesVendors({ vendorId });
                } catch {
                    set((state) => ({
                        shortlistedVendors: state.shortlistedVendors.includes(vendorId)
                            ? state.shortlistedVendors
                            : [...state.shortlistedVendors, vendorId]
                    }));
                }
            },

            loadShortlist: async () => {
                try {
                    const res = await FavoritesService.getApiFavorites({ page: 1, limit: 200 });
                    const ids = (res?.items || []).map((vendor: { _id: string }) => vendor._id);
                    set({ shortlistedVendors: ids });
                } catch {
                    set({ shortlistedVendors: [] });
                }
            },

            isShortlisted: (vendorId) => get().shortlistedVendors.includes(vendorId),

            clearShortlist: () => set({ shortlistedVendors: [] })
        }),
        {
            name: "evently-shortlist"
        }
    )
);
