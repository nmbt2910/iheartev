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
      const result = await favoriteService.checkFavorite(listingId);
      set((state) => {
        const newFavorites = new Set(state.favorites);
        const newFavoriteIds = new Map(state.favoriteIds);
        newFavorites.add(listingId);
        if (result.favoriteId) {
          newFavoriteIds.set(listingId, result.favoriteId);
        }
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
    // Check favorite status for multiple listings
    const promises = listingIds.map(id => get().checkFavorite(id));
    await Promise.all(promises);
  },
}));

