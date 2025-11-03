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
        
        // User info with null handling
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail() != null ? user.getEmail() : "");
        userInfo.put("phone", user.getPhone() != null ? user.getPhone() : "");
        userInfo.put("fullName", user.getFullName() != null ? user.getFullName() : "");
        userInfo.put("role", user.getRole() != null ? user.getRole() : "");
        profile.put("user", userInfo);
        profile.put("averageRating", avgRating);
        profile.put("totalReviewsReceived", reviewsIReceived.size());
        profile.put("totalReviewsGiven", reviewsIGave.size());
        profile.put("reviewsIGave", reviewsIGave.stream()
                .map(r -> {
                    Map<String, Object> review = new HashMap<>();
                    review.put("id", r.getId());
                    review.put("rating", r.getRating());
                    review.put("comment", r.getComment() != null ? r.getComment() : "");
                    review.put("orderId", r.getOrderId());
                    review.put("updatedAt", r.getUpdatedAt());
                    review.put("editCount", r.getEditCount() != null ? r.getEditCount() : 0);
                    Map<String, Object> revieweeInfo = new HashMap<>();
                    if (r.getReviewee() != null) {
                        revieweeInfo.put("id", r.getReviewee().getId());
                        revieweeInfo.put("fullName", r.getReviewee().getFullName() != null ? r.getReviewee().getFullName() : "");
                    } else {
                        revieweeInfo.put("id", null);
                        revieweeInfo.put("fullName", "");
                    }
                    review.put("reviewee", revieweeInfo);
                    review.put("createdAt", r.getCreatedAt());
                    
                    // Include order information if orderId exists
                    if (r.getOrderId() != null) {
                        Order order = orders.findById(r.getOrderId()).orElse(null);
                        if (order != null) {
                            Map<String, Object> orderInfo = new HashMap<>();
                            orderInfo.put("id", order.getId());
                            orderInfo.put("amount", order.getAmount());
                            orderInfo.put("status", order.getStatus());
                            if (order.getListing() != null) {
                                Map<String, Object> listingInfo = new HashMap<>();
                                listingInfo.put("id", order.getListing().getId());
                                listingInfo.put("brand", order.getListing().getBrand() != null ? order.getListing().getBrand() : "");
                                listingInfo.put("model", order.getListing().getModel() != null ? order.getListing().getModel() : "");
                                listingInfo.put("year", order.getListing().getYear());
                                listingInfo.put("price", order.getListing().getPrice());
                                orderInfo.put("listing", listingInfo);
                            }
                            review.put("order", orderInfo);
                        }
                    }
                    return review;
                })
                .collect(Collectors.toList()));
        profile.put("reviewsIReceived", reviewsIReceived.stream()
                .map(r -> {
                    Map<String, Object> review = new HashMap<>();
                    review.put("id", r.getId());
                    review.put("rating", r.getRating());
                    review.put("comment", r.getComment() != null ? r.getComment() : "");
                    review.put("orderId", r.getOrderId());
                    Map<String, Object> reviewerInfo = new HashMap<>();
                    if (r.getReviewer() != null) {
                        reviewerInfo.put("id", r.getReviewer().getId());
                        reviewerInfo.put("fullName", r.getReviewer().getFullName() != null ? r.getReviewer().getFullName() : "");
                    } else {
                        reviewerInfo.put("id", null);
                        reviewerInfo.put("fullName", "");
                    }
                    review.put("reviewer", reviewerInfo);
                    review.put("createdAt", r.getCreatedAt());
                    
                    // Include order information if orderId exists
                    if (r.getOrderId() != null) {
                        Order order = orders.findById(r.getOrderId()).orElse(null);
                        if (order != null) {
                            Map<String, Object> orderInfo = new HashMap<>();
                            orderInfo.put("id", order.getId());
                            orderInfo.put("amount", order.getAmount());
                            orderInfo.put("status", order.getStatus());
                            if (order.getListing() != null) {
                                Map<String, Object> listingInfo = new HashMap<>();
                                listingInfo.put("id", order.getListing().getId());
                                listingInfo.put("brand", order.getListing().getBrand() != null ? order.getListing().getBrand() : "");
                                listingInfo.put("model", order.getListing().getModel() != null ? order.getListing().getModel() : "");
                                listingInfo.put("year", order.getListing().getYear());
                                listingInfo.put("price", order.getListing().getPrice());
                                orderInfo.put("listing", listingInfo);
                            }
                            review.put("order", orderInfo);
                        }
                    }
                    return review;
                })
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
        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("email", saved.getEmail() != null ? saved.getEmail() : "");
        response.put("phone", saved.getPhone() != null ? saved.getPhone() : "");
        response.put("fullName", saved.getFullName() != null ? saved.getFullName() : "");
        response.put("role", saved.getRole() != null ? saved.getRole() : "");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/listings")
    public List<Listing> myListings(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return listings.findAll().stream()
                .filter(l -> l.getSeller() != null && l.getSeller().getId().equals(user.getId()))
                // Include soft-deleted listings so user can see them in their list
                // but they won't be accessible when clicked
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
                .filter(f -> f.getListing() != null && !"INACTIVE".equals(f.getListing().getStatus()))
                .collect(Collectors.toList());
    }
}


