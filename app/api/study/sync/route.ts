import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { parseHubTkbData, saveStudyDataForUser } from '@/lib/study-hub';
import { HUB_TKB_SEED } from '@/lib/hub-tkb-seed';

const HUB_TKB_APP_DATA = '/home/chinhan/hub-tkb-app/data.js';

export async function POST(req: NextRequest) {
  try {
    const username = req.headers.get('x-username') || 'thanhhuong';
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is allowed
    }

    let parsedData = HUB_TKB_SEED;

    // If running in local dev with access to local filesystem
    if (fs.existsSync(HUB_TKB_APP_DATA)) {
      try {
        const raw = fs.readFileSync(HUB_TKB_APP_DATA, 'utf-8');
        parsedData = parseHubTkbData(raw);
      } catch (err) {
        console.warn('Cannot read local file, using bundled seed data:', err);
      }
    }

    // Save for the user (in /tmp or data/)
    saveStudyDataForUser(username, parsedData);

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công thời khóa biểu HUB cho ${parsedData.student?.name || username}! (${parsedData.courses?.length || 0} môn học, 22 tuần).`,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('API Study Sync Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi đồng bộ thời khóa biểu.',
    }, { status: 500 });
  }
}
