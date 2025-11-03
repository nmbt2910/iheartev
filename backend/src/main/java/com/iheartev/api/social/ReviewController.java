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

    @GetMapping("/{id}")
    public ResponseEntity<?> getReview(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return repo.findById(id).map(review -> {
            // Only allow reviewer to view their own review
            if (!review.getReviewer().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Không có quyền truy cập"));
            }
            return ResponseEntity.ok(review);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User reviewer, @RequestBody Review r) {
        // Order ID is required for all reviews
        if (r.getOrderId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã đơn hàng là bắt buộc"));
        }
        
        // Check if order exists and is closed
        Order order = orderRepository.findById(r.getOrderId()).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy đơn hàng"));
        }
        if (!"CLOSED".equals(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đơn hàng phải được đóng để có thể đánh giá"));
        }
        
        // Check if user is buyer or seller
        boolean isBuyer = order.getBuyer().getId().equals(reviewer.getId());
        boolean isSeller = order.getListing().getSeller().getId().equals(reviewer.getId());
        
        if (!isBuyer && !isSeller) {
            return ResponseEntity.status(403).body(Map.of("error", "Không có quyền truy cập"));
        }
        
        // Check if review already exists for this order and reviewer
        boolean reviewExists = repo.findAll().stream()
            .anyMatch(existing -> existing.getOrderId() != null && 
                     existing.getOrderId().equals(r.getOrderId()) &&
                     existing.getReviewer().getId().equals(reviewer.getId()));
        
        if (reviewExists) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bạn đã đánh giá đơn hàng này rồi. Vui lòng sử dụng chức năng cập nhật đánh giá."));
        }
        
        // Set reviewee based on role
        if (isBuyer) {
            r.setReviewee(order.getListing().getSeller());
        } else {
            r.setReviewee(order.getBuyer());
        }
        
        r.setId(null);
        r.setReviewer(reviewer);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        r.setEditCount(0);
        
        // Save the review first
        Review savedReview = repo.save(r);
        
        // Update the order with the review ID
        if (isBuyer) {
            order.setBuyerReviewId(savedReview.getId());
        } else {
            order.setSellerReviewId(savedReview.getId());
        }
        orderRepository.save(order);
        
        return ResponseEntity.ok(savedReview);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Review updatedReview, 
                                   @AuthenticationPrincipal User reviewer) {
        return repo.findById(id).map(existing -> {
            if (!existing.getReviewer().getId().equals(reviewer.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Không có quyền truy cập"));
            }
            
            // Check edit count and time limit
            if (existing.getEditCount() >= 2) {
                return ResponseEntity.badRequest().body(Map.of("error", "Bạn đã chỉnh sửa đánh giá tối đa 2 lần. Không thể chỉnh sửa thêm."));
            }
            
            long daysSinceCreation = ChronoUnit.DAYS.between(existing.getCreatedAt(), Instant.now());
            if (daysSinceCreation > 90) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không thể chỉnh sửa đánh giá sau 90 ngày"));
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


