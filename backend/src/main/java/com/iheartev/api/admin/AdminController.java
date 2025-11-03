package com.iheartev.api.admin;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.user.UserRole;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final ListingRepository listings;
    public AdminController(ListingRepository listings) { this.listings = listings; }

    @PostMapping("/listings/{id}/verify")
    public Listing verify(@PathVariable Long id) {
        Listing l = listings.findById(id).orElseThrow();
        l.setConditionLabel("verified");
        return listings.save(l);
    }

    @GetMapping("/reports/summary")
    public Map<String, Object> summary() {
        List<Listing> all = listings.findAll();
        long sold = all.stream().filter(l -> "SOLD".equals(l.getStatus())).count();
        long approved = all.stream().filter(l -> "APPROVED".equals(l.getStatus()) && l.getDeletedAt() == null).count();
        long pending = all.stream().filter(l -> "PENDING".equals(l.getStatus()) && l.getDeletedAt() == null).count();
        long rejected = all.stream().filter(l -> "REJECTED".equals(l.getStatus()) && l.getDeletedAt() == null).count();
        Map<String, Object> m = new HashMap<>();
        m.put("approvedListings", approved);
        m.put("pendingListings", pending);
        m.put("rejectedListings", rejected);
        m.put("soldListings", sold);
        return m;
    }

    @GetMapping("/listings/pending")
    public List<Listing> getPendingListings() {
        return listings.findAll().stream()
                .filter(l -> "PENDING".equals(l.getStatus()) && l.getDeletedAt() == null)
                .toList();
    }

    @PostMapping("/listings/{id}/approve")
    public ResponseEntity<?> approveListing(@PathVariable Long id) {
        Optional<Listing> listingOpt = listings.findById(id);
        if (listingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Listing listing = listingOpt.get();
        if (listing.getDeletedAt() != null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot approve soft-deleted listing"));
        }
        if (!"PENDING".equals(listing.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Can only approve PENDING listings"));
        }
        listing.setStatus("APPROVED");
        listings.save(listing);
        return ResponseEntity.ok(listing);
    }

    @PostMapping("/listings/{id}/reject")
    public ResponseEntity<?> rejectListing(@PathVariable Long id) {
        Optional<Listing> listingOpt = listings.findById(id);
        if (listingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Listing listing = listingOpt.get();
        if (listing.getDeletedAt() != null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot reject soft-deleted listing"));
        }
        if (!"PENDING".equals(listing.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Can only reject PENDING listings"));
        }
        
        // Check if this listing was already edited after a previous rejection
        // If yes, soft delete it instead of just rejecting
        if (Boolean.TRUE.equals(listing.getEditedAfterRejection())) {
            // Second rejection after edit - soft delete
            listing.setDeletedAt(Instant.now());
            listing.setStatus("INACTIVE");
        } else {
            // First rejection - just reject, allow one edit
            listing.setStatus("REJECTED");
        }
        listings.save(listing);
        return ResponseEntity.ok(listing);
    }
}


