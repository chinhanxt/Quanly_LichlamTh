import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { parseHubTkbData, saveStudyDataForUser } from '@/lib/study-hub';

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

    if (!fs.existsSync(HUB_TKB_APP_DATA)) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy nguồn dữ liệu hub-tkb-app tại /home/chinhan/hub-tkb-app/data.js',
      }, { status: 400 });
    }

    const raw = fs.readFileSync(HUB_TKB_APP_DATA, 'utf-8');
    const parsedData = parseHubTkbData(raw);

    // Save for the user
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
