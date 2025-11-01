package com.iheartev.api.auth;

import com.iheartev.api.security.JwtService;
import com.iheartev.api.user.User;
import com.iheartev.api.user.UserRepository;
import com.iheartev.api.user.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already in use"));
        }
        User user = new User();
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setFullName(request.fullName());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.MEMBER);
        userRepository.save(user);
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = userRepository.findByEmail(request.email()).orElseThrow();
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of("token", token, "role", user.getRole()));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Invalid or expired token"));
        }
        return ResponseEntity.ok(Map.of("valid", true, "role", user.getRole(), "email", user.getEmail()));
    }
}


