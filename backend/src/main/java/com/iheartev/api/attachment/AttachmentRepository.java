package com.iheartev.api.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByListingId(Long listingId);
    void deleteByListingId(Long listingId);
}

