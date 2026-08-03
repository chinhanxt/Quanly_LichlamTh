'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Download, RefreshCw, Send, Image as ImageIcon, Settings, Save, X, FlipHorizontal } from 'lucide-react';
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

  // WebCam Live Preview State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
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
        // Fallback for desktop webcams without facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setCameraStream(stream);
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn('getUserMedia failed, falling back to input capture:', err);
      showToast({
        type: 'error',
        title: 'Chưa cấp quyền Camera',
        message: 'Hãy cho phép trình duyệt truy cập Webcam/Camera hoặc dùng nút Thư viện.',
      });
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const toggleCameraFacing = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `locket_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    fetchFeed(1, false);
    fetchBotSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
      } else {
        showToast({ type: 'error', message: `Lỗi: ${data.error}` });
      }
    } catch (e: any) {
      showToast({ type: 'error', message: 'Lỗi khi tải khoảnh khắc lên' });
    } finally {
      setUploading(false);
    }
  };

  const latestPhoto = photos[0];

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
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

      {/* Main Hero Locket 1:1 Square Frame */}
      <div className="relative aspect-square w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/30 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-2 text-amber-400" />
            <span className="text-sm">Đang tải khoảnh khắc...</span>
          </div>
        ) : latestPhoto && !imgErrorMap[latestPhoto.id] ? (
          <div className="relative w-full h-full group">
            <img
              src={`/api/locket/photo/${latestPhoto.telegram_file_id}`}
              alt="Locket moment"
              onError={() => setImgErrorMap((prev) => ({ ...prev, [latestPhoto.id]: true }))}
              className="w-full h-full object-cover"
            />
            {/* Top Badge */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-white">{latestPhoto.sender}</span>
              <span className="text-[10px] text-slate-300">
                • {new Date(latestPhoto.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Download Button */}
            <a
              href={`/api/locket/photo/${latestPhoto.telegram_file_id}`}
              download={`locket_${latestPhoto.id}.jpg`}
              className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all border border-white/10"
              title="Tải ảnh HD"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Bottom Caption Overlay */}
            {latestPhoto.caption && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md p-3 rounded-2xl text-white text-sm border border-white/10">
                {latestPhoto.caption}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
              <Camera className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-300 mb-1">Khoảnh khắc Locket</p>
            <p className="text-xs text-slate-400 max-w-xs">Chưa có ảnh nào hoặc ảnh thử nghiệm đã hết hạn. Hãy bấm nút Chụp Ảnh để chia sẻ ngay!</p>
          </div>
        )}
      </div>

      {/* Quick Snap & Camera Trigger Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-around">
        {/* Camera input with capture="environment" */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Gallery file picker without capture */}
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Big Snap Shutter Button */}
        <button
          onClick={() => startCamera()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-6 py-3 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          <span>📸 Chụp Ảnh</span>
        </button>

        {/* Gallery Upload Button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl font-medium hover:bg-slate-700 transition-all border border-slate-700 text-xs cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>📁 Thư viện</span>
        </button>
      </div>

      {/* Live WebCam Viewfinder Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-4 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Máy ảnh Locket</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCameraFacing}
                  className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition-all"
                  title="Xoay Camera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={stopCamera}
                  className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Video Preview Box */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            </div>

            {/* Shutter Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={capturePhotoFromStream}
                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 border-4 border-white/80 shadow-2xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Chụp ngay"
              >
                <div className="w-6 h-6 rounded-full bg-slate-950"></div>
              </button>
            </div>
          </div>
        </div>
      )}

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
          <span>Khoảnh khắc cũ</span>
          <span className="text-xs text-slate-500">{photos.length} ảnh</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {photos.slice(1).map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group flex items-center justify-center">
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
                  {!imgErrorMap[photo.id] && (
                    <a
                      href={`/api/locket/photo/${photo.telegram_file_id}`}
                      download={`locket_${photo.id}.jpg`}
                      className="p-1 bg-black/60 text-white rounded-lg hover:bg-black"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  )}
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
