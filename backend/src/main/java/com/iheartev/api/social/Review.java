package com.iheartev.api.social;

import com.iheartev.api.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "reviews")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    private User reviewer;
    @ManyToOne(optional = false)
    private User reviewee;
    private int rating; // 1..5
    @Column(length = 1000)
    private String comment;
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }
    public User getReviewee() { return reviewee; }
    public void setReviewee(User reviewee) { this.reviewee = reviewee; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}


