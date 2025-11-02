package com.iheartev.api.social;

import com.iheartev.api.transaction.Order;
import com.iheartev.api.transaction.OrderRepository;
import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    private final ReviewRepository repo;
    private final OrderRepository orderRepository;

    public ReviewController(ReviewRepository repo, OrderRepository orderRepository) {
        this.repo = repo;
        this.orderRepository = orderRepository;
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User reviewer, @RequestBody Review r) {
        // Check if order exists and is closed
        if (r.getOrderId() != null) {
            Order order = orderRepository.findById(r.getOrderId()).orElse(null);
            if (order == null || !"CLOSED".equals(order.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Order must be closed to create review"));
            }
            
            // Check if user is buyer or seller
            boolean isBuyer = order.getBuyer().getId().equals(reviewer.getId());
            boolean isSeller = order.getListing().getSeller().getId().equals(reviewer.getId());
            
            if (!isBuyer && !isSeller) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            // Set reviewee based on role
            if (isBuyer) {
                r.setReviewee(order.getListing().getSeller());
            } else {
                r.setReviewee(order.getBuyer());
            }
        }
        
        r.setId(null);
        r.setReviewer(reviewer);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        r.setEditCount(0);
        return ResponseEntity.ok(repo.save(r));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Review updatedReview, 
                                   @AuthenticationPrincipal User reviewer) {
        return repo.findById(id).map(existing -> {
            if (!existing.getReviewer().getId().equals(reviewer.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }
            
            // Check edit count and time limit
            if (existing.getEditCount() >= 2) {
                return ResponseEntity.badRequest().body(Map.of("error", "Maximum edit limit reached"));
            }
            
            long daysSinceCreation = ChronoUnit.DAYS.between(existing.getCreatedAt(), Instant.now());
            if (daysSinceCreation > 90) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot edit review after 90 days"));
            }
            
            existing.setRating(updatedReview.getRating());
            existing.setComment(updatedReview.getComment());
            existing.setUpdatedAt(Instant.now());
            existing.setEditCount(existing.getEditCount() + 1);
            
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @AuthenticationPrincipal User reviewer) {
        return repo.findById(id).map(existing -> {
            if (!existing.getReviewer().getId().equals(reviewer.getId())) return ResponseEntity.status(403).build();
            repo.delete(existing);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}


