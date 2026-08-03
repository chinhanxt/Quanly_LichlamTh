'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Download, RefreshCw, Send, Image as ImageIcon, Settings, Save, X, FlipHorizontal, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
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

  // Hero Frame Index: -1 = Live Camera, 0 = Latest Photo, 1..N = Older Photos
  const [heroIndex, setHeroIndex] = useState<number>(-1);

  // WebCam Live Preview State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Touch Swipe Gesture Tracking
  const touchStartXRef = useRef<number | null>(null);

  // Photo Capture / Preview State
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

  const startCameraStream = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      } catch (e) {
        // Fallback for desktop webcams
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
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

  const capturePhotoFromHero = () => {
    if (heroIndex !== -1) {
      // Switch back to camera mode
      setHeroIndex(-1);
      return;
    }

    if (!videoRef.current || !cameraActive) {
      galleryInputRef.current?.click();
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

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
      }
    }, 'image/jpeg', 0.9);
  };

  // Swipe Navigation Handlers
  const handleNextPhoto = () => {
    // Go towards newer moment or Camera
    if (heroIndex > 0) {
      setHeroIndex((prev) => prev - 1);
    } else if (heroIndex === 0) {
      setHeroIndex(-1); // Live Camera!
    }
  };

  const handlePrevPhoto = () => {
    // Go towards older moments
    if (photos.length === 0) return;
    if (heroIndex < photos.length - 1) {
      setHeroIndex((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX < -40) {
      // Swiped Left -> View older photo
      handlePrevPhoto();
    } else if (deltaX > 40) {
      // Swiped Right -> View newer photo / Camera
      handleNextPhoto();
    }
  };

  useEffect(() => {
    fetchFeed(1, false);
    fetchBotSettings();
  }, []);

  // Auto start/stop camera based on heroIndex === -1
  useEffect(() => {
    if (heroIndex === -1) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [heroIndex]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
        showToast({ type: 'success', message: 'Đã đăng khoảnh khắc thành công! 📸' });
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        fetchFeed(1, false);
        setHeroIndex(0); // View the new photo
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

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20 select-none">
      {/* Header Bar with Settings Icon */}
      <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-400">✨ Khoảnh Khắc Locket</span>
        </div>

        {/* Gear Icon Button for Storage Bot Settings */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 bg-slate-900 text-slate-400 hover:text-amber-400 rounded-xl border border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title="Cấu hình Bot lưu trữ Telegram"
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình Bot</span>
        </button>
      </div>

      {/* Main Hero Locket 1:1 Square Frame with Touch Swipe Support */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/40 flex items-center justify-center group"
      >
        {heroIndex === -1 ? (
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
                <Camera className="w-12 h-12 text-amber-400 mb-2 opacity-80 animate-pulse" />
                <p className="text-xs text-slate-300 text-center max-w-xs">{cameraError || 'Đang kết nối Camera...'}</p>
                <button
                  onClick={() => startCameraStream()}
                  className="mt-3 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400 cursor-pointer"
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
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* Live Camera Badge */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-semibold text-white">Camera Trực Tiếp</span>
            </div>
          </div>
        ) : (
          /* Viewing Photo in History */
          loading ? (
            <div className="flex flex-col items-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-2 text-amber-400" />
              <span className="text-sm">Đang tải khoảnh khắc...</span>
            </div>
          ) : currentPhoto && !imgErrorMap[currentPhoto.id] ? (
            <div className="relative w-full h-full">
              <img
                src={`/api/locket/photo/${currentPhoto.telegram_file_id}`}
                alt="Locket moment"
                onError={() => setImgErrorMap((prev) => ({ ...prev, [currentPhoto.id]: true }))}
                className="w-full h-full object-cover"
              />

              {/* Top Sender Badge & Timestamp */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-white">{currentPhoto.sender}</span>
                <span className="text-[10px] text-slate-300">
                  • {new Date(currentPhoto.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-mono">
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
                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md p-3 rounded-2xl text-white text-sm border border-white/10 z-10">
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
        {photos.length > 0 && heroIndex < photos.length - 1 && (
          <button
            onClick={handlePrevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/90 transition-all border border-white/10 z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
            title="Khoảnh khắc cũ hơn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Navigation Arrow Right (Newer / Live Camera) */}
        {heroIndex >= 0 && (
          <button
            onClick={handleNextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/90 transition-all border border-white/10 z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
            title={heroIndex === 0 ? 'Quay lại Camera trực tiếp' : 'Khoảnh khắc mới hơn'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Control Bar: Shutter & Mode Switchers */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-around">
        {/* Gallery file picker */}
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* View Mode Toggle Button */}
        <button
          onClick={() => setHeroIndex(heroIndex === -1 ? 0 : -1)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all border cursor-pointer ${
            heroIndex >= 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          {heroIndex === -1 ? (
            <>
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Xem nhật ký</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Mở Camera</span>
            </>
          )}
        </button>

        {/* Authentic Locket Round Shutter Button */}
        <button
          onClick={capturePhotoFromHero}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-1 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title={heroIndex === -1 ? 'Chụp ngay' : 'Về Camera để chụp'}
        >
          <div className="w-full h-full rounded-full border-4 border-slate-950 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white"></div>
          </div>
        </button>

        {/* Gallery Upload Button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-slate-800 text-slate-300 px-3 py-2.5 rounded-2xl font-semibold hover:bg-slate-700 transition-all border border-slate-700 text-xs cursor-pointer"
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <span>Thư viện</span>
        </button>
      </div>

      {/* Storage Bot Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Cấu hình Bot Lưu Trữ Locket</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdef..."
                  value={locketBotToken}
                  onChange={(e) => setLocketBotToken(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Chat ID / Channel ID</label>
                <input
                  type="text"
                  placeholder="-100123456789 hoặc Chat ID"
                  value={locketChatId}
                  onChange={(e) => setLocketChatId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={saveBotSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Lưu Cấu Hình</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal for Confirmation */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-center text-white font-bold text-base">Xem lại & Đăng khoảnh khắc</h3>
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <input
              type="text"
              placeholder="Nhập caption ngắn (tùy chọn)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                disabled={uploading}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-medium hover:bg-slate-700 text-sm cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl font-bold hover:bg-amber-400 text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>📤 Tải lên</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Grid (10 items / page) */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-semibold text-slate-400 flex items-center justify-between">
          <span>Tất cả khoảnh khắc</span>
          <span className="text-xs text-slate-500">{photos.length} ảnh</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setHeroIndex(index)}
              className={`relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border transition-all cursor-pointer group flex items-center justify-center ${
                heroIndex === index ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[0.98]' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {!imgErrorMap[photo.id] ? (
                <img
                  src={`/api/locket/photo/${photo.telegram_file_id}`}
                  alt="Moment"
                  onError={() => setImgErrorMap((prev) => ({ ...prev, [photo.id]: true }))}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-slate-500 text-center">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[10px]">Ảnh hết hạn</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2 flex flex-col justify-between opacity-90">
                <span className="text-[10px] text-white font-medium bg-black/40 px-2 py-0.5 rounded-full w-fit">
                  {photo.sender}
                </span>

                <div className="flex items-end justify-between gap-1">
                  <p className="text-[11px] text-slate-200 truncate">{photo.caption || '...'}</p>
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

        {hasMore && (
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchFeed(nextPage, true);
            }}
            disabled={loadingMore}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 py-3 rounded-2xl text-xs font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Tải thêm khoảnh khắc cũ'}
          </button>
        )}
      </div>
    </div>
  );
}
