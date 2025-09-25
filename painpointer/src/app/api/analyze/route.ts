import { NextRequest, NextResponse } from 'next/server';
import { RedditClient } from '@/lib/reddit-client';
import { PainPointExtractor } from '@/lib/pain-point-extractor';
import { GeminiAnalyzer } from '@/lib/gemini-analyzer';
import { validateConfig } from '@/lib/config';
import { progressTracker } from '@/lib/progress-tracker';

export async function POST(request: NextRequest) {
  let analysisId: string;
  
  try {
    // Validate environment configuration
    validateConfig();

    const { searchTerm, analysisId: providedAnalysisId } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Search term is required and must be a string' },
        { status: 400 }
      );
    }

    // Use provided analysis ID or generate one
    analysisId = providedAnalysisId || (Date.now().toString() + Math.random().toString(36).substring(2));

    // Initialize services
    progressTracker.updateProgress(analysisId, 'setup', 'Initializing Reddit and AI services...', 5);
    const redditClient = new RedditClient();
    const geminiAnalyzer = new GeminiAnalyzer();

    // Step 1: Scrape Reddit for posts
    progressTracker.updateProgress(analysisId, 'searching', 'Launching comprehensive Reddit search...', 10);
    console.log(`Starting analysis for: ${searchTerm}`);
    
    const posts = await redditClient.getPostsWithComments(searchTerm);
    console.log(`Found ${posts.length} posts`);
    
    progressTracker.updateProgress(analysisId, 'searching', `Found ${posts.length} posts across Reddit`, 35, 
      posts.length > 100 ? 'Excellent data coverage!' : posts.length > 50 ? 'Good data coverage' : 'Limited data found');

    if (posts.length === 0) {
      progressTracker.updateProgress(analysisId, 'complete', 'No posts found for analysis', 100);
      setTimeout(() => progressTracker.cleanup(analysisId), 30000);
      return NextResponse.json({
        analysisId,
        categories: [],
        totalPainPoints: 0,
        searchTerm,
        analyzedAt: new Date(),
        topCategories: [],
        message: 'No posts found for this search term. Try a different search term or check if it\'s spelled correctly.',
      });
    }


    // Step 2: Extract pain points (keyword/pattern)
    progressTracker.updateProgress(analysisId, 'extracting', 'Extracting pain points from posts...', 50);
    const initialPainPoints = PainPointExtractor.extractPainPoints(posts);
    console.log(`Extracted ${initialPainPoints.length} candidate pain points`);

    // Step 2b: AI relevance filtering
    progressTracker.updateProgress(analysisId, 'extracting', 'Filtering pain points for relevance with AI...', 55);
    const painPoints = await PainPointExtractor.aiFilterRelevantPainPoints(initialPainPoints, searchTerm);
    console.log(`AI kept ${painPoints.length} relevant pain points`);

    progressTracker.updateProgress(analysisId, 'extracting', `Identified ${painPoints.length} relevant pain points`, 60,
      painPoints.length > 20 ? 'Rich complaint data found' : painPoints.length > 10 ? 'Moderate complaints found' : 'Few complaints detected');

    if (painPoints.length === 0) {
      progressTracker.updateProgress(analysisId, 'complete', 'No relevant pain points detected in discussions', 100);
      setTimeout(() => progressTracker.cleanup(analysisId), 30000);
      return NextResponse.json({
        analysisId,
        categories: [],
        totalPainPoints: 0,
        searchTerm,
        analyzedAt: new Date(),
        topCategories: [],
        message: 'No relevant complaints or pain points found in the posts. The discussions might be mostly positive or off-topic.',
      });
    }

    // Step 3: Filter by engagement (optional)
    progressTracker.updateProgress(analysisId, 'filtering', 'Filtering by engagement quality...', 70);
    const filteredPainPoints = PainPointExtractor.filterByEngagement(painPoints, 2);
    console.log(`Filtered to ${filteredPainPoints.length} high-engagement pain points`);
    
    const finalPainPoints = filteredPainPoints.length > 0 ? filteredPainPoints : painPoints;
    progressTracker.updateProgress(analysisId, 'filtering', `Analyzing ${finalPainPoints.length} high-quality pain points`, 75);

    // Step 4: AI categorization and analysis
    progressTracker.updateProgress(analysisId, 'categorizing', 'AI is categorizing and analyzing complaints...', 80);
    const analysisResult = await geminiAnalyzer.categorizePainPoints(finalPainPoints, searchTerm);

    progressTracker.updateProgress(analysisId, 'summarizing', 'Generating AI summaries for each category...', 90);
    console.log(`Analysis complete: ${analysisResult.categories.length} categories created`);

    progressTracker.updateProgress(analysisId, 'complete', `Analysis complete! Found ${analysisResult.categories.length} pain point categories`, 100,
      `${analysisResult.totalPainPoints} total complaints analyzed`);

    // Clean up progress after a delay
    setTimeout(() => progressTracker.cleanup(analysisId), 30000);

    return NextResponse.json({
      ...analysisResult,
      analysisId
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('REDDIT_CLIENT_ID')) {
        return NextResponse.json(
          { error: 'Reddit API configuration is missing. Please check your environment variables.' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'Gemini API configuration is missing. Please check your environment variables.' },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An error occurred during analysis. Please try again.' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    validateConfig();
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Pain Point Analyzer API is running'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Configuration error - check environment variables',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}