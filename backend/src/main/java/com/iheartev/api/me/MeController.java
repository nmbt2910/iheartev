package com.iheartev.api.me;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Favorite;
import com.iheartev.api.social.FavoriteRepository;
import com.iheartev.api.social.Review;
import com.iheartev.api.social.ReviewRepository;
import com.iheartev.api.transaction.Order;
import com.iheartev.api.transaction.OrderRepository;
import com.iheartev.api.user.User;
import com.iheartev.api.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final ListingRepository listings;
    private final OrderRepository orders;
    private final FavoriteRepository favorites;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;

    public MeController(ListingRepository listings, OrderRepository orders, FavoriteRepository favorites,
                       UserRepository userRepository, ReviewRepository reviewRepository) {
        this.listings = listings; 
        this.orders = orders; 
        this.favorites = favorites;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getMyProfile(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        // Get reviews I gave
        List<Review> reviewsIGave = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewer().getId().equals(user.getId()))
                .collect(Collectors.toList());
        
        // Get reviews I received
        List<Review> reviewsIReceived = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewee().getId().equals(user.getId()))
                .collect(Collectors.toList());

        double avgRating = reviewsIReceived.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        Map<String, Object> profile = new HashMap<>();
        profile.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "fullName", user.getFullName(),
                "role", user.getRole()
        ));
        profile.put("averageRating", avgRating);
        profile.put("totalReviewsReceived", reviewsIReceived.size());
        profile.put("totalReviewsGiven", reviewsIGave.size());
        profile.put("reviewsIGave", reviewsIGave.stream()
                .map(r -> Map.of(
                        "id", r.getId(),
                        "rating", r.getRating(),
                        "comment", r.getComment() != null ? r.getComment() : "",
                        "reviewee", Map.of(
                                "id", r.getReviewee().getId(),
                                "fullName", r.getReviewee().getFullName()
                        ),
                        "createdAt", r.getCreatedAt()
                ))
                .collect(Collectors.toList()));
        profile.put("reviewsIReceived", reviewsIReceived.stream()
                .map(r -> Map.of(
                        "id", r.getId(),
                        "rating", r.getRating(),
                        "comment", r.getComment() != null ? r.getComment() : "",
                        "reviewer", Map.of(
                                "id", r.getReviewer().getId(),
                                "fullName", r.getReviewer().getFullName()
                        ),
                        "createdAt", r.getCreatedAt()
                ))
                .collect(Collectors.toList()));

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateMyProfile(
            @org.springframework.security.core.annotation.AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> updates) {
        User user = userRepository.findById(currentUser.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (updates.containsKey("fullName")) {
            user.setFullName(updates.get("fullName"));
        }
        if (updates.containsKey("phone")) {
            user.setPhone(updates.get("phone"));
        }
        // Note: email and password should be updated through separate endpoints with validation

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "email", saved.getEmail(),
                "phone", saved.getPhone() != null ? saved.getPhone() : "",
                "fullName", saved.getFullName(),
                "role", saved.getRole()
        ));
    }

    @GetMapping("/listings")
    public List<Listing> myListings(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return listings.findAll().stream()
                .filter(l -> l.getSeller() != null && l.getSeller().getId().equals(user.getId()))
                .collect(Collectors.toList());
    }

    @GetMapping("/orders")
    public List<Order> myOrders(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return orders.findAll().stream()
                .filter(o -> (o.getBuyer() != null && o.getBuyer().getId().equals(user.getId())) ||
                           (o.getListing() != null && o.getListing().getSeller() != null && 
                            o.getListing().getSeller().getId().equals(user.getId())))
                .collect(Collectors.toList());
    }

    @GetMapping("/favorites")
    public List<Favorite> myFavorites(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return favorites.findAll().stream()
                .filter(f -> f.getUser() != null && f.getUser().getId().equals(user.getId()))
                .collect(Collectors.toList());
    }
}


