package com.iheartev.api.listing;

import com.iheartev.api.user.User;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Optional;

@RestController
@RequestMapping("/api/listings")
public class ListingController {
    private final ListingRepository repository;

    public ListingController(ListingRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Page<Listing> search(
            @RequestParam Optional<String> type,
            @RequestParam Optional<String> brand,
            @RequestParam Optional<String> status,
            @RequestParam Optional<Integer> minYear,
            @RequestParam Optional<Integer> maxYear,
            @RequestParam Optional<Integer> minCapacity,
            @RequestParam Optional<Double> minPrice,
            @RequestParam Optional<Double> maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Specification<Listing> spec = null; // Start with no filter to return all by default
        // Only filter by status if explicitly provided
        if (status.isPresent()) {
            spec = Specification.where((r, q, cb) -> cb.equal(r.get("status"), status.get()));
        }
        if (type.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.equal(r.get("type"), type.get()))
                                  : spec.and((r, q, cb) -> cb.equal(r.get("type"), type.get()));
        }
        if (brand.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.like(cb.lower(r.get("brand")), "%"+brand.get().toLowerCase()+"%"))
                                  : spec.and((r, q, cb) -> cb.like(cb.lower(r.get("brand")), "%"+brand.get().toLowerCase()+"%"));
        }
        if (minYear.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("year"), minYear.get()))
                                  : spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("year"), minYear.get()));
        }
        if (maxYear.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.lessThanOrEqualTo(r.get("year"), maxYear.get()))
                                  : spec.and((r, q, cb) -> cb.lessThanOrEqualTo(r.get("year"), maxYear.get()));
        }
        if (minCapacity.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("batteryCapacityKWh"), minCapacity.get()))
                                  : spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("batteryCapacityKWh"), minCapacity.get()));
        }
        if (minPrice.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("price"), minPrice.get()))
                                  : spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("price"), minPrice.get()));
        }
        if (maxPrice.isPresent()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> cb.lessThanOrEqualTo(r.get("price"), maxPrice.get()))
                                  : spec.and((r, q, cb) -> cb.lessThanOrEqualTo(r.get("price"), maxPrice.get()));
        }
        return repository.findAll(spec, PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Listing> get(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Listing create(@AuthenticationPrincipal User seller, @Valid @RequestBody Listing listing) {
        listing.setId(null);
        listing.setSeller(seller);
        listing.setStatus("ACTIVE");
        listing.setCreatedAt(Instant.now());
        return repository.save(listing);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @AuthenticationPrincipal User user, @Valid @RequestBody Listing dto) {
        return repository.findById(id).map(existing -> {
            if (!existing.getSeller().getId().equals(user.getId())) return ResponseEntity.status(403).build();
            existing.setBrand(dto.getBrand());
            existing.setModel(dto.getModel());
            existing.setYear(dto.getYear());
            existing.setMileageKm(dto.getMileageKm());
            existing.setBatteryCapacityKWh(dto.getBatteryCapacityKWh());
            existing.setConditionLabel(dto.getConditionLabel());
            existing.setDescription(dto.getDescription());
            existing.setPrice(dto.getPrice());
            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return repository.findById(id).map(existing -> {
            if (!existing.getSeller().getId().equals(user.getId())) return ResponseEntity.status(403).build();
            repository.delete(existing);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}


