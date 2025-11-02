package com.iheartev.api.transaction;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository orders;
    private final ListingRepository listings;

    public OrderController(OrderRepository orders, ListingRepository listings) {
        this.orders = orders;
        this.listings = listings;
    }

    @PostMapping("/buy-now/{listingId}")
    public ResponseEntity<?> buyNow(@PathVariable Long listingId, @AuthenticationPrincipal User buyer) {
        Listing listing = listings.findById(listingId).orElse(null);
        if (listing == null || !"ACTIVE".equals(listing.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Listing unavailable"));
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
            // Check if user is buyer or seller
            boolean isBuyer = order.getBuyer().getId().equals(user.getId());
            boolean isSeller = order.getListing().getSeller().getId().equals(user.getId());
            
            if (!isBuyer && !isSeller) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            Map<String, Object> detail = new HashMap<>();
            detail.put("order", order);
            detail.put("listing", order.getListing());
            detail.put("seller", Map.of(
                    "id", order.getListing().getSeller().getId(),
                    "fullName", order.getListing().getSeller().getFullName(),
                    "email", order.getListing().getSeller().getEmail(),
                    "phone", order.getListing().getSeller().getPhone() != null ? 
                            order.getListing().getSeller().getPhone() : ""
            ));
            detail.put("buyer", Map.of(
                    "id", order.getBuyer().getId(),
                    "fullName", order.getBuyer().getFullName(),
                    "email", order.getBuyer().getEmail(),
                    "phone", order.getBuyer().getPhone() != null ? 
                            order.getBuyer().getPhone() : ""
            ));
            detail.put("paymentInfo", order.getListing().getPaymentInfo());
            detail.put("isBuyer", isBuyer);
            detail.put("isSeller", isSeller);
            
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
        List<Order> myOrders = orders.findAll().stream()
                .filter(o -> o.getBuyer().getId().equals(user.getId()) || 
                           o.getListing().getSeller().getId().equals(user.getId()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(myOrders);
    }
}


