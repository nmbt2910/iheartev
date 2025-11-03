package com.iheartev.api.transaction;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Review;
import com.iheartev.api.social.ReviewRepository;
import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository orders;
    private final ListingRepository listings;
    private final ReviewRepository reviewRepository;

    public OrderController(OrderRepository orders, ListingRepository listings, ReviewRepository reviewRepository) {
        this.orders = orders;
        this.listings = listings;
        this.reviewRepository = reviewRepository;
    }

    @PostMapping("/buy-now/{listingId}")
    public ResponseEntity<?> buyNow(@PathVariable Long listingId, @AuthenticationPrincipal User buyer) {
        Listing listing = listings.findById(listingId).orElse(null);
        if (listing == null || !"ACTIVE".equals(listing.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Listing unavailable"));
        }
        
        // Check if buyer is the seller
        if (listing.getSeller() != null && listing.getSeller().getId().equals(buyer.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "You cannot buy your own listing"));
        }
        
        // Check if there's already an order for this listing
        boolean hasExistingOrder = orders.findAll().stream()
                .anyMatch(o -> o.getListing().getId().equals(listingId) && 
                             !"CANCELLED".equals(o.getStatus()));
        if (hasExistingOrder) {
            return ResponseEntity.badRequest().body(Map.of("error", "Listing already has an active order"));
        }
        
        Order order = new Order();
        order.setListing(listing);
        order.setBuyer(buyer);
        order.setAmount(listing.getPrice());
        order.setStatus("PENDING");
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());
        order.setBuyerPaymentConfirmed(false);
        order.setSellerPaymentReceived(false);
        orders.save(order);
        
        // Mark listing as SOLD (not active for other buyers)
        listing.setStatus("SOLD");
        listings.save(listing);
        return ResponseEntity.ok(order);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderDetail(@PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return orders.findById(orderId).map(order -> {
            // Check if user is buyer or seller (with null safety)
            boolean isBuyer = order.getBuyer() != null && 
                            order.getBuyer().getId() != null && 
                            order.getBuyer().getId().equals(user.getId());
            boolean isSeller = order.getListing() != null && 
                             order.getListing().getSeller() != null &&
                             order.getListing().getSeller().getId() != null &&
                             order.getListing().getSeller().getId().equals(user.getId());
            
            if (!isBuyer && !isSeller) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            Map<String, Object> detail = new HashMap<>();
            detail.put("order", order);
            detail.put("listing", order.getListing());
            
            // Seller info with null handling
            Map<String, Object> sellerInfo = new HashMap<>();
            if (order.getListing().getSeller() != null) {
                sellerInfo.put("id", order.getListing().getSeller().getId());
                sellerInfo.put("fullName", order.getListing().getSeller().getFullName() != null ? 
                        order.getListing().getSeller().getFullName() : "");
                sellerInfo.put("email", order.getListing().getSeller().getEmail() != null ? 
                        order.getListing().getSeller().getEmail() : "");
                sellerInfo.put("phone", order.getListing().getSeller().getPhone() != null ? 
                        order.getListing().getSeller().getPhone() : "");
            } else {
                sellerInfo.put("id", null);
                sellerInfo.put("fullName", "");
                sellerInfo.put("email", "");
                sellerInfo.put("phone", "");
            }
            detail.put("seller", sellerInfo);
            
            // Buyer info with null handling
            Map<String, Object> buyerInfo = new HashMap<>();
            if (order.getBuyer() != null) {
                buyerInfo.put("id", order.getBuyer().getId());
                buyerInfo.put("fullName", order.getBuyer().getFullName() != null ? 
                        order.getBuyer().getFullName() : "");
                buyerInfo.put("email", order.getBuyer().getEmail() != null ? 
                        order.getBuyer().getEmail() : "");
                buyerInfo.put("phone", order.getBuyer().getPhone() != null ? 
                        order.getBuyer().getPhone() : "");
            } else {
                buyerInfo.put("id", null);
                buyerInfo.put("fullName", "");
                buyerInfo.put("email", "");
                buyerInfo.put("phone", "");
            }
            detail.put("buyer", buyerInfo);
            detail.put("paymentInfo", order.getListing().getPaymentInfo());
            detail.put("isBuyer", isBuyer);
            detail.put("isSeller", isSeller);
            
            // Sync review IDs if they exist but aren't set in order
            boolean needsUpdate = false;
            if (order.getBuyerReviewId() == null) {
                Review buyerReview = reviewRepository.findAll().stream()
                    .filter(r -> r.getOrderId() != null && r.getOrderId().equals(order.getId()) &&
                               r.getReviewer().getId().equals(order.getBuyer().getId()))
                    .findFirst()
                    .orElse(null);
                if (buyerReview != null) {
                    order.setBuyerReviewId(buyerReview.getId());
                    needsUpdate = true;
                }
            }
            if (order.getSellerReviewId() == null) {
                Review sellerReview = reviewRepository.findAll().stream()
                    .filter(r -> r.getOrderId() != null && r.getOrderId().equals(order.getId()) &&
                               r.getReviewer().getId().equals(order.getListing().getSeller().getId()))
                    .findFirst()
                    .orElse(null);
                if (sellerReview != null) {
                    order.setSellerReviewId(sellerReview.getId());
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                orders.save(order);
            }
            
            return ResponseEntity.ok(detail);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long orderId, 
                                        @RequestBody Map<String, String> request,
                                        @AuthenticationPrincipal User user) {
        return orders.findById(orderId).map(order -> {
            boolean isBuyer = order.getBuyer().getId().equals(user.getId());
            boolean isSeller = order.getListing().getSeller().getId().equals(user.getId());
            
            if (!isBuyer && !isSeller) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            if (!"PENDING".equals(order.getStatus()) && !"PAID".equals(order.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Order cannot be cancelled"));
            }
            
            order.setStatus("CANCELLED");
            order.setCancelledBy(isBuyer ? "BUYER" : "SELLER");
            order.setCancellationReason(request.get("reason"));
            order.setCancelledAt(Instant.now());
            order.setUpdatedAt(Instant.now());
            orders.save(order);
            
            // Reactivate listing
            Listing listing = order.getListing();
            listing.setStatus("ACTIVE");
            listings.save(listing);
            
            return ResponseEntity.ok(order);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{orderId}/confirm-payment")
    public ResponseEntity<?> confirmPayment(@PathVariable Long orderId, @AuthenticationPrincipal User buyer) {
        return orders.findById(orderId).map(order -> {
            if (!order.getBuyer().getId().equals(buyer.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            order.setBuyerPaymentConfirmed(true);
            order.setBuyerPaymentConfirmedAt(Instant.now());
            order.setUpdatedAt(Instant.now());
            orders.save(order);
            
            return ResponseEntity.ok(order);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{orderId}/confirm-received")
    public ResponseEntity<?> confirmReceived(@PathVariable Long orderId, @AuthenticationPrincipal User seller) {
        return orders.findById(orderId).map(order -> {
            if (!order.getListing().getSeller().getId().equals(seller.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            if (!order.getBuyerPaymentConfirmed()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Buyer has not confirmed payment"));
            }
            
            order.setSellerPaymentReceived(true);
            order.setSellerPaymentReceivedAt(Instant.now());
            order.setStatus("CLOSED");
            order.setClosedAt(Instant.now());
            order.setUpdatedAt(Instant.now());
            orders.save(order);
            
            return ResponseEntity.ok(order);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<Order>> getMyOrders(@AuthenticationPrincipal User user) {
        List<Order> myOrders = orders.findAllByUserIdWithRelations(user.getId());
        return ResponseEntity.ok(myOrders);
    }
}


