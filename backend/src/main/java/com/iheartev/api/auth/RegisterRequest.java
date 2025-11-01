package com.iheartev.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(@Email String email, String phone, @NotBlank String fullName, @NotBlank String password) {}


