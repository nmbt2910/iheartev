package com.iheartev.api.admin;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.user.UserRole;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        long active = all.stream().filter(l -> "ACTIVE".equals(l.getStatus())).count();
        Map<String, Object> m = new HashMap<>();
        m.put("activeListings", active);
        m.put("soldListings", sold);
        return m;
    }
}


