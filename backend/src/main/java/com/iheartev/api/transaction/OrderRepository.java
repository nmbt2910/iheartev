package com.iheartev.api.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("SELECT o FROM Order o WHERE o.listing.id = :listingId AND o.status NOT IN ('CANCELLED', 'CLOSED')")
    List<Order> findActiveOrdersByListingId(@Param("listingId") Long listingId);
    
    @Query("SELECT DISTINCT o FROM Order o " +
           "JOIN FETCH o.buyer " +
           "JOIN FETCH o.listing l " +
           "JOIN FETCH l.seller " +
           "WHERE o.buyer.id = :userId OR l.seller.id = :userId")
    List<Order> findAllByUserIdWithRelations(@Param("userId") Long userId);
    
    @Query("SELECT o FROM Order o " +
           "JOIN FETCH o.listing l " +
           "JOIN FETCH l.seller " +
           "WHERE o.id = :orderId")
    Optional<Order> findByIdWithRelations(@Param("orderId") Long orderId);
}


