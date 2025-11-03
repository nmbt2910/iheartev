package com.iheartev.api.user;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Review;
import com.iheartev.api.social.ReviewRepository;
import com.iheartev.api.transaction.Order;
import com.iheartev.api.transaction.OrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sellers")
public class SellerProfileController {
    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    public SellerProfileController(UserRepository userRepository, ListingRepository listingRepository,
                                   ReviewRepository reviewRepository, OrderRepository orderRepository) {
        this.userRepository = userRepository;
        this.listingRepository = listingRepository;
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping("/{sellerId}/profile")
    public ResponseEntity<?> getSellerProfile(@PathVariable Long sellerId) {
        User seller = userRepository.findById(sellerId).orElse(null);
        if (seller == null) {
            return ResponseEntity.notFound().build();
        }

        // Get all reviews for seller
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewee().getId().equals(sellerId))
                .collect(Collectors.toList());

        // Calculate average rating
        double avgRating = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        // Get current listings
        List<Listing> currentListings = listingRepository.findAll().stream()
                .filter(l -> l.getSeller().getId().equals(sellerId) && "ACTIVE".equals(l.getStatus()))
                .collect(Collectors.toList());

        // Get sold listings
        List<Listing> soldListings = listingRepository.findAll().stream()
                .filter(l -> l.getSeller().getId().equals(sellerId) && "SOLD".equals(l.getStatus()))
                .collect(Collectors.toList());

        Map<String, Object> profile = new HashMap<>();
        
        // Seller info with null handling
        Map<String, Object> sellerInfo = new HashMap<>();
        sellerInfo.put("id", seller.getId());
        sellerInfo.put("fullName", seller.getFullName() != null ? seller.getFullName() : "");
        sellerInfo.put("email", seller.getEmail() != null ? seller.getEmail() : "");
        sellerInfo.put("phone", seller.getPhone() != null ? seller.getPhone() : "");
        profile.put("seller", sellerInfo);
        profile.put("averageRating", avgRating);
        profile.put("totalReviews", reviews.size());
        profile.put("activeListings", currentListings);
        profile.put("soldListings", soldListings);
        profile.put("reviews", reviews.stream()
                .limit(5)
                .map(r -> {
                    Map<String, Object> review = new HashMap<>();
                    review.put("id", r.getId());
                    review.put("rating", r.getRating());
                    review.put("comment", r.getComment() != null ? r.getComment() : "");
                    review.put("createdAt", r.getCreatedAt());
                    
                    // Reviewer info with null handling
                    Map<String, Object> reviewerInfo = new HashMap<>();
                    if (r.getReviewer() != null) {
                        reviewerInfo.put("id", r.getReviewer().getId());
                        reviewerInfo.put("fullName", r.getReviewer().getFullName() != null ? r.getReviewer().getFullName() : "");
                    } else {
                        reviewerInfo.put("id", null);
                        reviewerInfo.put("fullName", "");
                    }
                    review.put("reviewer", reviewerInfo);
                    
                    // Order info if available
                    if (r.getOrderId() != null) {
                        Order order = orderRepository.findByIdWithRelations(r.getOrderId()).orElse(null);
                        if (order != null) {
                            Map<String, Object> orderInfo = new HashMap<>();
                            orderInfo.put("id", order.getId());
                            orderInfo.put("amount", order.getAmount());
                            orderInfo.put("createdAt", order.getCreatedAt());
                            
                            if (order.getListing() != null) {
                                Map<String, Object> listingInfo = new HashMap<>();
                                listingInfo.put("id", order.getListing().getId());
                                listingInfo.put("brand", order.getListing().getBrand());
                                listingInfo.put("model", order.getListing().getModel());
                                listingInfo.put("year", order.getListing().getYear());
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

    @GetMapping("/{sellerId}/listings/current")
    public ResponseEntity<List<Listing>> getCurrentListings(@PathVariable Long sellerId) {
        List<Listing> listings = listingRepository.findAll().stream()
                .filter(l -> l.getSeller().getId().equals(sellerId) && "ACTIVE".equals(l.getStatus()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(listings);
    }

    @GetMapping("/{sellerId}/listings/sold")
    public ResponseEntity<List<Listing>> getSoldListings(@PathVariable Long sellerId) {
        List<Listing> listings = listingRepository.findAll().stream()
                .filter(l -> l.getSeller().getId().equals(sellerId) && "SOLD".equals(l.getStatus()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(listings);
    }

    @GetMapping("/{sellerId}/reviews")
    public ResponseEntity<?> getAllReviews(@PathVariable Long sellerId) {
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewee().getId().equals(sellerId))
                .collect(Collectors.toList());
        
        // Include order information with reviews
        List<Map<String, Object>> reviewsWithOrders = reviews.stream()
                .map(r -> {
                    Map<String, Object> review = new HashMap<>();
                    review.put("id", r.getId());
                    review.put("rating", r.getRating());
                    review.put("comment", r.getComment() != null ? r.getComment() : "");
                    review.put("createdAt", r.getCreatedAt());
                    review.put("updatedAt", r.getUpdatedAt());
                    review.put("editCount", r.getEditCount() != null ? r.getEditCount() : 0);
                    
                    // Reviewer info
                    Map<String, Object> reviewerInfo = new HashMap<>();
                    if (r.getReviewer() != null) {
                        reviewerInfo.put("id", r.getReviewer().getId());
                        reviewerInfo.put("fullName", r.getReviewer().getFullName() != null ? r.getReviewer().getFullName() : "");
                    } else {
                        reviewerInfo.put("id", null);
                        reviewerInfo.put("fullName", "");
                    }
                    review.put("reviewer", reviewerInfo);
                    
                    // Order info if available - always include orderId for reference
                    if (r.getOrderId() != null) {
                        review.put("orderId", r.getOrderId());
                        Order order = orderRepository.findByIdWithRelations(r.getOrderId()).orElse(null);
                        if (order != null) {
                            Map<String, Object> orderInfo = new HashMap<>();
                            orderInfo.put("id", order.getId());
                            orderInfo.put("amount", order.getAmount());
                            orderInfo.put("createdAt", order.getCreatedAt());
                            
                            if (order.getListing() != null) {
                                Map<String, Object> listingInfo = new HashMap<>();
                                listingInfo.put("id", order.getListing().getId());
                                listingInfo.put("brand", order.getListing().getBrand());
                                listingInfo.put("model", order.getListing().getModel());
                                listingInfo.put("year", order.getListing().getYear());
                                orderInfo.put("listing", listingInfo);
                            }
                            review.put("order", orderInfo);
                        }
                    }
                    
                    return review;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(reviewsWithOrders);
    }
}

