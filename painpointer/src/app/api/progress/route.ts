import { NextRequest, NextResponse } from 'next/server';
import { progressTracker } from '@/lib/progress-tracker';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('id');

  if (!analysisId) {
    return NextResponse.json(
      { error: 'Analysis ID is required' },
      { status: 400 }
    );
  }

  const progress = progressTracker.getProgress(analysisId);

  if (!progress) {
    return NextResponse.json(
      { error: 'Analysis not found or completed' },
      { status: 404 }
    );
  }

  return NextResponse.json(progress);
}