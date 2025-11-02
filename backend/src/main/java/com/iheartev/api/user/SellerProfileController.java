package com.iheartev.api.user;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Review;
import com.iheartev.api.social.ReviewRepository;
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

    public SellerProfileController(UserRepository userRepository, ListingRepository listingRepository,
                                   ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.listingRepository = listingRepository;
        this.reviewRepository = reviewRepository;
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
        profile.put("seller", Map.of(
                "id", seller.getId(),
                "fullName", seller.getFullName(),
                "email", seller.getEmail(),
                "phone", seller.getPhone() != null ? seller.getPhone() : ""
        ));
        profile.put("averageRating", avgRating);
        profile.put("totalReviews", reviews.size());
        profile.put("activeListings", currentListings);
        profile.put("soldListings", soldListings);
        profile.put("reviews", reviews.stream()
                .limit(5)
                .map(r -> Map.of(
                        "id", r.getId(),
                        "rating", r.getRating(),
                        "comment", r.getComment() != null ? r.getComment() : "",
                        "createdAt", r.getCreatedAt(),
                        "reviewer", Map.of(
                                "id", r.getReviewer().getId(),
                                "fullName", r.getReviewer().getFullName()
                        )
                ))
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
    public ResponseEntity<List<Review>> getAllReviews(@PathVariable Long sellerId) {
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getReviewee().getId().equals(sellerId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(reviews);
    }
}

