package com.iheartev.api.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByListingId(Long listingId);
    
    @Modifying
    @Query("DELETE FROM Attachment a WHERE a.listingId = :listingId")
    void deleteByListingId(@Param("listingId") Long listingId);
}

