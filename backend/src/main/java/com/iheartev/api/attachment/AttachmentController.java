package com.iheartev.api.attachment;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {
    private final AttachmentRepository attachmentRepository;
    private final com.iheartev.api.listing.ListingRepository listingRepository;
    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    public AttachmentController(AttachmentRepository attachmentRepository, 
                                com.iheartev.api.listing.ListingRepository listingRepository) {
        this.attachmentRepository = attachmentRepository;
        this.listingRepository = listingRepository;
        // Create upload directory if it doesn't exist
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            System.err.println("Failed to create upload directory: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> uploadFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("listingId") Long listingId
    ) {
        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one file is required"));
        }

        // Validate listing exists
        com.iheartev.api.listing.Listing listing = listingRepository.findById(listingId).orElse(null);
        if (listing == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Listing not found"));
        }

        int imageCount = 0;
        int videoCount = 0;
        List<Attachment> savedAttachments = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                // Validate file size
                if (file.getSize() > MAX_FILE_SIZE) {
                    errors.add("File " + file.getOriginalFilename() + " exceeds 10MB limit");
                    continue;
                }

                // Determine file type
                String contentType = file.getContentType();
                String fileType;
                if (contentType != null && contentType.startsWith("image/")) {
                    fileType = "IMAGE";
                    imageCount++;
                    if (imageCount > 5) {
                        errors.add("Maximum 5 images allowed");
                        continue;
                    }
                } else if (contentType != null && contentType.startsWith("video/")) {
                    fileType = "VIDEO";
                    videoCount++;
                    if (videoCount > 1) {
                        errors.add("Maximum 1 video allowed");
                        continue;
                    }
                } else {
                    errors.add("File " + file.getOriginalFilename() + " is not an image or video");
                    continue;
                }

                // Generate unique filename
                String originalFilename = file.getOriginalFilename();
                String extension = originalFilename != null && originalFilename.contains(".") 
                    ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
                    : "";
                String uniqueFilename = UUID.randomUUID().toString() + extension;
                Path filePath = Paths.get(UPLOAD_DIR, uniqueFilename);

                // Save file
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                // Save attachment record
                Attachment attachment = new Attachment();
                attachment.setType(fileType);
                attachment.setFileName(originalFilename);
                attachment.setFilePath(filePath.toString());
                attachment.setFileSize(file.getSize());
                attachment.setListingId(listingId);
                savedAttachments.add(attachmentRepository.save(attachment));

            } catch (IOException e) {
                errors.add("Failed to upload " + file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        if (savedAttachments.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", 
                errors.isEmpty() ? "Failed to upload files" : String.join("; ", errors)));
        }
        
        // Return the saved attachments directly (array)
        return ResponseEntity.ok(savedAttachments);
    }

    @GetMapping("/listing/{listingId}")
    public ResponseEntity<List<Attachment>> getAttachmentsByListing(@PathVariable Long listingId) {
        List<Attachment> attachments = attachmentRepository.findByListingId(listingId);
        return ResponseEntity.ok(attachments);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadFile(@PathVariable Long id) {
        return attachmentRepository.findById(id).map(attachment -> {
            try {
                Path filePath = Paths.get(attachment.getFilePath());
                Resource resource = new UrlResource(filePath.toUri());
                
                if (resource.exists() && resource.isReadable()) {
                    String contentType = attachment.getType().equals("IMAGE") 
                        ? MediaType.IMAGE_JPEG_VALUE 
                        : "video/mp4";
                    
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .header(HttpHeaders.CONTENT_DISPOSITION, 
                                "inline; filename=\"" + attachment.getFileName() + "\"")
                            .body(resource);
                } else {
                    return ResponseEntity.<Resource>notFound().build();
                }
            } catch (Exception e) {
                return ResponseEntity.<Resource>notFound().build();
            }
        }).orElse(ResponseEntity.<Resource>notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long id) {
        return attachmentRepository.findById(id).map(attachment -> {
            try {
                // Delete file
                Path filePath = Paths.get(attachment.getFilePath());
                Files.deleteIfExists(filePath);
                // Delete record
                attachmentRepository.delete(attachment);
                return ResponseEntity.noContent().build();
            } catch (IOException e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to delete file"));
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}

