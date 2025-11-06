import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatVND } from '../utils/currencyFormatter';
import { attachmentService } from '../services/attachmentService';

export default function CompareListingsScreen({ route, navigation }) {
  const { listings } = route.params || {};
  const [listingImages, setListingImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    if (listings && listings.length > 0) {
      loadImages();
    }
  }, [listings]);

  const loadImages = async () => {
    try {
      setLoadingImages(true);
      const imagesMap = {};
      await Promise.all(
        listings.map(async (listing) => {
          try {
            const attachments = await attachmentService.getAttachmentsByListing(listing.id);
            if (attachments && attachments.length > 0) {
              const firstAttachment = attachments[0];
              if (firstAttachment.type === 'IMAGE') {
                imagesMap[listing.id] = attachmentService.getAttachmentUrl(firstAttachment.id);
              }
            }
          } catch (error) {
            console.error(`Error loading image for listing ${listing.id}:`, error);
          }
        })
      );
      setListingImages(imagesMap);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  if (!listings || listings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>So sánh</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Icon name="compare-horizontal" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có dữ liệu để so sánh</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isEV = listings[0]?.type === 'EV';
  const isBattery = listings[0]?.type === 'BATTERY';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>So sánh ({listings.length})</Text>
          <View style={{ width: 40 }} />
        </View>

        {loadingImages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            {listings.map((listing, index) => (
              <View key={listing.id} style={styles.listingColumn}>
                <TouchableOpacity
                  style={styles.listingCard}
                  onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageContainer}>
                    {listingImages[listing.id] ? (
                      <Image 
                        source={{ uri: listingImages[listing.id] }} 
                        style={styles.listingImage} 
                        resizeMode="cover" 
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon 
                          name={listing.type === 'BATTERY' ? 'battery-high' : 'car-electric'} 
                          size={48} 
                          color="#bbb" 
                        />
                      </View>
                    )}
                    <View style={[styles.typeBadge, listing.type === 'BATTERY' && styles.typeBadgeBattery]}>
                      <Icon 
                        name={listing.type === 'BATTERY' ? 'battery-high' : 'car-electric'} 
                        size={12} 
                        color="white" 
                      />
                      <Text style={styles.typeBadgeText}>
                        {listing.type === 'BATTERY' ? 'Pin' : 'Xe'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.listingInfo}>
                    <Text style={styles.brandModel} numberOfLines={2}>
                      {listing.brand} {listing.model || ''}
                    </Text>
                    
                    <View style={styles.priceContainer}>
                      <Icon name="cash" size={16} color="#6200ee" />
                      <Text style={styles.price}>{formatVND(listing.price)}</Text>
                    </View>

                    <View style={styles.detailsSection}>
                      {isEV && (
                        <>
                          {listing.year && (
                            <View style={styles.detailRow}>
                              <Icon name="calendar" size={14} color="#666" />
                              <Text style={styles.detailLabel}>Năm:</Text>
                              <Text style={styles.detailValue}>{listing.year}</Text>
                            </View>
                          )}
                          {listing.mileageKm && (
                            <View style={styles.detailRow}>
                              <Icon name="speedometer" size={14} color="#666" />
                              <Text style={styles.detailLabel}>Số km:</Text>
                              <Text style={styles.detailValue}>{listing.mileageKm.toLocaleString()} km</Text>
                            </View>
                          )}
                        </>
                      )}
                      
                      {listing.batteryCapacityKWh && (
                        <View style={styles.detailRow}>
                          <Icon name="battery-high" size={14} color="#666" />
                          <Text style={styles.detailLabel}>Pin:</Text>
                          <Text style={styles.detailValue}>{listing.batteryCapacityKWh} kWh</Text>
                        </View>
                      )}

                      {isBattery && listing.year && (
                        <View style={styles.detailRow}>
                          <Icon name="calendar" size={14} color="#666" />
                          <Text style={styles.detailLabel}>Năm SX:</Text>
                          <Text style={styles.detailValue}>{listing.year}</Text>
                        </View>
                      )}

                      {listing.conditionLabel && (
                        <View style={styles.detailRow}>
                          <Icon name="star" size={14} color="#666" />
                          <Text style={styles.detailLabel}>Tình trạng:</Text>
                          <Text style={styles.detailValue}>{listing.conditionLabel}</Text>
                        </View>
                      )}
                    </View>

                    {listing.description && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionLabel}>Mô tả:</Text>
                        <Text style={styles.descriptionText} numberOfLines={4}>
                          {listing.description}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.viewDetailButton}
                      onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewDetailButtonText}>Xem chi tiết</Text>
                      <Icon name="chevron-right" size={18} color="#6200ee" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6200ee',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  listingColumn: {
    width: 300,
  },
  listingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeBattery: {
    backgroundColor: '#ff9800',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  listingInfo: {
    padding: 16,
  },
  brandModel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  detailsSection: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    minWidth: 70,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  descriptionContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  descriptionLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e5f5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  viewDetailButtonText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
  },
});

