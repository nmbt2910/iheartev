package com.iheartev.api.social;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "favorites", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "listing_id"}))
public class Favorite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    private User user;
    @ManyToOne(optional = false)
    private Listing listing;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Listing getListing() { return listing; }
    public void setListing(Listing listing) { this.listing = listing; }
}


