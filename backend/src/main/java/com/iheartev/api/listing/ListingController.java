package com.iheartev.api.listing;

import com.iheartev.api.payment.PaymentInfo;
import com.iheartev.api.payment.PaymentInfoRepository;
import com.iheartev.api.transaction.Order;
import com.iheartev.api.transaction.OrderRepository;
import com.iheartev.api.user.User;
import com.iheartev.api.social.FavoriteRepository;
import com.iheartev.api.attachment.AttachmentRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/listings")
public class ListingController {
    private final ListingRepository repository;
    private final PaymentInfoRepository paymentInfoRepository;
    private final OrderRepository orderRepository;
    private final FavoriteRepository favoriteRepository;
    private final AttachmentRepository attachmentRepository;

    public ListingController(ListingRepository repository, PaymentInfoRepository paymentInfoRepository,
                            OrderRepository orderRepository, FavoriteRepository favoriteRepository,
                            AttachmentRepository attachmentRepository) {
        this.repository = repository;
        this.paymentInfoRepository = paymentInfoRepository;
        this.orderRepository = orderRepository;
        this.favoriteRepository = favoriteRepository;
        this.attachmentRepository = attachmentRepository;
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
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        // Get all listing IDs with active orders
        Set<Long> listingsWithActiveOrders = orderRepository.findAll().stream()
                .filter(o -> !"CANCELLED".equals(o.getStatus()) && !"CLOSED".equals(o.getStatus()))
                .map(o -> o.getListing().getId())
                .collect(Collectors.toSet());
        
        final Set<Long> excludedListings = listingsWithActiveOrders;
        Specification<Listing> spec = null;
        
        // Default to showing only APPROVED/ACTIVE listings unless status is explicitly provided
        // For backward compatibility: show both APPROVED (new) and ACTIVE (old) statuses
        if (status.isPresent()) {
            spec = Specification.where((r, q, cb) -> cb.equal(r.get("status"), status.get()));
            // Only filter by deletedAt if the column exists (will be added after migration)
            // For now, skip this filter to avoid 403 errors if column doesn't exist
            // After migration runs, uncomment the line below:
            // spec = spec.and((r, q, cb) -> cb.isNull(r.get("deletedAt")));
        } else {
            // Default: show APPROVED or ACTIVE listings (supports both old and new data)
            spec = Specification.where((r, q, cb) -> 
                cb.or(
                    cb.equal(r.get("status"), "APPROVED"),
                    cb.equal(r.get("status"), "ACTIVE")
                )
            );
            // Only filter by deletedAt if the column exists (will be added after migration)
            // After migration runs, uncomment the line below:
            // spec = spec.and((r, q, cb) -> cb.isNull(r.get("deletedAt")));
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
        
        // Exclude listings with active orders unless status is explicitly filtered
        if (!status.isPresent() && !excludedListings.isEmpty()) {
            spec = (spec == null) ? Specification.where((r, q, cb) -> 
                    cb.not(r.get("id").in(excludedListings)))
                : spec.and((r, q, cb) -> 
                    cb.not(r.get("id").in(excludedListings)));
        }
        
        // Sort by createdAt descending (newest first)
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return repository.findAll(spec, PageRequest.of(page, size, sort));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Listing> get(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Optional<Listing> listingOpt = repository.findById(id);
        if (listingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Listing listing = listingOpt.get();
        
        // If listing is soft-deleted, don't show it to anyone (including the seller)
        if (listing.getDeletedAt() != null) {
            return ResponseEntity.notFound().build();
        }
        
        // Get authenticated user from SecurityContext if @AuthenticationPrincipal is null
        // This handles cases where endpoint is permitAll() but token is still sent
        if (user == null) {
            try {
                Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (principal instanceof User) {
                    user = (User) principal;
                }
            } catch (Exception e) {
                // No authenticated user - that's okay, we'll check permissions below
            }
        }
        // If listing is PENDING or REJECTED, only allow seller and admin to view it
        if ("PENDING".equals(listing.getStatus()) || "REJECTED".equals(listing.getStatus())) {
            if (listing.getSeller() == null) {
                return ResponseEntity.notFound().build();
            }
            // Allow seller or admin to view - seller should always be able to view their own listings
            if (user != null) {
                boolean isSeller = listing.getSeller().getId() != null && 
                                  listing.getSeller().getId().equals(user.getId());
                boolean isAdmin = user.getRole() != null && user.getRole().name().equals("ADMIN");
                if (isSeller || isAdmin) {
                    return ResponseEntity.ok(listing);
                }
            }
            // Not seller or admin - return 404
            // Log for debugging (only in dev, could use proper logger)
            System.out.println("Access denied to listing " + id + 
                " - Status: " + listing.getStatus() + 
                ", Seller ID: " + (listing.getSeller() != null ? listing.getSeller().getId() : "null") +
                ", User ID: " + (user != null ? user.getId() : "null"));
            return ResponseEntity.notFound().build();
        }
        // For all other statuses (APPROVED, ACTIVE, SOLD), anyone can view
        return ResponseEntity.ok(listing);
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User seller, @Valid @RequestBody Listing listing) {
        // Validate payment info if provided
        if (listing.getPaymentInfo() != null) {
            PaymentInfo paymentInfo = listing.getPaymentInfo();
            if ("VIETQR".equals(paymentInfo.getPaymentMethod())) {
                if (paymentInfo.getBankCode() == null || paymentInfo.getBankName() == null ||
                    paymentInfo.getAccountNumber() == null || paymentInfo.getAmount() == null ||
                    paymentInfo.getTransactionContent() == null) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("error", 
                        "All VietQR payment fields are required: bankCode, bankName, accountNumber, amount, transactionContent"));
                }
            }
            // Save payment info separately first
            paymentInfo.setId(null);
            PaymentInfo savedPaymentInfo = paymentInfoRepository.save(paymentInfo);
            listing.setPaymentInfo(savedPaymentInfo);
        }
        
        listing.setId(null);
        listing.setSeller(seller);
        listing.setStatus("PENDING");
        listing.setCreatedAt(Instant.now());
        listing.setEditedAfterRejection(false);
        listing.setDeletedAt(null);
        Listing saved = repository.save(listing);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @AuthenticationPrincipal User user, @Valid @RequestBody Listing dto) {
        return repository.findById(id).map(existing -> {
            if (!existing.getSeller().getId().equals(user.getId())) return ResponseEntity.status(403).build();
            
            // Don't allow updates to soft-deleted listings (they shouldn't be accessible anyway)
            if (existing.getDeletedAt() != null) {
                return ResponseEntity.notFound().build();
            }
            
            // Handle rejection workflow: if listing is REJECTED, allow one edit before resubmission
            if ("REJECTED".equals(existing.getStatus())) {
                if (Boolean.TRUE.equals(existing.getEditedAfterRejection())) {
                    // Already edited once after rejection, don't allow another edit
                    return ResponseEntity.badRequest()
                            .body(java.util.Map.of("error", 
                                "Listing was already edited after rejection. It cannot be edited again. If rejected again, it will be automatically deleted."));
                }
                // Mark as edited after rejection and change status back to PENDING for resubmission
                existing.setEditedAfterRejection(true);
                existing.setStatus("PENDING");
            }
            
            // Validate payment info if provided
            if (dto.getPaymentInfo() != null) {
                PaymentInfo paymentInfo = dto.getPaymentInfo();
                if ("VIETQR".equals(paymentInfo.getPaymentMethod())) {
                    if (paymentInfo.getBankCode() == null || paymentInfo.getBankName() == null ||
                        paymentInfo.getAccountNumber() == null || paymentInfo.getAmount() == null ||
                        paymentInfo.getTransactionContent() == null) {
                        return ResponseEntity.badRequest().body(java.util.Map.of("error", 
                            "All VietQR payment fields are required: bankCode, bankName, accountNumber, amount, transactionContent"));
                    }
                }
                
                // Update or create payment info
                PaymentInfo existingPaymentInfo = existing.getPaymentInfo();
                if (existingPaymentInfo != null && existingPaymentInfo.getId() != null) {
                    // Update existing payment info
                    existingPaymentInfo.setPaymentMethod(paymentInfo.getPaymentMethod());
                    if ("VIETQR".equals(paymentInfo.getPaymentMethod())) {
                        existingPaymentInfo.setBankCode(paymentInfo.getBankCode());
                        existingPaymentInfo.setBankName(paymentInfo.getBankName());
                        existingPaymentInfo.setAccountNumber(paymentInfo.getAccountNumber());
                        existingPaymentInfo.setAmount(paymentInfo.getAmount());
                        existingPaymentInfo.setTransactionContent(paymentInfo.getTransactionContent());
                    } else {
                        // Clear VietQR fields for CASH payment
                        existingPaymentInfo.setBankCode(null);
                        existingPaymentInfo.setBankName(null);
                        existingPaymentInfo.setAccountNumber(null);
                        existingPaymentInfo.setAmount(null);
                        existingPaymentInfo.setTransactionContent(null);
                    }
                    paymentInfoRepository.save(existingPaymentInfo);
                    existing.setPaymentInfo(existingPaymentInfo);
                } else {
                    // Create new payment info
                    paymentInfo.setId(null);
                    PaymentInfo savedPaymentInfo = paymentInfoRepository.save(paymentInfo);
                    existing.setPaymentInfo(savedPaymentInfo);
                }
            }
            
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
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return repository.findById(id).map(existing -> {
            if (!existing.getSeller().getId().equals(user.getId())) return ResponseEntity.status(403).build();
            
            // Check for active orders - prevent soft delete if there are active orders
            List<Order> activeOrders = orderRepository.findActiveOrdersByListingId(id);
            if (!activeOrders.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(java.util.Map.of("error", "Cannot delete listing with active orders"));
            }
            
            // Remove all favorites associated with this listing (so other users won't see it)
            favoriteRepository.deleteByListingId(id);
            
            // Soft delete: Set status to INACTIVE instead of actually deleting
            existing.setStatus("INACTIVE");
            repository.save(existing);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}


