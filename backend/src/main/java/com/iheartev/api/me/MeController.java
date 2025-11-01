package com.iheartev.api.me;

import com.iheartev.api.listing.Listing;
import com.iheartev.api.listing.ListingRepository;
import com.iheartev.api.social.Favorite;
import com.iheartev.api.social.FavoriteRepository;
import com.iheartev.api.transaction.Order;
import com.iheartev.api.transaction.OrderRepository;
import com.iheartev.api.user.User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final ListingRepository listings;
    private final OrderRepository orders;
    private final FavoriteRepository favorites;

    public MeController(ListingRepository listings, OrderRepository orders, FavoriteRepository favorites) {
        this.listings = listings; this.orders = orders; this.favorites = favorites;
    }

    @GetMapping("/listings")
    public List<Listing> myListings(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return listings.findAll().stream().filter(l -> l.getSeller()!=null && l.getSeller().getId().equals(user.getId())).toList();
    }

    @GetMapping("/orders")
    public List<Order> myOrders(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return orders.findAll().stream().filter(o -> o.getBuyer()!=null && o.getBuyer().getId().equals(user.getId())).toList();
    }

    @GetMapping("/favorites")
    public List<Favorite> myFavorites(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return favorites.findAll().stream().filter(f -> f.getUser()!=null && f.getUser().getId().equals(user.getId())).toList();
    }
}


