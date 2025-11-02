package com.iheartev.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);
    
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        logger.info("=== JWT FILTER - Request: {} {} ===", method, path);
        
        // Skip JWT validation for public endpoints
        // Note: /api/auth/validate requires authentication, so it's NOT in this list
        boolean isPublicEndpoint = path.startsWith("/v3/api-docs") || 
            path.startsWith("/swagger-ui") || 
            path.startsWith("/swagger-resources") || 
            path.startsWith("/webjars") ||
            path.equals("/api/ai/overview") ||
            path.equals("/api/auth/login") ||
            path.equals("/api/auth/register") ||
            (path.startsWith("/api/listings/") && "GET".equals(method));
        
        if (isPublicEndpoint) {
            logger.info("Skipping JWT validation for public endpoint: {} {}", method, path);
            filterChain.doFilter(request, response);
            return;
        }
        
        logger.debug("Path {} does not match public endpoints, checking authentication", path);
        
        final String authHeader = request.getHeader("Authorization");
        logger.debug("Authorization header present: {}", authHeader != null);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.debug("No valid Bearer token found, continuing without authentication");
            filterChain.doFilter(request, response);
            return;
        }
        
        logger.debug("Processing JWT token for path: {}", path);
        
        try {
            String token = authHeader.substring(7);
            String username = jwtService.extractUsername(token);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    if (jwtService.isTokenValid(token, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        logger.debug("Successfully authenticated user: " + username);
                    } else {
                        logger.warn("Token validation failed for user: " + username);
                    }
                } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
                    logger.warn("User not found: " + username);
                } catch (Exception e) {
                    // User not found or token invalid - continue without authentication
                    logger.warn("Failed to authenticate user: " + username + ", error: " + e.getMessage());
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            logger.warn("Token expired: " + e.getMessage());
        } catch (io.jsonwebtoken.security.SignatureException e) {
            logger.warn("Token signature invalid: " + e.getMessage());
        } catch (Exception e) {
            // Token extraction failed (expired, malformed, etc.) - continue without authentication
            logger.warn("Failed to extract username from token: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
}


