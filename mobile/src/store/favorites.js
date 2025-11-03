import { create } from 'zustand';
import { favoriteService } from '../services/favoriteService';

export const useFavorites = create((set, get) => ({
  favorites: new Set(), // Set of listing IDs that are favorited
  favoriteIds: new Map(), // Map of listingId -> favoriteId
  
  async checkFavorite(listingId) {
    try {
      const result = await favoriteService.checkFavorite(listingId);
      set((state) => {
        const newFavorites = new Set(state.favorites);
        const newFavoriteIds = new Map(state.favoriteIds);
        if (result.isFavorite) {
          newFavorites.add(listingId);
          if (result.favoriteId) {
            newFavoriteIds.set(listingId, result.favoriteId);
          }
        } else {
          newFavorites.delete(listingId);
          newFavoriteIds.delete(listingId);
        }
        // Return new objects to trigger re-renders
        return { favorites: newFavorites, favoriteIds: newFavoriteIds };
      });
      return result.isFavorite;
    } catch (error) {
      // Only log unexpected errors (not 401/403 which are handled by service)
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('Error checking favorite:', error);
      }
      return false;
    }
  },

  async addFavorite(listingId) {
    try {
      await favoriteService.addFavorite(listingId);
      // Optimistically update state - no need for extra API call
      set((state) => {
        const newFavorites = new Set(state.favorites);
        const newFavoriteIds = new Map(state.favoriteIds);
        newFavorites.add(listingId);
        // favoriteId will be set on next batch load if needed
        return { favorites: newFavorites, favoriteIds: newFavoriteIds };
      });
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },

  async removeFavorite(listingId) {
    try {
      const favoriteId = get().favoriteIds.get(listingId);
      if (favoriteId) {
        await favoriteService.removeFavorite(favoriteId);
      } else {
        await favoriteService.removeFavoriteByListing(listingId);
      }
      set((state) => {
        const newFavorites = new Set(state.favorites);
        const newFavoriteIds = new Map(state.favoriteIds);
        newFavorites.delete(listingId);
        newFavoriteIds.delete(listingId);
        return { favorites: newFavorites, favoriteIds: newFavoriteIds };
      });
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  async toggleFavorite(listingId) {
    const isFavorite = get().favorites.has(listingId);
    if (isFavorite) {
      await get().removeFavorite(listingId);
      return false;
    } else {
      await get().addFavorite(listingId);
      return true;
    }
  },

  isFavorite(listingId) {
    return get().favorites.has(listingId);
  },

  async loadFavoritesForListings(listingIds) {
    // Optimized: Load all favorites at once instead of individual calls
    try {
      const allFavorites = await favoriteService.getMyFavorites();
      const favoriteMap = new Map();
      const favoriteIdMap = new Map();
      
      // Build maps from the batch response
      if (Array.isArray(allFavorites)) {
        allFavorites.forEach(fav => {
          // Handle different possible response structures
          const listingId = fav.listing?.id || fav.listingId;
          if (listingId && listingIds.includes(listingId)) {
            favoriteMap.set(listingId, true);
            if (fav.id) {
              favoriteIdMap.set(listingId, fav.id);
            }
          }
        });
      }
      
      // Update store state with batch results
      set((state) => {
        const newFavorites = new Set(state.favorites);
        const newFavoriteIds = new Map(state.favoriteIds);
        
        // Only update favorites for the requested listing IDs
        listingIds.forEach(id => {
          if (favoriteMap.has(id)) {
            // Add or keep as favorite
            newFavorites.add(id);
            const favId = favoriteIdMap.get(id);
            if (favId) {
              newFavoriteIds.set(id, favId);
            }
          } else {
            // Remove from favorites only for these specific listings
            // This ensures favorites for other listings remain untouched
            newFavorites.delete(id);
            newFavoriteIds.delete(id);
          }
        });
        
        return { favorites: newFavorites, favoriteIds: newFavoriteIds };
      });
    } catch (error) {
      // If batch loading fails (401/403), silently fail - user might not be authenticated
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('Error loading favorites batch:', error);
        // Fallback to individual checks only if batch fails and it's not auth error
        // But we'll skip this to avoid the performance hit
      }
    }
  },
}));

