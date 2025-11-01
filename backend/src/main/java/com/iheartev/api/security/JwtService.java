package com.iheartev.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${security.jwt.secret}")
    private String secret;

    @Value("${security.jwt.expiration-minutes}")
    private long expirationMinutes;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails user) {
        return generateToken(Map.of(), user);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(expirationMinutes * 60);
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(user.getUsername())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails user) {
        final String username = extractUsername(token);
        return username.equals(user.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(getSignInKey()).build().parseClaimsJws(token).getBody();
    }

    private Key getSignInKey() {
        try {
            // Try to decode as Base64 first
            byte[] keyBytes = Decoders.BASE64.decode(secret);
            // Ensure minimum key size for HS256 (256 bits = 32 bytes)
            if (keyBytes.length < 32) {
                // Pad or repeat the key to reach 32 bytes
                byte[] paddedKey = new byte[32];
                for (int i = 0; i < 32; i++) {
                    paddedKey[i] = keyBytes[i % keyBytes.length];
                }
                keyBytes = paddedKey;
            }
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            // If secret is not valid Base64, generate a proper key from the string
            // Use SHA-256 to derive a consistent 32-byte key from any string
            try {
                java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
                byte[] keyBytes = digest.digest(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return Keys.hmacShaKeyFor(keyBytes);
            } catch (java.security.NoSuchAlgorithmException ex) {
                throw new RuntimeException("Failed to generate JWT signing key", ex);
            }
        }
    }
}


