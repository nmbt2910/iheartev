package com.iheartev.api.transaction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Review;
import com.iheartev.api.social.ReviewRepository;
import com.iheartev.api.user.User;
import com.iheartev.api.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders/{orderId}/ai")
public class OrderDetailAIController {
    private static final Logger logger = LoggerFactory.getLogger(OrderDetailAIController.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final ReviewRepository reviewRepository;

    public OrderDetailAIController(OrderRepository orderRepository, ListingRepository listingRepository,
                                   ReviewRepository reviewRepository) {
        this.orderRepository = orderRepository;
        this.listingRepository = listingRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping("/insights")
    public ResponseEntity<?> getAIInsights(@PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return orderRepository.findById(orderId).map(order -> {
            // Verify access
            boolean isBuyer = order.getBuyer().getId().equals(user.getId());
            boolean isSeller = order.getListing().getSeller().getId().equals(user.getId());
            if (!isBuyer && !isSeller) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }

            Listing listing = order.getListing();
            User seller = listing.getSeller();

            // Gather seller statistics
            List<Review> sellerReviews = reviewRepository.findAll().stream()
                    .filter(r -> r.getReviewee().getId().equals(seller.getId()))
                    .collect(Collectors.toList());
            
            List<Listing> sellerListings = listingRepository.findAll().stream()
                    .filter(l -> l.getSeller().getId().equals(seller.getId()))
                    .collect(Collectors.toList());

            double avgRating = sellerReviews.stream()
                    .mapToInt(Review::getRating)
                    .average()
                    .orElse(0.0);

            long soldCount = sellerListings.stream()
                    .filter(l -> "SOLD".equals(l.getStatus()))
                    .count();

            // Build AI prompt
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("Bạn là chuyên gia tư vấn mua bán xe điện tại thị trường Việt Nam. ");
            promptBuilder.append("Hãy phân tích và đưa ra nhận định về giao dịch này:\n\n");
            
            promptBuilder.append("THÔNG TIN XE:\n");
            promptBuilder.append("- Hãng: ").append(listing.getBrand()).append("\n");
            promptBuilder.append("- Model: ").append(listing.getModel()).append("\n");
            promptBuilder.append("- Năm: ").append(listing.getYear()).append("\n");
            promptBuilder.append("- Giá: ").append(listing.getPrice()).append(" VNĐ\n");
            promptBuilder.append("- Dung lượng pin: ").append(listing.getBatteryCapacityKWh()).append(" kWh\n");
            if (listing.getMileageKm() != null) {
                promptBuilder.append("- Số km đã đi: ").append(listing.getMileageKm()).append(" km\n");
            }
            
            promptBuilder.append("\nTHÔNG TIN NGƯỜI BÁN:\n");
            promptBuilder.append("- Tên: ").append(seller.getFullName()).append("\n");
            promptBuilder.append("- Đánh giá trung bình: ").append(String.format("%.1f", avgRating)).append("/5\n");
            promptBuilder.append("- Tổng số đánh giá: ").append(sellerReviews.size()).append("\n");
            promptBuilder.append("- Số tin đã bán: ").append(soldCount).append("\n");
            promptBuilder.append("- Tổng số tin đăng: ").append(sellerListings.size()).append("\n");
            
            if (!sellerReviews.isEmpty()) {
                promptBuilder.append("- Đánh giá gần đây:\n");
                sellerReviews.stream().limit(3).forEach(r -> {
                    promptBuilder.append("  + ").append(r.getRating()).append(" sao: ");
                    promptBuilder.append(r.getComment() != null ? r.getComment() : "").append("\n");
                });
            }

            promptBuilder.append("\nYÊU CẦU PHÂN TÍCH:\n");
            promptBuilder.append("1. Đánh giá xem giá bán có phù hợp với thị trường không (so sánh với giá trung bình)\n");
            promptBuilder.append("2. Nhận định về độ tin cậy của người bán dựa trên lịch sử bán hàng và đánh giá\n");
            promptBuilder.append("3. Đưa ra khuyến nghị ngắn gọn: nên mua hay không, và lý do\n");
            promptBuilder.append("4. Trả lời NGẮN GỌN, tối đa 5 câu, tập trung vào thông tin quan trọng nhất\n");

            String prompt = promptBuilder.toString();

            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=" + geminiApiKey;
                String body = "{\"contents\":[{\"parts\":[{\"text\": " + quote(prompt) + "}]}]}";

                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .timeout(java.time.Duration.ofSeconds(30))
                        .build();

                HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());

                if (resp.statusCode() == 200) {
                    String responseBody = resp.body();
                    String extractedText = extractTextFromResponse(responseBody);
                    if (extractedText != null && !extractedText.trim().isEmpty()) {
                        Map<String, Object> result = new HashMap<>();
                        result.put("insights", extractedText);
                        result.put("sellerStats", Map.of(
                                "averageRating", avgRating,
                                "totalReviews", sellerReviews.size(),
                                "soldListings", soldCount,
                                "totalListings", sellerListings.size()
                        ));
                        return ResponseEntity.ok(result);
                    } else {
                        return ResponseEntity.status(503).body(Map.of("error", "Không thể xử lý phản hồi từ AI"));
                    }
                } else {
                    return ResponseEntity.status(resp.statusCode()).body(Map.of("error", "Lỗi kết nối AI: " + resp.statusCode()));
                }
            } catch (Exception e) {
                logger.error("Error calling Gemini API: {}", e.getMessage(), e);
                return ResponseEntity.status(503).body(Map.of("error", "Không thể kết nối đến dịch vụ AI"));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    private String quote(String text) {
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    private String extractTextFromResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode content = candidates.get(0).path("content");
                JsonNode parts = content.path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    JsonNode textNode = parts.get(0).path("text");
                    if (textNode.isTextual()) {
                        return textNode.asText();
                    }
                }
            }
            return null;
        } catch (Exception e) {
            logger.error("Error parsing Gemini response: {}", e.getMessage());
            return null;
        }
    }
}

