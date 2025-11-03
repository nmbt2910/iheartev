package com.iheartev.api.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    @Query("SELECT f FROM Favorite f WHERE f.user.id = :userId AND f.listing.id = :listingId")
    Optional<Favorite> findByUserAndListingId(@Param("userId") Long userId, @Param("listingId") Long listingId);
    
    @Query("SELECT f FROM Favorite f WHERE f.listing.id = :listingId")
    java.util.List<Favorite> findByListingId(@Param("listingId") Long listingId);
    
    @Modifying
    @Query("DELETE FROM Favorite f WHERE f.listing.id = :listingId")
    void deleteByListingId(@Param("listingId") Long listingId);
}


