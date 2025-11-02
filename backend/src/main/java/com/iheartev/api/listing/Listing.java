package com.iheartev.api.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.iheartev.api.user.User;
import com.iheartev.api.payment.PaymentInfo;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "listings")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Listing {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // EV or BATTERY
    private String brand;
    private String model;
    private Integer year;
    @Column(name = "mileage_km")
    private Integer mileageKm; // for EV
    @Column(name = "battery_capacitykwh")
    private Integer batteryCapacityKWh;
    @Column(name = "condition_label")
    private String conditionLabel; // verified, used, etc
    @Column(length = 2000)
    private String description;
    private Double price;
    private String status; // ACTIVE, SOLD, DRAFT
    @Column(name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.EAGER)
    private User seller;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_info_id")
    private PaymentInfo paymentInfo;

    // Explicit accessors to avoid Lombok processor issues during build
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Integer getMileageKm() { return mileageKm; }
    public void setMileageKm(Integer mileageKm) { this.mileageKm = mileageKm; }
    public Integer getBatteryCapacityKWh() { return batteryCapacityKWh; }
    public void setBatteryCapacityKWh(Integer batteryCapacityKWh) { this.batteryCapacityKWh = batteryCapacityKWh; }
    public String getConditionLabel() { return conditionLabel; }
    public void setConditionLabel(String conditionLabel) { this.conditionLabel = conditionLabel; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public User getSeller() { return seller; }
    public void setSeller(User seller) { this.seller = seller; }
    public PaymentInfo getPaymentInfo() { return paymentInfo; }
    public void setPaymentInfo(PaymentInfo paymentInfo) { this.paymentInfo = paymentInfo; }
}


