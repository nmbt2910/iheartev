package com.iheartev.api.social;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteRepository repo;
    private final ListingRepository listings;

    public FavoriteController(FavoriteRepository repo, ListingRepository listings) {
        this.repo = repo;
        this.listings = listings;
    }

    @PostMapping("/{listingId}")
    public ResponseEntity<?> add(@PathVariable Long listingId, @AuthenticationPrincipal User user) {
        Listing listing = listings.findById(listingId).orElse(null);
        if (listing == null) return ResponseEntity.notFound().build();
        
        // Check if already favorited
        var existing = repo.findByUserAndListingId(user.getId(), listingId);
        if (existing.isPresent()) {
            return ResponseEntity.ok().build(); // Already favorited, return success
        }
        
        Favorite fav = new Favorite();
        fav.setUser(user);
        fav.setListing(listing);
        repo.save(fav);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return repo.findById(id).map(f -> {
            if (!f.getUser().getId().equals(user.getId())) return ResponseEntity.status(403).build();
            repo.delete(f); return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/listing/{listingId}")
    public ResponseEntity<?> removeByListing(@PathVariable Long listingId, @AuthenticationPrincipal User user) {
        return repo.findByUserAndListingId(user.getId(), listingId).map(f -> {
            repo.delete(f);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/listing/{listingId}/check")
    public ResponseEntity<?> checkFavorite(@PathVariable Long listingId, @AuthenticationPrincipal User user) {
        if (user == null) {
            // User not authenticated - return not favorited
            Map<String, Object> response = new HashMap<>();
            response.put("isFavorite", false);
            response.put("favoriteId", null);
            return ResponseEntity.ok(response);
        }
        var favorite = repo.findByUserAndListingId(user.getId(), listingId);
        Map<String, Object> response = new HashMap<>();
        response.put("isFavorite", favorite.isPresent());
        response.put("favoriteId", favorite.map(f -> f.getId()).orElse(null));
        return ResponseEntity.ok(response);
    }
}


