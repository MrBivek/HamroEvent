import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VendorProfile } from '@/types';

interface ShortlistStore {
  shortlistedVendors: string[];
  addToShortlist: (vendorId: string) => void;
  removeFromShortlist: (vendorId: string) => void;
  isShortlisted: (vendorId: string) => boolean;
  clearShortlist: () => void;
}

export const useShortlistStore = create<ShortlistStore>()(
  persist(
    (set, get) => ({
      shortlistedVendors: [],
      
      addToShortlist: (vendorId) =>
        set((state) => ({
          shortlistedVendors: state.shortlistedVendors.includes(vendorId)
            ? state.shortlistedVendors
            : [...state.shortlistedVendors, vendorId],
        })),
      
      removeFromShortlist: (vendorId) =>
        set((state) => ({
          shortlistedVendors: state.shortlistedVendors.filter((id) => id !== vendorId),
        })),
      
      isShortlisted: (vendorId) => 
        get().shortlistedVendors.includes(vendorId),
      
      clearShortlist: () => 
        set({ shortlistedVendors: [] }),
    }),
    {
      name: 'evently-shortlist',
    }
  )
);
