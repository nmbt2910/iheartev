package com.iheartev.api.user;

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
@RequestMapping("/api/buyers")
public class BuyerProfileController {
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;

    public BuyerProfileController(UserRepository userRepository, OrderRepository orderRepository,
                                  ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping("/{buyerId}/profile")
    public ResponseEntity<?> getBuyerProfile(@PathVariable Long buyerId) {
        User buyer = userRepository.findById(buyerId).orElse(null);
        if (buyer == null) {
            return ResponseEntity.notFound().build();
        }

        // Get all reviews for buyer (reviews they received as a buyer)
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewee().getId().equals(buyerId))
                .collect(Collectors.toList());

        // Calculate average rating
        double avgRating = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        // Get successful purchases (CLOSED orders)
        List<Order> successfulPurchases = orderRepository.findAll().stream()
                .filter(o -> o.getBuyer() != null && 
                           o.getBuyer().getId().equals(buyerId) &&
                           "CLOSED".equals(o.getStatus()))
                .collect(Collectors.toList());

        Map<String, Object> profile = new HashMap<>();
        
        // Buyer info with null handling
        Map<String, Object> buyerInfo = new HashMap<>();
        buyerInfo.put("id", buyer.getId());
        buyerInfo.put("fullName", buyer.getFullName() != null ? buyer.getFullName() : "");
        buyerInfo.put("email", buyer.getEmail() != null ? buyer.getEmail() : "");
        buyerInfo.put("phone", buyer.getPhone() != null ? buyer.getPhone() : "");
        profile.put("buyer", buyerInfo);
        profile.put("averageRating", avgRating);
        profile.put("totalReviews", reviews.size());
        profile.put("successfulPurchases", successfulPurchases.stream()
                .map(order -> {
                    Map<String, Object> orderInfo = new HashMap<>();
                    orderInfo.put("id", order.getId());
                    orderInfo.put("amount", order.getAmount());
                    orderInfo.put("createdAt", order.getCreatedAt());
                    orderInfo.put("closedAt", order.getClosedAt());
                    
                    // Listing info
                    if (order.getListing() != null) {
                        Map<String, Object> listingInfo = new HashMap<>();
                        listingInfo.put("id", order.getListing().getId());
                        listingInfo.put("brand", order.getListing().getBrand());
                        listingInfo.put("model", order.getListing().getModel());
                        listingInfo.put("year", order.getListing().getYear());
                        listingInfo.put("price", order.getListing().getPrice());
                        orderInfo.put("listing", listingInfo);
                    }
                    
                    return orderInfo;
                })
                .collect(Collectors.toList()));
        
        // Reviews with order information
        profile.put("reviews", reviews.stream()
                .limit(5)
                .map(r -> {
                    Map<String, Object> review = new HashMap<>();
                    review.put("id", r.getId());
                    review.put("rating", r.getRating());
                    review.put("comment", r.getComment() != null ? r.getComment() : "");
                    review.put("createdAt", r.getCreatedAt());
                    
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
}

