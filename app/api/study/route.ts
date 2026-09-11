import { NextRequest, NextResponse } from 'next/server';
import { getStudyDataForUser, getClassesForDate } from '@/lib/study-hub';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = req.headers.get('x-username') || searchParams.get('username') || 'thanhhuong';
    const date = searchParams.get('date');
    const week = searchParams.get('week');

    const studyData = getStudyDataForUser(username);

    if (!studyData) {
      return NextResponse.json({
        success: false,
        message: 'Chưa có dữ liệu thời khóa biểu cho người dùng này.',
        data: null,
      }, { status: 404 });
    }

    // If query by date
    if (date) {
      const classes = getClassesForDate(username, date);
      return NextResponse.json({
        success: true,
        student: studyData.student,
        date,
        classes,
      });
    }

    // If query by week
    if (week) {
      const weekInfo = studyData.weeks[week];
      return NextResponse.json({
        success: true,
        student: studyData.student,
        week: Number(week),
        weekInfo: weekInfo || null,
      });
    }

    // Full study schedule
    return NextResponse.json({
      success: true,
      data: studyData,
    });
  } catch (error: any) {
    console.error('API Study Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi lấy dữ liệu lịch học.',
    }, { status: 500 });
  }
}
