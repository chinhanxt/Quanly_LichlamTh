'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Download, RefreshCw, Send, Image as ImageIcon, Settings, Save, X, FlipHorizontal, Eye, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, RotateCcw, ArrowLeft, BookOpen, ZoomIn, ZoomOut, Sparkles, Wand2, Maximize2, Smile } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/components/AuthProvider';

export type FilterType = 'beauty' | 'rosy' | 'sunset' | 'vintage' | 'bw' | 'natural';

export interface FilterPreset {
  id: FilterType;
  name: string;
  colorClass: string;
  css: string;
  canvasFilter: string;
}

export interface ImageSticker {
  id: string;
  name: string;
  url: string;
}

export const CUTE_COUPLE_STICKERS: ImageSticker[] = [
  // Cặp Đôi Chibi (1-10)
  { id: 'stk_1', name: 'Selfie cặp đôi 🤳', url: '/stickers/sticker_1.png' },
  { id: 'stk_2', name: 'Hôn má lãng mạn 💋', url: '/stickers/sticker_2.png' },
  { id: 'stk_3', name: 'Móc ngoéo nắm tay 🤝', url: '/stickers/sticker_3.png' },
  { id: 'stk_4', name: 'Dỗ dành khi giận 😤', url: '/stickers/sticker_4.png' },
  { id: 'stk_5', name: 'Khóc nhè nũng nịu 😭', url: '/stickers/sticker_5.png' },
  { id: 'stk_6', name: 'Hi-five thả dáng ✌️', url: '/stickers/sticker_6.png' },
  { id: 'stk_7', name: 'Chán chường tâm trạng 🌧️', url: '/stickers/sticker_7.png' },
  { id: 'stk_8', name: 'Ôm chặt thương thương 🤗', url: '/stickers/sticker_8.png' },
  { id: 'stk_9', name: 'Đút bánh ăn chung 🍔', url: '/stickers/sticker_9.png' },
  { id: 'stk_10', name: 'Uống trà sữa đôi 🧋', url: '/stickers/sticker_10.png' },

  // Chibi Bạn Nữ (11-20)
  { id: 'stk_11', name: 'Bạn nữ chống cằm 🌸', url: '/stickers/sticker_11.png' },
  { id: 'stk_12', name: 'Bạn nữ nháy mắt ✌️', url: '/stickers/sticker_12.png' },
  { id: 'stk_13', name: 'Bạn nữ áp má 💖', url: '/stickers/sticker_13.png' },
  { id: 'stk_14', name: 'Bạn nữ giận dỗi 😤', url: '/stickers/sticker_14.png' },
  { id: 'stk_15', name: 'Bạn nữ khóc nhè 😭', url: '/stickers/sticker_15.png' },
  { id: 'stk_16', name: 'Bạn nữ suy nghĩ ❓', url: '/stickers/sticker_16.png' },
  { id: 'stk_17', name: 'Bạn nữ bĩu môi 🥺', url: '/stickers/sticker_17.png' },
  { id: 'stk_18', name: 'Bạn nữ thả tim 💖', url: '/stickers/sticker_18.png' },
  { id: 'stk_19', name: 'Bạn nữ bất ngờ 😲', url: '/stickers/sticker_19.png' },
  { id: 'stk_20', name: 'Bạn nữ thẹn thùng 💕', url: '/stickers/sticker_20.png' },

  // Chibi Bạn Nam (21-30)
  { id: 'stk_21', name: 'Bạn nam chống cằm 💭', url: '/stickers/sticker_21.png' },
  { id: 'stk_22', name: 'Bạn nam khoanh tay 😤', url: '/stickers/sticker_22.png' },
  { id: 'stk_23', name: 'Bạn nam nháy mắt 🌟', url: '/stickers/sticker_23.png' },
  { id: 'stk_24', name: 'Bạn nam phồng má 🥺', url: '/stickers/sticker_24.png' },
  { id: 'stk_25', name: 'Bạn nam khóc 😭', url: '/stickers/sticker_25.png' },
  { id: 'stk_26', name: 'Bạn nam suy nghĩ ❓', url: '/stickers/sticker_26.png' },
  { id: 'stk_27', name: 'Bạn nam u buồn 🌧️', url: '/stickers/sticker_27.png' },
  { id: 'stk_28', name: 'Bạn nam cười tươi 😄', url: '/stickers/sticker_28.png' },
  { id: 'stk_29', name: 'Bạn nam ngạc nhiên 😲', url: '/stickers/sticker_29.png' },
  { id: 'stk_30', name: 'Bạn nam mỉm cười 😊', url: '/stickers/sticker_30.png' },
];

export const BEAUTY_FILTERS: FilterPreset[] = [
  {
    id: 'beauty',
    name: 'Mịn Da',
    colorClass: 'bg-gradient-to-tr from-amber-100 via-pink-200 to-purple-200 border-2 border-white',
    css: 'brightness(1.08) contrast(1.04) saturate(1.1) blur(0.2px)',
    canvasFilter: 'brightness(108%) contrast(104%) saturate(110%) blur(1px)',
  },
  {
    id: 'rosy',
    name: 'Hồng Hào',
    colorClass: 'bg-gradient-to-tr from-rose-400 via-pink-500 to-fuchsia-400 border-2 border-white',
    css: 'brightness(1.1) contrast(1.05) saturate(1.28) hue-rotate(-6deg)',
    canvasFilter: 'brightness(110%) contrast(105%) saturate(128%) hue-rotate(-6deg)',
  },
  {
    id: 'sunset',
    name: 'Nắng Ấm',
    colorClass: 'bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 border-2 border-white',
    css: 'sepia(0.2) saturate(1.35) brightness(1.06) hue-rotate(-10deg)',
    canvasFilter: 'sepia(20%) saturate(135%) brightness(106%) hue-rotate(-10deg)',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    colorClass: 'bg-gradient-to-tr from-amber-800 via-yellow-700 to-amber-200 border-2 border-white',
    css: 'sepia(0.3) contrast(1.15) brightness(1.05) saturate(1.2)',
    canvasFilter: 'sepia(30%) contrast(115%) brightness(105%) saturate(120%)',
  },
  {
    id: 'bw',
    name: 'Trắng Đen',
    colorClass: 'bg-gradient-to-tr from-slate-950 via-slate-600 to-slate-200 border-2 border-white',
    css: 'grayscale(1) contrast(1.06) brightness(1.08)',
    canvasFilter: 'grayscale(100%) contrast(106%) brightness(108%)',
  },
  {
    id: 'natural',
    name: 'Tự Nhiên',
    colorClass: 'bg-slate-200 border-2 border-slate-300',
    css: 'none',
    canvasFilter: 'none',
  },
];

interface LocketPhoto {
  id: string;
  sender: string;
  telegram_file_id: string;
  caption?: string;
  created_at: string;
  localBlobUrl?: string;
}

const compressImageFile = async (file: File, maxDim = 1200, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    if (file.size < 300 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
};

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

  // Collapsible Top Header Bar State (Default false = collapsed for max camera space)
  const [showHeaderHeader, setShowHeaderHeader] = useState<boolean>(false);

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

  // Beauty Filter State
  const [activeFilter, setActiveFilter] = useState<FilterType>('beauty');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const filterTouchStartXRef = useRef<number | null>(null);

  // Custom Sticker & Weather/Mood Tag State
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [selectedImageSticker, setSelectedImageSticker] = useState<ImageSticker | null>(null);
  const [imageStickerPos, setImageStickerPos] = useState<{ x: number; y: number }>({ x: 10, y: 10 });
  const [imageStickerScale, setImageStickerScale] = useState<number>(1.0); // 0.3 to 2.5
  const isDraggingStickerRef = useRef<boolean>(false);
  const stickerDragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 10, posY: 10 });

  const [showStickerPicker, setShowStickerPicker] = useState<boolean>(false);
  const [customStickerText, setCustomStickerText] = useState<string>('');
  const [stickerPresets, setStickerPresets] = useState<string[]>([
    '🌤️ 28°C Sài Gòn',
    '🌧️ 22°C Hà Nội',
    '🔥 Running KPI 99%',
    '☕ Trà Sữa Time',
    '💤 Thèm Ngủ',
    '🎧 Vibe Nhạc Chill',
    '💖 Heartbreak 100%',
    '🚗 On the way...',
  ]);

  // Facebook / Instagram Camera Style Filter Wheel Scroll & Center Reticle Logic
  const filterWheelRef = useRef<HTMLDivElement>(null);
  const lastFilterSwipeTimeRef = useRef<number>(0);

  const handleFilterWheelScroll = () => {
    if (!filterWheelRef.current) return;
    const container = filterWheelRef.current;
    const scrollLeft = container.scrollLeft;
    // Step size between items (36px width + 12px gap = 48px)
    const step = 48;
    const rawIndex = Math.round(scrollLeft / step);
    const clampedIndex = Math.max(0, Math.min(BEAUTY_FILTERS.length - 1, rawIndex));
    const targetFilter = BEAUTY_FILTERS[clampedIndex];

    if (targetFilter && targetFilter.id !== activeFilter) {
      setActiveFilter(targetFilter.id);
    }
  };

  useEffect(() => {
    if (showFilterPicker && filterWheelRef.current) {
      const idx = BEAUTY_FILTERS.findIndex((f) => f.id === activeFilter);
      if (idx >= 0) {
        filterWheelRef.current.scrollTo({ left: idx * 48, behavior: 'smooth' });
      }
    }
  }, [showFilterPicker]);

  const handleStickerDragStart = (clientX: number, clientY: number) => {
    isDraggingStickerRef.current = true;
    stickerDragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: imageStickerPos.x,
      posY: imageStickerPos.y,
    };
  };

  const handleStickerDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingStickerRef.current) return;
    const heroEl = document.getElementById('locket-hero-frame');
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    const deltaX = clientX - stickerDragStartRef.current.x;
    const deltaY = clientY - stickerDragStartRef.current.y;
    const newX = Math.max(0, Math.min(80, stickerDragStartRef.current.posX + (deltaX / rect.width) * 100));
    const newY = Math.max(0, Math.min(80, stickerDragStartRef.current.posY + (deltaY / rect.height) * 100));
    setImageStickerPos({ x: newX, y: newY });
  };

  // Sticker Corner Resize Handle Logic
  const isResizingStickerRef = useRef<boolean>(false);
  const stickerResizeStartRef = useRef<{ x: number; y: number; startScale: number }>({ x: 0, y: 0, startScale: 1.0 });

  const handleStickerResizeStart = (clientX: number, clientY: number) => {
    isResizingStickerRef.current = true;
    stickerResizeStartRef.current = {
      x: clientX,
      y: clientY,
      startScale: imageStickerScale,
    };
  };

  const handleStickerResizeMove = (clientX: number, clientY: number) => {
    if (!isResizingStickerRef.current) return;
    const deltaX = clientX - stickerResizeStartRef.current.x;
    const deltaY = clientY - stickerResizeStartRef.current.y;
    const delta = (deltaX + deltaY) / 120;
    const newScale = Math.max(0.3, Math.min(2.5, stickerResizeStartRef.current.startScale + delta));
    setImageStickerScale(Number(newScale.toFixed(2)));
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingStickerRef.current) {
        handleStickerDragMove(e.clientX, e.clientY);
      } else if (isResizingStickerRef.current) {
        handleStickerResizeMove(e.clientX, e.clientY);
      }
    };
    const onMouseUp = () => {
      isDraggingStickerRef.current = false;
      isResizingStickerRef.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [imageStickerPos, imageStickerScale]);

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
        showToast({ type: 'success', message: 'Đã lưu cấu hình Telegram Bot Khoảnh Khắc!' });
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

  // High Resolution Camera Stream Configuration
  const startCameraStream = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraActive(false);
        setCameraError('Trình duyệt chặn Camera khi dùng HTTP qua IP mạng (192.168.x.x). Hãy mở trang bằng http://localhost:3000 hoặc dùng HTTPS/nút Thư viện.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraActive(false);
        setCameraError('Trình duyệt hoặc thiết bị không hỗ trợ truy cập Webcam/Camera.');
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Trình duyệt đang CHẶN quyền Camera. Nhấp biểu tượng ổ khóa/camera trên thanh địa chỉ để BẬT quyền!');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Không tìm thấy thiết bị Camera/Webcam trên máy tính hoặc điện thoại.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera đang bị ứng dụng khác (Zoom, Teams, OBS...) chiếm dụng.');
      } else {
        setCameraError('Chưa cấp quyền Camera hoặc thiết bị không hỗ trợ Webcam. Bạn có thể dùng nút Thư viện để đăng ảnh!');
      }
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
  const capturePhotoFromHero = async () => {
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
    const rawSize = Math.min(rawWidth, rawHeight);
    const exportSize = Math.min(rawSize, 1200);

    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const startX = (rawWidth - rawSize) / 2;
    const startY = (rawHeight - rawSize) / 2;

    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(exportSize, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, rawSize, rawSize, 0, 0, exportSize, exportSize);
    ctx.restore();

    // Draw Cute Anime Couple Image Sticker if selected
    if (selectedImageSticker) {
      try {
        const stickerImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = selectedImageSticker.url;
        });

        ctx.save();
        const baseHeight = Math.round(exportSize * 0.28);
        const stickerHeight = Math.round(baseHeight * imageStickerScale);
        const aspect = stickerImg.width / stickerImg.height;
        const stickerWidth = stickerHeight * aspect;
        const stickerX = (exportSize * imageStickerPos.x) / 100;
        const stickerY = (exportSize * imageStickerPos.y) / 100;

        ctx.drawImage(stickerImg, stickerX, stickerY, stickerWidth, stickerHeight);
        ctx.restore();
      } catch (e) {
        console.error('Failed drawing image sticker onto canvas', e);
      }
    }

    // Draw Sticker Badge if present
    if (selectedSticker) {
      ctx.save();
      const fontSize = Math.round(exportSize * 0.035);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(selectedSticker);
      const paddingX = fontSize * 1.2;
      const paddingY = fontSize * 0.7;
      const badgeWidth = textMetrics.width + paddingX * 2;
      const badgeHeight = fontSize + paddingY * 2;
      const badgeX = (exportSize - badgeWidth) / 2;
      const badgeY = exportSize * 0.05;

      // Badge Background (White Frosted Glass)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.stroke();

      // Badge Text
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSticker, exportSize / 2, badgeY + badgeHeight / 2);
      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `locket_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        resetZoom();
      }
    }, 'image/jpeg', 0.85);
  };

  const discardCapturedPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setSelectedSticker(null);
    setSelectedImageSticker(null);
    setImageStickerPos({ x: 10, y: 10 });
    setImageStickerScale(1.0);
    setShowStickerPicker(false);
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

  const bakeFinalPhotoWithStickers = async (baseFile: File | string): Promise<File> => {
    return new Promise(async (resolve) => {
      try {
        const baseImg = await new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = typeof baseFile === 'string' ? baseFile : URL.createObjectURL(baseFile);
        });

        const exportSize = Math.min(Math.max(baseImg.width, baseImg.height), 1200);
        const canvas = document.createElement('canvas');
        canvas.width = exportSize;
        canvas.height = exportSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof baseFile === 'string' ? new File([], 'photo.jpg') : baseFile);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Apply active filter preset if any
        const filterPreset = BEAUTY_FILTERS.find((f) => f.id === activeFilter);
        if (filterPreset && filterPreset.canvasFilter !== 'none' && ctx.filter !== undefined) {
          ctx.filter = filterPreset.canvasFilter;
        }

        // Crop center square of base image
        const minDim = Math.min(baseImg.width, baseImg.height);
        const sx = (baseImg.width - minDim) / 2;
        const sy = (baseImg.height - minDim) / 2;

        ctx.drawImage(baseImg, sx, sy, minDim, minDim, 0, 0, exportSize, exportSize);
        ctx.restore();

        // 1. Bake Cute Chibi Image Sticker if selected
        if (selectedImageSticker) {
          try {
            const stickerImg = await new Promise<HTMLImageElement>((resStk, rejStk) => {
              const sImg = new Image();
              sImg.crossOrigin = 'anonymous';
              sImg.onload = () => resStk(sImg);
              sImg.onerror = rejStk;
              sImg.src = selectedImageSticker.url;
            });

            ctx.save();
            const baseHeight = Math.round(exportSize * 0.28);
            const stickerHeight = Math.round(baseHeight * imageStickerScale);
            const aspect = stickerImg.width / stickerImg.height;
            const stickerWidth = stickerHeight * aspect;
            const stickerX = (exportSize * imageStickerPos.x) / 100;
            const stickerY = (exportSize * imageStickerPos.y) / 100;

            ctx.drawImage(stickerImg, stickerX, stickerY, stickerWidth, stickerHeight);
            ctx.restore();
          } catch (err) {
            console.error('Error drawing image sticker:', err);
          }
        }

        // 2. Bake Text Tag Sticker if selected
        if (selectedSticker) {
          ctx.save();
          const fontSize = Math.round(exportSize * 0.035);
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textMetrics = ctx.measureText(selectedSticker);
          const paddingX = fontSize * 1.2;
          const paddingY = fontSize * 0.7;
          const badgeWidth = textMetrics.width + paddingX * 2;
          const badgeHeight = fontSize + paddingY * 2;
          const badgeX = (exportSize - badgeWidth) / 2;
          const badgeY = exportSize * 0.05;

          // Badge Background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
          ctx.fill();
          ctx.stroke();

          // Badge Text
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(selectedSticker, exportSize / 2, badgeY + badgeHeight / 2);
          ctx.restore();
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `locket_${Date.now()}.jpg`, { type: 'image/jpeg' });
              resolve(file);
            } else {
              resolve(typeof baseFile === 'string' ? new File([], 'photo.jpg') : baseFile);
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (e) {
        console.error('Bake photo failed:', e);
        resolve(typeof baseFile === 'string' ? new File([], 'photo.jpg') : baseFile);
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile && !previewUrl) return;

    let fileToUpload = selectedFile;
    let currentBlobUrl = previewUrl;

    if (selectedImageSticker || selectedSticker) {
      if (previewUrl || selectedFile) {
        fileToUpload = await bakeFinalPhotoWithStickers(previewUrl || selectedFile!);
        currentBlobUrl = URL.createObjectURL(fileToUpload);
      }
    }

    if (!fileToUpload) return;

    const currentCaption = caption;
    const tempId = `temp_${Date.now()}`;

    // 1. Optimistic UI update (< 50ms instant feedback)
    const optimisticPhoto: LocketPhoto = {
      id: tempId,
      sender: currentUser,
      telegram_file_id: '',
      caption: currentCaption,
      created_at: new Date().toISOString(),
      localBlobUrl: currentBlobUrl || undefined,
    };

    setPhotos((prev) => [optimisticPhoto, ...prev]);
    setHeroIndex(0);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setSelectedSticker(null);
    setSelectedImageSticker(null);
    setImageStickerPos({ x: 10, y: 10 });
    setImageStickerScale(1.0);
    setShowStickerPicker(false);
    resetZoom();
    showToast({ type: 'success', message: 'Đã đăng khoảnh khắc! 📸' });

    // 2. Background Upload with Client Image Compression
    try {
      setUploading(true);
      const compressedFile = await compressImageFile(fileToUpload);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('sender', currentUser);
      formData.append('caption', currentCaption);

      const res = await fetch('/api/locket/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.photo) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === tempId ? { ...data.photo, localBlobUrl: currentBlobUrl || undefined } : p))
        );
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        showToast({ type: 'error', message: `Lỗi: ${data.error}` });
      }
    } catch (e: any) {
      setPhotos((prev) => prev.filter((p) => p.id !== tempId));
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
            <span>Trở lại Khoảnh khắc</span>
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
                    src={photo.localBlobUrl || `/api/locket/photo/${photo.telegram_file_id}`}
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
      {/* Collapsible Header Bar (Default Collapsed for Max Camera Space) */}
      {showHeaderHeader ? (
        <div className="flex items-center justify-between bg-white/90 p-3.5 rounded-2xl border border-purple-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-purple-700">✨ Khoảnh Khắc</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded-xl border border-purple-200 transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title="Cấu hình Khoảnh Khắc"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHeaderHeader(false)}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Ẩn thanh tiêu đề"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pr-1 -mb-3">
          <button
            onClick={() => setShowHeaderHeader(true)}
            className="p-1.5 px-3 bg-white/80 backdrop-blur-md text-purple-600 hover:bg-white rounded-full border border-purple-200/60 shadow-xs text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Hiện tiêu đề & cài đặt"
          >
            <span>✨ Khoảnh Khắc</span>
            <ChevronDown className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>
      )}

      {/* Main Hero Locket 1:1 Square Frame with Pinch-to-Zoom & Double-Tap Support */}
      <div
        id="locket-hero-frame"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square w-full bg-slate-950 rounded-3xl overflow-hidden shadow-xl border-4 border-white ring-1 ring-purple-200/80 flex items-center justify-center group touch-none select-none"
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
                filter: BEAUTY_FILTERS.find((f) => f.id === activeFilter)?.css || 'none',
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

            {/* Top Center Active Sticker Badge Overlay */}
            {selectedSticker && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/90 shadow-xl text-slate-900 font-extrabold text-xs flex items-center gap-1.5 z-20 animate-in zoom-in-90 duration-150">
                <span>{selectedSticker}</span>
                <button
                  onClick={() => setSelectedSticker(null)}
                  className="text-slate-500 hover:text-rose-500 p-0.5 rounded-full cursor-pointer"
                  title="Xóa sticker"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Draggable & Resizable Raw Transparent Image Sticker Overlay (Photo Editor Handles Style) */}
            {selectedImageSticker && (
              <div
                style={{
                  left: `${imageStickerPos.x}%`,
                  top: `${imageStickerPos.y}%`,
                  transform: `scale(${imageStickerScale})`,
                  transformOrigin: 'top left',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleStickerDragStart(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleStickerDragStart(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchMove={(e) => {
                  if (isDraggingStickerRef.current) {
                    e.stopPropagation();
                    handleStickerDragMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={() => {
                  isDraggingStickerRef.current = false;
                }}
                className="absolute z-20 cursor-move touch-none select-none group p-1 ring-1 ring-purple-400/50 rounded-2xl hover:ring-purple-400 transition-all"
              >
                {/* Transparent PNG Sticker */}
                <img
                  src={selectedImageSticker.url}
                  alt={selectedImageSticker.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] pointer-events-none"
                />

                {/* Top Right Corner - Delete Button Handle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageSticker(null);
                  }}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-slate-950 text-white rounded-full hover:bg-rose-500 transition-all border-2 border-white cursor-pointer shadow-md flex items-center justify-center z-30"
                  title="Gỡ sticker"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Bottom Right Corner - Photo Editor Resize Handle Icon (Kéo góc này để phóng to / thu nhỏ) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleStickerResizeStart(e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleStickerResizeStart(e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  onTouchMove={(e) => {
                    if (isResizingStickerRef.current) {
                      e.stopPropagation();
                      handleStickerResizeMove(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchEnd={() => {
                    isResizingStickerRef.current = false;
                  }}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full border-2 border-white shadow-xl flex items-center justify-center cursor-nwse-resize active:scale-125 transition-transform z-30"
                  title="Kéo góc này để phóng to / thu nhỏ"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}

            {/* Horizontal 10 Chibi Couple Stickers Carousel Bar (Frosted White Glass) */}
            {showStickerPicker && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/45 backdrop-blur-md px-3 py-2 rounded-full border border-white/60 shadow-xl flex items-center gap-2 z-30 max-w-[95%] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {CUTE_COUPLE_STICKERS.map((stk) => (
                  <button
                    key={stk.id}
                    onClick={() => {
                      setSelectedImageSticker(stk);
                      setShowStickerPicker(false);
                    }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/40 hover:bg-white/80 border border-white/70 shadow-xs flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-90 p-1 ${
                      selectedImageSticker?.id === stk.id
                        ? 'ring-2 ring-purple-600 ring-offset-1 bg-white/90 scale-105 shadow-md'
                        : 'hover:scale-105'
                    }`}
                    title={stk.name}
                  >
                    <img src={stk.url} alt={stk.name} className="w-full h-full object-contain drop-shadow-xs" />
                  </button>
                ))}
              </div>
            )}

            {/* In-Frame Caption Input & Sticker Button & Send Pill Overlay (Translucent White Frosted Glass) */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/40 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/60 shadow-xl flex items-center gap-1.5 z-20">
              <button
                onClick={() => setShowStickerPicker((prev) => !prev)}
                className={`shrink-0 p-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSticker || selectedImageSticker
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'bg-white/60 text-slate-800 border-white/70 hover:bg-white/80'
                }`}
                title="Đính kèm Sticker / Tag"
              >
                <Smile className={`w-4 h-4 ${selectedSticker || selectedImageSticker ? 'text-white' : 'text-purple-600'}`} />
                <span>Sticker</span>
              </button>
              <input
                type="text"
                placeholder="💬 Thêm nhắn gửi..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpload();
                }}
                className="flex-1 min-w-0 bg-transparent text-slate-950 placeholder-slate-700/80 text-xs px-2 py-1 focus:outline-none font-semibold"
                autoFocus
              />
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
                style={{ filter: BEAUTY_FILTERS.find((f) => f.id === activeFilter)?.css || 'none' }}
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

            {/* Beauty Filter Toggle Button (Top Left - White Frosted Glass + "Hiệu ứng") */}
            {cameraActive && (
              <button
                onClick={() => setShowFilterPicker((prev) => !prev)}
                className="absolute top-3 left-3 bg-white/40 backdrop-blur-md text-slate-900 border border-white/60 shadow-lg px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:bg-white/60 active:scale-95 transition-all z-20"
                title="Chọn hiệu ứng bộ lọc"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                <span>Hiệu ứng</span>
              </button>
            )}

            {/* Flip Camera Button Overlay (Top Right) */}
            {cameraActive && (
              <button
                onClick={toggleFacingMode}
                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all border border-white/20 cursor-pointer z-10"
                title="Xoay Camera"
              >
                <FlipHorizontal className="w-4 h-4 text-purple-300" />
              </button>
            )}

            {/* Infinite 3-Circle Filter Wheel (Fixed Center Reticle, Always 3 Visible: Prev -> Center -> Next) */}
            {cameraActive && showFilterPicker && (() => {
              const activeIndex = BEAUTY_FILTERS.findIndex((f) => f.id === activeFilter);
              const currIdx = activeIndex >= 0 ? activeIndex : 0;
              const prevIdx = (currIdx - 1 + BEAUTY_FILTERS.length) % BEAUTY_FILTERS.length;
              const nextIdx = (currIdx + 1) % BEAUTY_FILTERS.length;

              const prevFilter = BEAUTY_FILTERS[prevIdx];
              const currFilter = BEAUTY_FILTERS[currIdx];
              const nextFilter = BEAUTY_FILTERS[nextIdx];

              const rotatePrev = () => {
                setActiveFilter(prevFilter.id);
              };

              const rotateNext = () => {
                setActiveFilter(nextFilter.id);
              };

              return (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    filterTouchStartXRef.current = e.clientX;
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    if (filterTouchStartXRef.current === null) return;
                    const deltaX = e.clientX - filterTouchStartXRef.current;
                    filterTouchStartXRef.current = null;

                    const now = Date.now();
                    if (now - lastFilterSwipeTimeRef.current < 220) return;

                    if (deltaX < -40) {
                      lastFilterSwipeTimeRef.current = now;
                      rotateNext();
                    } else if (deltaX > 40) {
                      lastFilterSwipeTimeRef.current = now;
                      rotatePrev();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    filterTouchStartXRef.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    if (filterTouchStartXRef.current === null) return;
                    const deltaX = e.changedTouches[0].clientX - filterTouchStartXRef.current;
                    filterTouchStartXRef.current = null;

                    const now = Date.now();
                    if (now - lastFilterSwipeTimeRef.current < 220) return;

                    if (deltaX < -40) {
                      lastFilterSwipeTimeRef.current = now;
                      rotateNext();
                    } else if (deltaX > 40) {
                      lastFilterSwipeTimeRef.current = now;
                      rotatePrev();
                    }
                  }}
                  onWheel={(e) => {
                    e.stopPropagation();
                    const now = Date.now();
                    if (now - lastFilterSwipeTimeRef.current < 220) return;

                    if (e.deltaY > 20 || e.deltaX > 20) {
                      lastFilterSwipeTimeRef.current = now;
                      rotateNext();
                    } else if (e.deltaY < -20 || e.deltaX < -20) {
                      lastFilterSwipeTimeRef.current = now;
                      rotatePrev();
                    }
                  }}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/45 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/60 shadow-xl flex items-center justify-between z-30 w-[175px] select-none cursor-grab active:cursor-grabbing [mask-image:linear-gradient(to_right,transparent_0%,black_20%,black_80%,transparent_100%)]"
                >
                  {/* Fixed Center Reticle Indicator Ring (Vòng chọn cố định 100% ở chính giữa) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full ring-4 ring-purple-600 ring-offset-2 ring-offset-slate-900 pointer-events-none shadow-xl z-20" />

                  {/* Left Circle (Luôn hiển thị Filter liền trước, ví dụ: 6 khi ở 1) */}
                  <button
                    onClick={rotatePrev}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 transition-all cursor-pointer shadow-xs opacity-40 hover:opacity-80 scale-85 flex items-center justify-center ${prevFilter.colorClass}`}
                    title={prevFilter.name}
                  >
                    {prevFilter.id === 'natural' && (
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                    )}
                  </button>

                  {/* Center Circle (Đang chọn ở chính giữa) */}
                  <button
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 transition-all cursor-default shadow-lg scale-110 opacity-100 flex items-center justify-center z-10 ${currFilter.colorClass}`}
                    title={`Đang chọn: ${currFilter.name}`}
                  >
                    {currFilter.id === 'natural' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    )}
                  </button>

                  {/* Right Circle (Luôn hiển thị Filter liền sau, ví dụ: 2 khi ở 1) */}
                  <button
                    onClick={rotateNext}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 transition-all cursor-pointer shadow-xs opacity-40 hover:opacity-80 scale-85 flex items-center justify-center ${nextFilter.colorClass}`}
                    title={nextFilter.name}
                  >
                    {nextFilter.id === 'natural' && (
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                    )}
                  </button>
                </div>
              );
            })()}
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
                src={currentPhoto.localBlobUrl || `/api/locket/photo/${currentPhoto.telegram_file_id}`}
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

              {/* Top Sender Badge & Timestamp (Centered White Frosted Glass) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/45 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-white/60 shadow-md z-10 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-950">{currentPhoto.sender}</span>
                <span className="text-[11px] font-medium text-slate-700">
                  • {new Date(currentPhoto.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

              {/* Bottom Caption Overlay (Frosted White Glass) */}
              {currentPhoto.caption && (
                <div className="absolute bottom-3 left-3 right-3 bg-white/40 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl text-slate-950 text-xs sm:text-sm font-semibold border border-white/60 shadow-xl z-10">
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

      {/* Control Bar: Shutter & Mode Switchers (Compact Sleek Card) */}
      <div className="bg-white/95 border border-purple-100/80 p-2.5 sm:p-3 rounded-2xl shadow-sm flex items-center justify-around">
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
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all border border-purple-200/70 bg-purple-50/70 text-purple-700 hover:bg-purple-100 cursor-pointer shadow-2xs active:scale-95"
          title="Mở Nhật Ký Tất Cả Khoảnh Khắc"
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Nhật ký</span>
        </button>

        {/* Authentic Locket Round Shutter Button / Send Action */}
        <button
          onClick={capturePhotoFromHero}
          disabled={uploading}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 shrink-0 mx-1"
          title={previewUrl ? 'Bấm để Đăng khoảnh khắc HD' : heroIndex === -1 ? 'Chụp ngay' : 'Về Camera để chụp'}
        >
          <div className="w-full h-full rounded-full border-3 border-white flex items-center justify-center">
            {previewUrl ? (
              <Send className="w-4 h-4 text-white" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-white"></div>
            )}
          </div>
        </button>

        {/* Gallery Upload Button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-1 bg-purple-50/70 text-purple-700 px-2.5 py-1.5 rounded-xl font-semibold hover:bg-purple-100 transition-all border border-purple-200/70 text-[11px] sm:text-xs cursor-pointer shadow-2xs active:scale-95"
        >
          <Upload className="w-3.5 h-3.5 text-purple-600 shrink-0" />
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
                <span>Cấu hình Bot Lưu Trữ Khoảnh Khắc</span>
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
