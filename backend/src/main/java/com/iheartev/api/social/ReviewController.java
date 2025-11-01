package com.iheartev.api.social;

import com.iheartev.api.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    private final ReviewRepository repo;

    public ReviewController(ReviewRepository repo) {
        this.repo = repo;
    }

    @PostMapping
    public Review create(@AuthenticationPrincipal User reviewer, @RequestBody Review r) {
        r.setId(null);
        r.setReviewer(reviewer);
        r.setCreatedAt(Instant.now());
        return repo.save(r);
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


