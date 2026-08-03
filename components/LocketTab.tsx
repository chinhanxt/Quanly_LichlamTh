'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Download, RefreshCw, Send, Image as ImageIcon, Settings, Save, X, FlipHorizontal, Eye, ChevronLeft, ChevronRight, Trash2, RotateCcw, ArrowLeft, BookOpen, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/components/AuthProvider';

interface LocketPhoto {
  id: string;
  sender: string;
  telegram_file_id: string;
  caption?: string;
  created_at: string;
}

export default function LocketTab() {
  const { user } = useAuth();
  const currentUser = user?.username || 'chinhan';
  const { showToast } = useToast();

  const [photos, setPhotos] = useState<LocketPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  // Navigation View: 'main' (Clean Locket View) vs 'history' (Hidden Dedicated History Page)
  const [subView, setSubView] = useState<'main' | 'history'>('main');

  // Hero Frame Index: -1 = Live Camera, 0 = Latest Photo, 1..N = Older Photos
  const [heroIndex, setHeroIndex] = useState<number>(-1);

  // Touch Pinch-to-Zoom & Pan Gesture State
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomOffset, setZoomOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef<number>(0);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // WebCam Live Preview State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // In-Frame Photo Capture / Preview State (NO POPUP)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Bot Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [locketBotToken, setLocketBotToken] = useState('');
  const [locketChatId, setLocketChatId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetZoom = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
  };

  const fetchFeed = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/locket/feed?page=${pageNum}&limit=10`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setPhotos((prev) => [...prev, ...data.photos]);
        } else {
          setPhotos(data.photos);
        }
        setHasMore(data.hasMore);
      }
    } catch (e: any) {
      showToast({ type: 'error', message: 'Không thể tải nhật ký khoảnh khắc' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchBotSettings = async () => {
    try {
      const res = await fetch('/api/locket/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setLocketBotToken(data.data.locketBotToken || '');
        setLocketChatId(data.data.locketChatId || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveBotSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch('/api/locket/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locketBotToken, locketChatId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ type: 'success', message: 'Đã lưu cấu hình Telegram Bot Locket!' });
        setShowSettingsModal(false);
      } else {
        showToast({ type: 'error', message: `Lỗi: ${data.error}` });
      }
    } catch (e: any) {
      showToast({ type: 'error', message: 'Không thể lưu cài đặt Bot' });
    } finally {
      setSavingSettings(false);
    }
  };

  // High Resolution Camera Stream Configuration (1080p / 4K ideal)
  const startCameraStream = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920, min: 1080 },
            height: { ideal: 1920, min: 1080 },
          },
          audio: false,
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      }

      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn('getUserMedia failed:', err);
      setCameraActive(false);
      setCameraError('Chưa cấp quyền Camera hoặc thiết bị không hỗ trợ Webcam. Bạn có thể dùng nút Thư viện để đăng ảnh!');
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  // Ultra HD Canvas Capture (0.98 JPEG Quality & Native Max Resolution)
  const capturePhotoFromHero = () => {
    if (previewUrl) {
      handleUpload();
      return;
    }

    if (heroIndex !== -1) {
      setHeroIndex(-1);
      resetZoom();
      return;
    }

    if (!videoRef.current || !cameraActive) {
      galleryInputRef.current?.click();
      return;
    }

    const video = videoRef.current;
    const rawWidth = video.videoWidth || 1280;
    const rawHeight = video.videoHeight || 1280;
    const size = Math.min(rawWidth, rawHeight);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const startX = (rawWidth - size) / 2;
    const startY = (rawHeight - size) / 2;

    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `locket_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        resetZoom();
      }
    }, 'image/jpeg', 0.98);
  };

  const discardCapturedPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    resetZoom();
  };

  // Swipe & Zoom Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 Finger Pinch-to-Zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistRef.current = dist;
      initialScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      // Single Finger Touch for Double-Tap or Pan / Swipe
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double-Tap detected! Toggle Zoom 1x <-> 2.5x
        if (zoomScale > 1.1) {
          resetZoom();
        } else {
          setZoomScale(2.5);
          setZoomOffset({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchStartOffsetRef.current = { ...zoomOffset };
      setIsDragging(zoomScale > 1.1);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
      // Pinching to zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleRatio = dist / initialTouchDistRef.current;
      const newScale = Math.min(Math.max(1, initialScaleRef.current * scaleRatio), 3.5);
      setZoomScale(newScale);
      if (newScale <= 1.05) setZoomOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && touchStartPosRef.current && zoomScale > 1.1) {
      // Panning zoomed photo
      const deltaX = e.touches[0].clientX - touchStartPosRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartPosRef.current.y;
      const maxPan = 100 * (zoomScale - 1);
      setZoomOffset({
        x: Math.min(Math.max(-maxPan, touchStartOffsetRef.current.x + deltaX), maxPan),
        y: Math.min(Math.max(-maxPan, touchStartOffsetRef.current.y + deltaY), maxPan),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialTouchDistRef.current = null;
    setIsDragging(false);

    if (e.changedTouches.length === 1 && touchStartPosRef.current && zoomScale <= 1.1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
      touchStartPosRef.current = null;

      if (deltaX < -45) {
        handlePrevPhoto();
      } else if (deltaX > 45) {
        handleNextPhoto();
      }
    }
  };

  const handleNextPhoto = () => {
    if (previewUrl) return;
    if (heroIndex > 0) {
      setHeroIndex((prev) => prev - 1);
      resetZoom();
    } else if (heroIndex === 0) {
      setHeroIndex(-1);
      resetZoom();
    }
  };

  const handlePrevPhoto = () => {
    if (previewUrl) return;
    if (photos.length === 0) return;
    if (heroIndex < photos.length - 1) {
      setHeroIndex((prev) => prev + 1);
      resetZoom();
    }
  };

  useEffect(() => {
    fetchFeed(1, false);
    fetchBotSettings();
  }, []);

  // Auto start/stop camera based on subView === 'main' && heroIndex === -1 && !previewUrl
  useEffect(() => {
    if (subView === 'main' && heroIndex === -1 && !previewUrl) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [subView, heroIndex, previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setHeroIndex(-1);
      setSubView('main');
      resetZoom();
    }
  };

  const handleDeletePhoto = async (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/locket/feed?id=${photoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast({ type: 'success', message: 'Đã xóa khoảnh khắc khỏi nhật ký!' });
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (heroIndex >= photos.length - 1) {
          setHeroIndex(-1);
          resetZoom();
        }
      } else {
        showToast({ type: 'error', message: 'Không thể xóa khoảnh khắc' });
      }
    } catch (err) {
      showToast({ type: 'error', message: 'Lỗi khi xóa khoảnh khắc' });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sender', currentUser);
      formData.append('caption', caption);

      const res = await fetch('/api/locket/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast({ type: 'success', message: 'Đã đăng khoảnh khắc HD thành công! 📸' });
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        fetchFeed(1, false);
        setHeroIndex(0);
        resetZoom();
      } else {
        showToast({ type: 'error', message: `Lỗi: ${data.error}` });
      }
    } catch (e: any) {
      showToast({ type: 'error', message: 'Lỗi khi tải khoảnh khắc lên' });
    } finally {
      setUploading(false);
    }
  };

  const currentPhoto = heroIndex >= 0 ? photos[heroIndex] : null;

  // Dedicated Hidden Sub-Page for History Gallery (White + Purple Theme)
  if (subView === 'history') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6 pb-20 select-none">
        {/* History Header Navigation Bar */}
        <div className="flex items-center justify-between bg-white/90 p-3.5 rounded-2xl border border-purple-100 shadow-sm sticky top-2 z-30 backdrop-blur-md">
          <button
            onClick={() => setSubView('main')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl border border-purple-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-purple-600" />
            <span>Trở lại Locket</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Nhật Ký ({photos.length})</span>
          </div>
        </div>

        {/* History Grid (10 items / page) */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => {
                  discardCapturedPhoto();
                  setHeroIndex(index);
                  setSubView('main');
                  resetZoom();
                }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-purple-100 hover:border-purple-400 transition-all cursor-pointer group flex items-center justify-center shadow-md hover:shadow-lg"
              >
                {!imgErrorMap[photo.id] ? (
                  <img
                    src={`/api/locket/photo/${photo.telegram_file_id}`}
                    alt="Moment"
                    onError={() => setImgErrorMap((prev) => ({ ...prev, [photo.id]: true }))}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-slate-400 text-center">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-40 text-purple-300" />
                    <span className="text-[10px]">Ảnh đã xóa</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/30 p-2 flex flex-col justify-between opacity-95">
                  <span className="text-[10px] text-purple-100 font-semibold bg-purple-950/70 backdrop-blur-md px-2 py-0.5 rounded-full w-fit border border-purple-500/30">
                    {photo.sender}
                  </span>

                  <div className="flex items-end justify-between gap-1">
                    <p className="text-[11px] text-white truncate font-medium">{photo.caption || '...'}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="p-1 bg-black/60 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                        title="Xóa khoảnh khắc"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {!imgErrorMap[photo.id] && (
                        <a
                          href={`/api/locket/photo/${photo.telegram_file_id}`}
                          download={`locket_${photo.id}.jpg`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 bg-black/60 text-white rounded-lg hover:bg-black"
                          title="Tải ảnh HD"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination / Load More */}
          {hasMore && (
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchFeed(nextPage, true);
              }}
              disabled={loadingMore}
              className="w-full bg-white border border-purple-200 text-purple-700 py-3 rounded-2xl text-xs font-bold hover:bg-purple-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> : 'Tải thêm 10 khoảnh khắc cũ'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main Clean Locket View (White + Purple Theme with HD Capture & Pinch-to-Zoom)
  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20 select-none">
      {/* Header Bar with Compact Settings Icon */}
      <div className="flex items-center justify-between bg-white/90 p-3.5 rounded-2xl border border-purple-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-purple-700">✨ Khoảnh Khắc Locket</span>
        </div>

        {/* Compact Gear Icon Button for Storage Settings */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded-xl border border-purple-200 transition-all cursor-pointer flex items-center justify-center shadow-xs"
          title="Cấu hình Locket"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Hero Locket 1:1 Square Frame with Pinch-to-Zoom & Double-Tap Support */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square w-full bg-slate-950 rounded-3xl overflow-hidden shadow-xl border-4 border-white ring-1 ring-purple-200/80 flex items-center justify-center group touch-none"
      >
        {previewUrl ? (
          /* Just Captured / Picked Image View (In-Frame HD Preview) */
          <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Captured preview"
              className="w-full h-full object-cover origin-center"
              style={{
                transform: `scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            />

            {/* Zoom Indicator Badge */}
            {zoomScale > 1.05 && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold border border-white/20 z-20 flex items-center gap-1">
                <ZoomIn className="w-3 h-3 text-purple-300" />
                <span>{zoomScale.toFixed(1)}x</span>
                <button onClick={resetZoom} className="ml-1 text-slate-300 hover:text-white text-[10px] underline">Đặt lại</button>
              </div>
            )}

            {/* Top Left Cancel / Retake Button */}
            <button
              onClick={discardCapturedPhoto}
              className="absolute top-3 left-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-all border border-white/20 cursor-pointer z-10 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
              title="Chụp lại / Hủy"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Chụp lại</span>
            </button>

            {/* In-Frame Caption Input & Send Pill Overlay */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-lg p-2.5 rounded-2xl border border-purple-500/30 shadow-2xl flex items-center gap-2 z-20">
              <input
                type="text"
                placeholder="💬 Thêm nhắn gửi ngắn..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpload();
                }}
                className="flex-1 bg-transparent text-white placeholder-purple-200/60 text-xs px-2 py-1 focus:outline-none font-medium"
                autoFocus
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Đăng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : heroIndex === -1 ? (
          /* Live Camera Stream in Frame */
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <Camera className="w-12 h-12 text-purple-400 mb-2 opacity-80 animate-pulse" />
                <p className="text-xs text-slate-300 text-center max-w-xs">{cameraError || 'Đang kết nối Camera HD...'}</p>
                <button
                  onClick={() => startCameraStream()}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 cursor-pointer shadow-md"
                >
                  Cấp quyền & Thử lại
                </button>
              </div>
            )}

            {/* Flip Camera Button Overlay */}
            {cameraActive && (
              <button
                onClick={toggleFacingMode}
                className="absolute top-3 right-3 p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all border border-white/20 cursor-pointer z-10"
                title="Xoay Camera"
              >
                <FlipHorizontal className="w-4 h-4 text-purple-300" />
              </button>
            )}


          </div>
        ) : (
          /* Viewing Photo in History with Pinch Zoom & Double Tap */
          loading ? (
            <div className="flex flex-col items-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-2 text-purple-400" />
              <span className="text-sm">Đang tải khoảnh khắc...</span>
            </div>
          ) : currentPhoto && !imgErrorMap[currentPhoto.id] ? (
            <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
              <img
                src={`/api/locket/photo/${currentPhoto.telegram_file_id}`}
                alt="Locket moment"
                onError={() => setImgErrorMap((prev) => ({ ...prev, [currentPhoto.id]: true }))}
                className="w-full h-full object-cover origin-center"
                style={{
                  transform: `scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              />

              {/* Zoom Scale Badge */}
              {zoomScale > 1.05 && (
                <div className="absolute top-3 right-14 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold border border-white/20 z-20 flex items-center gap-1">
                  <ZoomIn className="w-3 h-3 text-purple-300" />
                  <span>{zoomScale.toFixed(1)}x</span>
                  <button onClick={resetZoom} className="ml-1 text-slate-300 hover:text-white text-[10px] underline">Đặt lại</button>
                </div>
              )}

              {/* Top Sender Badge & Timestamp */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-white">{currentPhoto.sender}</span>
                <span className="text-[10px] text-purple-200">
                  • {new Date(currentPhoto.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] bg-purple-900/60 text-purple-100 px-1.5 py-0.5 rounded-md font-mono border border-purple-400/30">
                  {heroIndex + 1}/{photos.length}
                </span>
              </div>

              {/* Download & Delete Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  onClick={(e) => handleDeletePhoto(currentPhoto.id, e)}
                  className="p-2 bg-black/60 backdrop-blur-md rounded-full text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-white/10 cursor-pointer"
                  title="Xóa khoảnh khắc khỏi nhật ký"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <a
                  href={`/api/locket/photo/${currentPhoto.telegram_file_id}`}
                  download={`locket_${currentPhoto.id}.jpg`}
                  className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all border border-white/10"
                  title="Tải ảnh HD"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>

              {/* Bottom Caption Overlay */}
              {currentPhoto.caption && (
                <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md p-3 rounded-2xl text-white text-sm border border-purple-500/30 z-10">
                  {currentPhoto.caption}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 p-6 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-rose-400 opacity-80" />
              </div>
              <p className="text-sm font-semibold text-slate-300 mb-1">Ảnh đã bị xóa trên Telegram</p>
              <p className="text-xs text-slate-400 max-w-xs mb-3">File ảnh không còn tồn tại trên kho lưu trữ Telegram Bot.</p>
              {currentPhoto && (
                <button
                  onClick={(e) => handleDeletePhoto(currentPhoto.id, e)}
                  className="px-4 py-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa bản ghi khỏi Web</span>
                </button>
              )}
            </div>
          )
        )}

        {/* Navigation Arrow Left (Older) */}
        {!previewUrl && photos.length > 0 && heroIndex < photos.length - 1 && zoomScale <= 1.05 && (
          <button
            onClick={handlePrevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/90 transition-all border border-white/10 z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
            title="Khoảnh khắc cũ hơn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Navigation Arrow Right (Newer / Live Camera) */}
        {!previewUrl && heroIndex >= 0 && zoomScale <= 1.05 && (
          <button
            onClick={handleNextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/90 transition-all border border-white/10 z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
            title={heroIndex === 0 ? 'Quay lại Camera trực tiếp' : 'Khoảnh khắc mới hơn'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Control Bar: Shutter & Mode Switchers (White + Purple Card) */}
      <div className="bg-white/90 border border-purple-100 p-4 rounded-3xl shadow-sm flex items-center justify-around">
        {/* Gallery file picker */}
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* View Mode Toggle Button -> Open Dedicated History Sub-Page */}
        <button
          onClick={() => {
            if (previewUrl) discardCapturedPhoto();
            setSubView('history');
            resetZoom();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border border-purple-200 bg-purple-50/80 text-purple-700 hover:bg-purple-100 cursor-pointer shadow-xs"
          title="Mở Nhật Ký Tất Cả Khoảnh Khắc"
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Xem nhật ký</span>
        </button>

        {/* Authentic Locket Round Shutter Button / Send Action */}
        <button
          onClick={capturePhotoFromHero}
          disabled={uploading}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          title={previewUrl ? 'Bấm để Đăng khoảnh khắc HD' : heroIndex === -1 ? 'Chụp ngay' : 'Về Camera để chụp'}
        >
          <div className="w-full h-full rounded-full border-4 border-white flex items-center justify-center">
            {previewUrl ? (
              <Send className="w-5 h-5 text-white" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-white"></div>
            )}
          </div>
        </button>

        {/* Gallery Upload Button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-purple-50/80 text-purple-700 px-3.5 py-2.5 rounded-2xl font-bold hover:bg-purple-100 transition-all border border-purple-200 text-xs cursor-pointer shadow-xs"
        >
          <Upload className="w-4 h-4 text-purple-600" />
          <span>Thư viện</span>
        </button>
      </div>

      {/* Storage Bot Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-purple-100 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h3 className="text-purple-900 font-bold text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" />
                <span>Cấu hình Bot Lưu Trữ Locket</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdef..."
                  value={locketBotToken}
                  onChange={(e) => setLocketBotToken(e.target.value)}
                  className="w-full bg-purple-50/50 border border-purple-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Chat ID / Channel ID</label>
                <input
                  type="text"
                  placeholder="-100123456789 hoặc Chat ID"
                  value={locketChatId}
                  onChange={(e) => setLocketChatId(e.target.value)}
                  className="w-full bg-purple-50/50 border border-purple-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={saveBotSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:brightness-110 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Lưu Cấu Hình</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
