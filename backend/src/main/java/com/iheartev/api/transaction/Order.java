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
    private String status; // PENDING, PAID, CANCELLED
    private Instant createdAt;
}


