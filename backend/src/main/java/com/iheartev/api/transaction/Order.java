package com.iheartev.api.transaction;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Listing listing;

    @ManyToOne(optional = false)
    private User buyer;

    private Double amount;
    private String status; // PENDING, PAID, CANCELLED, CLOSED
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    // Cancellation fields
    @Column(name = "cancelled_by")
    private String cancelledBy; // "BUYER" or "SELLER"
    @Column(name = "cancellation_reason")
    private String cancellationReason;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    
    // Payment confirmation
    @Column(name = "buyer_payment_confirmed")
    private Boolean buyerPaymentConfirmed;
    @Column(name = "buyer_payment_confirmed_at")
    private Instant buyerPaymentConfirmedAt;
    @Column(name = "seller_payment_received")
    private Boolean sellerPaymentReceived;
    @Column(name = "seller_payment_received_at")
    private Instant sellerPaymentReceivedAt;
    @Column(name = "closed_at")
    private Instant closedAt;
    
    @Column(name = "buyer_review_id")
    private Long buyerReviewId; // Reference to review from buyer to seller
    @Column(name = "seller_review_id")
    private Long sellerReviewId; // Reference to review from seller to buyer
}


