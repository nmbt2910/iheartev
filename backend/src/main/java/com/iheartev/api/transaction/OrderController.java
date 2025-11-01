package com.iheartev.api.transaction;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

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
        if (listing == null || !"ACTIVE".equals(listing.getStatus())) return ResponseEntity.badRequest().body(Map.of("error", "Listing unavailable"));
        Order order = new Order();
        order.setListing(listing);
        order.setBuyer(buyer);
        order.setAmount(listing.getPrice());
        order.setStatus("PENDING");
        order.setCreatedAt(Instant.now());
        orders.save(order);
        listing.setStatus("SOLD");
        listings.save(listing);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{orderId}/pay")
    public ResponseEntity<?> pay(@PathVariable Long orderId, @AuthenticationPrincipal User buyer) {
        return orders.findById(orderId).map(o -> {
            if (!o.getBuyer().getId().equals(buyer.getId())) return ResponseEntity.status(403).build();
            o.setStatus("PAID");
            orders.save(o);
            return ResponseEntity.ok(o);
        }).orElse(ResponseEntity.notFound().build());
    }
}


