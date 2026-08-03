# Locket Real-time Photo Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Locket-style real-time photo-sharing feature for `chinhan` and `thanhhuong`, leveraging a Telegram Bot for unlimited cloud photo storage and Next.js API proxying for high-performance caching.

**Architecture:** A dedicated `LocketTab.tsx` set as default active tab in `app/page.tsx`. Photos captured via live web camera or file selector are uploaded via `POST /api/locket/upload` to Telegram Bot API (`sendPhoto`), storing metadata in Firestore / Local DB. Image binaries are proxied via `GET /api/locket/photo/[fileId]` with HTTP caching, and photos are displayed in a 1:1 square hero frame alongside a paginated 10-item history list.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Telegram Bot API, Firebase Firestore / Local JSON DB.

## Global Constraints
- Photos MUST be proxied through `GET /api/locket/photo/[fileId]` with `Cache-Control: public, max-age=86400` to prevent Telegram Bot Token leakage and maximize load speeds.
- Paginated feeds MUST load 10 photos per request with a "Tải thêm" button for performance.
- Both Firebase Firestore and Local DB fallback MUST be supported seamlessly.
- Telegram Bot notification MUST be sent to partner upon successful photo upload.

---

### Task 1: Database Metadata Storage Helpers

**Files:**
- Modify: `lib/local-db.ts`
- Modify: `lib/firebase.ts`
- Modify: `types/index.ts` (or create if needed)
- Test: `test_locket_db.ts`

**Interfaces:**
- Consumes: `LocketPhoto` interface
- Produces: `getLocketPhotos(page, limit)`, `saveLocketPhoto(photoData)`

- [ ] **Step 1: Write the failing test script `test_locket_db.ts`**

```typescript
import { saveLocketPhoto, getLocketPhotos } from './lib/local-db';

async function testDb() {
  const dummy = {
    id: `test_${Date.now()}`,
    sender: 'chinhan',
    telegram_file_id: 'dummy_file_id_123',
    caption: 'Test moment',
    created_at: new Date().toISOString()
  };
  await saveLocketPhoto(dummy);
  const feed = await getLocketPhotos(1, 10);
  console.log('Saved photo found:', feed.photos.some((p: any) => p.id === dummy.id));
}
testDb();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test_locket_db.ts`
Expected: FAIL with "saveLocketPhoto is not exported"

- [ ] **Step 3: Implement `saveLocketPhoto` and `getLocketPhotos` in `lib/local-db.ts` and `lib/firebase.ts`**

In `lib/local-db.ts`:
```typescript
export interface LocketPhoto {
  id: string;
  sender: string;
  telegram_file_id: string;
  caption?: string;
  created_at: string;
}

export async function getLocketPhotosLocal(page = 1, limit = 10): Promise<{ photos: LocketPhoto[]; total: number; hasMore: boolean }> {
  const db = await readLocalDb();
  const list: LocketPhoto[] = db.locket_photos || [];
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const total = list.length;
  const start = (page - 1) * limit;
  const photos = list.slice(start, start + limit);
  return { photos, total, hasMore: start + limit < total };
}

export async function saveLocketPhotoLocal(photo: LocketPhoto): Promise<boolean> {
  const db = await readLocalDb();
  if (!db.locket_photos) db.locket_photos = [];
  db.locket_photos.unshift(photo);
  await writeLocalDb(db);
  return true;
}
```

In `lib/firebase.ts`:
```typescript
export async function getLocketPhotosFirestore(page = 1, limit = 10) {
  // Queries collection 'locket_photos' ordered by created_at desc
  try {
    const snapshot = await db.collection('locket_photos').orderBy('created_at', 'desc').get();
    const list = snapshot.docs.map(doc => doc.data() as LocketPhoto);
    const total = list.length;
    const start = (page - 1) * limit;
    const photos = list.slice(start, start + limit);
    return { photos, total, hasMore: start + limit < total };
  } catch (e) {
    return getLocketPhotosLocal(page, limit);
  }
}

export async function saveLocketPhotoFirestore(photo: LocketPhoto) {
  try {
    await db.collection('locket_photos').doc(photo.id).set(photo);
    await saveLocketPhotoLocal(photo);
    return true;
  } catch (e) {
    return saveLocketPhotoLocal(photo);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx test_locket_db.ts`
Expected: PASS outputting "Saved photo found: true"

- [ ] **Step 5: Clean up test script & Commit**

```bash
rm test_locket_db.ts
git add lib/local-db.ts lib/firebase.ts
git commit -m "feat(locket): add database helpers for locket_photos"
```

---

### Task 2: Upload API Route (`POST /api/locket/upload`)

**Files:**
- Create: `app/api/locket/upload/route.ts`

**Interfaces:**
- Consumes: `FormData` with `file`, `sender`, `caption`
- Produces: `POST /api/locket/upload` JSON response

- [ ] **Step 1: Create `app/api/locket/upload/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { saveLocketPhotoFirestore, getSettingsForUser } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sender = (formData.get('sender') as string) || 'chinhan';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ success: false, error: 'Telegram Bot Token / Chat ID missing' }, { status: 500 });
    }

    // 1. Upload photo to Telegram Bot via sendPhoto multipart API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const teleFormData = new FormData();
    teleFormData.append('chat_id', chatId.split(',')[0].trim());
    teleFormData.append('photo', new Blob([buffer], { type: file.type || 'image/jpeg' }), 'locket.jpg');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: teleFormData,
    });
    const teleJson = await res.json();

    if (!teleJson.ok || !teleJson.result?.photo) {
      return NextResponse.json({ success: false, error: teleJson.description || 'Failed to send photo to Telegram' }, { status: 500 });
    }

    // Pick highest resolution photo file_id
    const photos = teleJson.result.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;

    // 2. Save metadata record to DB
    const photoRecord = {
      id: `loc_${Date.now()}`,
      sender,
      telegram_file_id: fileId,
      caption,
      created_at: new Date().toISOString(),
    };

    await saveLocketPhotoFirestore(photoRecord);

    // 3. Send Telegram notification to partner
    const notifyText = `📸 *${sender}* vừa đăng một khoảnh khắc mới trên Locket!${caption ? `\n💬 "${caption}"` : ''}`;
    const notifyPayload = {
      chat_id: chatId,
      text: notifyText,
      parse_mode: 'Markdown',
    };
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyPayload),
    }).catch(console.error);

    return NextResponse.json({ success: true, photo: photoRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit API route**

```bash
git add app/api/locket/upload/route.ts
git commit -m "feat(locket): add POST /api/locket/upload endpoint"
```

---

### Task 3: Feed API Route (`GET /api/locket/feed`)

**Files:**
- Create: `app/api/locket/feed/route.ts`

**Interfaces:**
- Consumes: Query params `page`, `limit`
- Produces: `GET /api/locket/feed` JSON response

- [ ] **Step 1: Create `app/api/locket/feed/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getLocketPhotosFirestore } from '@/lib/firebase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const data = await getLocketPhotosFirestore(page, limit);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit API route**

```bash
git add app/api/locket/feed/route.ts
git commit -m "feat(locket): add GET /api/locket/feed endpoint"
```

---

### Task 4: Image Proxy API Route (`GET /api/locket/photo/[fileId]`)

**Files:**
- Create: `app/api/locket/photo/[fileId]/route.ts`

**Interfaces:**
- Consumes: URL parameter `fileId`
- Produces: Binary image response with `Cache-Control` header

- [ ] **Step 1: Create `app/api/locket/photo/[fileId]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getTelegramFilePath, downloadTelegramPhotoBuffer } from '@/lib/telegram';

export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return new NextResponse('Bot Token Missing', { status: 500 });
    }

    const fileId = params.fileId;
    if (!fileId) {
      return new NextResponse('File ID Missing', { status: 400 });
    }

    const filePath = await getTelegramFilePath(token, fileId);
    if (!filePath) {
      return new NextResponse('File path not found', { status: 44 });
    }

    const buffer = await downloadTelegramPhotoBuffer(token, filePath);
    if (!buffer) {
      return new NextResponse('Failed to download image', { status: 500 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit Image Proxy API**

```bash
git add app/api/locket/photo/[fileId]/route.ts
git commit -m "feat(locket): add GET /api/locket/photo/[fileId] image proxy endpoint"
```

---

### Task 5: Frontend `LocketTab.tsx` Component & App Integration

**Files:**
- Create: `components/LocketTab.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `/api/locket/*` APIs
- Produces: UI component with 1:1 hero feed, instant camera/upload button, preview modal with explicit upload, and 10-item history pagination.

- [ ] **Step 1: Create `components/LocketTab.tsx`**

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Download, RefreshCw, Send, Image as ImageIcon } from 'lucide-react';
import { useToast } from './ui/Toast';

interface LocketPhoto {
  id: string;
  sender: string;
  telegram_file_id: string;
  caption?: string;
  created_at: string;
}

export default function LocketTab() {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState<LocketPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // User Selection
  const [currentUser, setCurrentUser] = useState<'chinhan' | 'thanhhuong'>('chinhan');

  // Photo Capture / Preview State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      showToast('Không thể tải nhật ký khoảnh khắc', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(1, false);
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
        showToast('Đã đăng khoảnh khắc thành công! 📸', 'success');
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        fetchFeed(1, false);
      } else {
        showToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast('Lỗi khi tải khoảnh khắc lên', 'error');
    } finally {
      setUploading(false);
    }
  };

  const latestPhoto = photos[0];

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
      {/* Header User Switcher */}
      <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
        <span className="text-sm font-medium text-slate-300">Đang đăng với tên:</span>
        <div className="flex bg-slate-900 rounded-xl p-1">
          <button
            onClick={() => setCurrentUser('chinhan')}
            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
              currentUser === 'chinhan' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            chinhan
          </button>
          <button
            onClick={() => setCurrentUser('thanhhuong')}
            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
              currentUser === 'thanhhuong' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            thanhhuong
          </button>
        </div>
      </div>

      {/* Main Hero Locket 1:1 Square Frame */}
      <div className="relative aspect-square w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/30 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-2 text-amber-400" />
            <span className="text-sm">Đang tải khoảnh khắc...</span>
          </div>
        ) : latestPhoto ? (
          <div className="relative w-full h-full group">
            <img
              src={`/api/locket/photo/${latestPhoto.telegram_file_id}`}
              alt="Locket moment"
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
          <div className="text-center text-slate-500 p-6">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có khoảnh khắc nào. Hãy là người đầu tiên chụp và đăng!</p>
          </div>
        )}
      </div>

      {/* Quick Snap & Camera Trigger Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-around">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Big Snap Shutter Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-6 py-3 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg"
        >
          <Camera className="w-5 h-5" />
          <span>Chụp Ảnh</span>
        </button>

        {/* Gallery Upload Button */}
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute('capture');
              fileInputRef.current.click();
            }
          }}
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl font-medium hover:bg-slate-700 transition-all border border-slate-700 text-xs"
        >
          <Upload className="w-4 h-4" />
          <span>Thư viện</span>
        </button>
      </div>

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
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-medium hover:bg-slate-700 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl font-bold hover:bg-amber-400 text-sm flex items-center justify-center gap-1.5"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Tải lên</span>
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
            <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group">
              <img
                src={`/api/locket/photo/${photo.telegram_file_id}`}
                alt="Moment"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2 flex flex-col justify-between opacity-90">
                <span className="text-[10px] text-white font-medium bg-black/40 px-2 py-0.5 rounded-full w-fit">
                  {photo.sender}
                </span>

                <div className="flex items-end justify-between gap-1">
                  <p className="text-[11px] text-slate-200 truncate">{photo.caption || '...'}</p>
                  <a
                    href={`/api/locket/photo/${photo.telegram_file_id}`}
                    download={`locket_${photo.id}.jpg`}
                    className="p-1 bg-black/60 text-white rounded-lg hover:bg-black"
                  >
                    <Download className="w-3 h-3" />
                  </a>
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
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 py-3 rounded-2xl text-xs font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Tải thêm khoảnh khắc cũ'}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `app/page.tsx` to set `locket` as default tab**

In `app/page.tsx`:
```tsx
// Set initial active tab state to 'locket'
const [activeTab, setActiveTab] = useState<'locket' | 'register' | 'salary' | 'notes' | 'expense' | 'settings'>('locket');
```

- [ ] **Step 3: Commit Frontend Integration**

```bash
git add components/LocketTab.tsx app/page.tsx
git commit -m "feat(locket): add LocketTab UI component and set as default active tab"
```

---

### Task 6: End-to-End Build & Verification

**Files:**
- None (Build verification)

- [ ] **Step 1: Run Next.js build to confirm TypeScript compilation & linting pass cleanly**

Run: `npm run build`
Expected: Successful production build without TypeScript errors.

- [ ] **Step 2: Commit final build confirmation**

```bash
git status
```
