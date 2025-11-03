import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoPlayerScreen({ route, navigation }) {
  const { videoUrl, attachmentId } = route.params || {};
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    const hideControls = () => {
      if (showControls && status.isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    if (showControls && status.isPlaying) {
      hideControls();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, status.isPlaying]);

  const togglePlayPause = async () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    try {
      if (status.isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const seekForward = async () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    try {
      const newPosition = Math.min(
        (status.positionMillis || 0) + 10000,
        status.durationMillis || 0
      );
      await videoRef.current?.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error seeking forward:', error);
    }
  };

  const seekBackward = async () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    try {
      const newPosition = Math.max((status.positionMillis || 0) - 10000, 0);
      await videoRef.current?.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error seeking backward:', error);
    }
  };

  const handleSliderChange = async (value) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    try {
      await videoRef.current?.setPositionAsync(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!showControls && status.isPlaying) {
      // Auto-hide after 3 seconds if playing
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatusUpdate = (playbackStatus) => {
    setStatus(playbackStatus);
    if (playbackStatus.isBuffering !== undefined) {
      setIsBuffering(playbackStatus.isBuffering);
    }
    if (playbackStatus.didJustFinish) {
      // Video finished, restart from beginning
      videoRef.current?.setPositionAsync(0);
      videoRef.current?.pauseAsync();
    }
  };

  if (!videoUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#999" />
          <Text style={styles.errorText}>Không thể tải video</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar hidden />
      <View style={styles.videoContainer}>
        <TouchableOpacity
          style={styles.videoWrapper}
          activeOpacity={1}
          onPress={toggleControls}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay={true}
            isLooping={false}
            useNativeControls={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={(error) => {
              console.error('Video error:', error);
              setIsLoading(false);
              Alert.alert('Lỗi', 'Không thể phát video. Vui lòng thử lại.');
            }}
          />

          {/* Loading Indicator */}
          {(isLoading || isBuffering) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>
                {isLoading ? 'Đang tải video...' : 'Đang tải...'}
              </Text>
            </View>
          )}

          {/* Controls Overlay */}
          {showControls && (
            <>
              {/* Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.topBarButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Icon name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>

              {/* Center Play/Pause Button */}
              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={togglePlayPause}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={status.isPlaying ? 'pause-circle' : 'play-circle'}
                    size={80}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                {/* Time Display and Seek Controls */}
                <View style={styles.seekControls}>
                  <TouchableOpacity
                    style={styles.seekButton}
                    onPress={seekBackward}
                    activeOpacity={0.7}
                  >
                    <Icon name="rewind-10" size={32} color="white" />
                  </TouchableOpacity>

                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                      {formatTime(status.positionMillis)}
                    </Text>
                    <Text style={styles.timeSeparator}>/</Text>
                    <Text style={styles.timeText}>
                      {formatTime(status.durationMillis)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.seekButton}
                    onPress={seekForward}
                    activeOpacity={0.7}
                  >
                    <Icon name="fast-forward-10" size={32} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Progress Slider */}
                <Slider
                  style={styles.slider}
                  value={status.positionMillis || 0}
                  minimumValue={0}
                  maximumValue={status.durationMillis || 1}
                  minimumTrackTintColor="#6200ee"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                  thumbTintColor="#6200ee"
                  onValueChange={handleSliderChange}
                  onSlidingStart={() => {
                    if (status.isPlaying) {
                      videoRef.current?.pauseAsync();
                    }
                  }}
                  onSlidingComplete={(value) => {
                    videoRef.current?.setPositionAsync(value);
                    if (status.isPlaying) {
                      videoRef.current?.playAsync();
                    }
                  }}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  seekControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 20,
  },
  seekButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(98, 0, 238, 0.8)',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6200ee',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
