package com.iheartev.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
 

@RestController
@RequestMapping("/api/ai")
public class PriceSuggestController {
    private static final Logger logger = LoggerFactory.getLogger(PriceSuggestController.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;


    @PostMapping(value = "/suggest-price", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> suggest(@RequestBody String featuresJson) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return ResponseEntity.status(503).body("Gemini API key is not configured");
        }
        String prompt = "Suggest a fair market price (in USD) for the following used EV/battery features as a single JSON {\"price\": number, \"reason\": string}. Features: " + featuresJson;
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
        String body = "{\"contents\":[{\"parts\":[{\"text\": " + quote(prompt) + "}]}]}";
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
        return ResponseEntity.status(resp.statusCode()).body(resp.body());
    }

    @PostMapping(value = "/overview", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> overview(@RequestBody String listingJson) {
        logger.info("=== AI OVERVIEW ENDPOINT CALLED ===");
        logger.info("Request received at /api/ai/overview");
        logger.info("Request body length: {}", listingJson != null ? listingJson.length() : 0);
        logger.info("Gemini API key configured: {}", geminiApiKey != null && !geminiApiKey.isBlank());
        
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            logger.error("Gemini API key is not configured");
            return ResponseEntity.status(503).body("Gemini API key is not configured");
        }

        String prompt = "Bạn là chuyên gia đánh giá xe điện. Hãy phân tích chiếc xe điện sau đây và cung cấp đánh giá tổng quát bằng tiếng Việt theo định dạng sau:\n" +
                "1. Đánh giá chung về chiếc xe (ưu điểm, nhược điểm, đặc điểm nổi bật)\n" +
                "2. So sánh giá với thị trường (giá đề xuất này hợp lý không, cao hay thấp so với thị trường)\n" +
                "3. Lời khuyên hữu ích (những điểm cần lưu ý khi mua, kiểm tra, bảo dưỡng)\n\n" +
                "Thông tin xe: " + listingJson + "\n\n" +
                "Hãy trả lời một cách chuyên nghiệp, chi tiết và dễ hiểu. Định dạng đầu ra: văn bản thuần túy, không cần JSON.";

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=" + geminiApiKey;
            String body = "{\"contents\":[{\"parts\":[{\"text\": " + quote(prompt) + "}]}]}";
            logger.info("Calling Gemini API: {}", url.replace(geminiApiKey, "***"));
            
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(java.time.Duration.ofSeconds(30))
                    .build();
            
            HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            logger.info("Gemini API response status: {}", resp.statusCode());
            
            if (resp.statusCode() == 200) {
                // Extract text from Gemini response
                String responseBody = resp.body();
                logger.debug("Gemini response body length: {}", responseBody.length());
                String extractedText = extractTextFromResponse(responseBody);
                if (extractedText != null && !extractedText.trim().isEmpty()) {
                    logger.info("Successfully generated AI overview");
                    return ResponseEntity.ok(extractedText);
                } else {
                    logger.warn("Empty or null text extracted from Gemini response");
                    return ResponseEntity.status(503).body("Không thể xử lý phản hồi từ AI. Vui lòng thử lại sau.");
                }
            } else {
                logger.error("Gemini API returned status: {}, response: {}", resp.statusCode(), 
                        resp.body() != null && resp.body().length() < 500 ? resp.body() : "response too long");
                return ResponseEntity.status(resp.statusCode()).body("Không thể kết nối đến dịch vụ AI. Lỗi: " + resp.statusCode());
            }
        } catch (Exception e) {
            logger.error("Error calling Gemini API: {}", e.getMessage(), e);
            return ResponseEntity.status(503).body("Không thể kết nối đến dịch vụ AI. Vui lòng thử lại sau. Lỗi: " + e.getMessage());
        }
    }

    private String extractTextFromResponse(String responseBody) {
        try {
            // Parse JSON response using Jackson
            JsonNode rootNode = objectMapper.readTree(responseBody);
            
            // Navigate to: candidates[0].content.parts[0].text
            JsonNode candidates = rootNode.get("candidates");
            if (candidates != null && candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.get("content");
                if (content != null) {
                    JsonNode parts = content.get("parts");
                    if (parts != null && parts.isArray() && parts.size() > 0) {
                        JsonNode firstPart = parts.get(0);
                        JsonNode text = firstPart.get("text");
                        if (text != null && text.isTextual()) {
                            String extractedText = text.asText();
                            logger.debug("Successfully extracted text from JSON response, length: {}", extractedText.length());
                            return extractedText;
                        }
                    }
                }
            }
            
            logger.warn("Could not find text in expected JSON structure");
            logger.debug("Response body: {}", responseBody.length() < 500 ? responseBody : responseBody.substring(0, 500) + "...");
            // Fallback: return error message instead of raw JSON
            return "Không thể xử lý phản hồi từ AI. Vui lòng thử lại sau.";
        } catch (Exception e) {
            logger.error("Error parsing JSON response: {}", e.getMessage(), e);
            logger.debug("Response body that failed to parse: {}", responseBody.length() < 500 ? responseBody : responseBody.substring(0, 500) + "...");
            // Never return raw JSON - always return a user-friendly message
            return "Không thể xử lý phản hồi từ AI. Vui lòng thử lại sau.";
        }
    }

    private String quote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }
}


