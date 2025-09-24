import { NextRequest, NextResponse } from 'next/server';
import { RedditClient } from '@/lib/reddit-client';
import { PainPointExtractor } from '@/lib/pain-point-extractor';
import { GeminiAnalyzer } from '@/lib/gemini-analyzer';
import { validateConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // Validate environment configuration
    validateConfig();

    const { searchTerm } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Search term is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize services
    const redditClient = new RedditClient();
    const geminiAnalyzer = new GeminiAnalyzer();

    // Step 1: Scrape Reddit for posts
    console.log(`Starting analysis for: ${searchTerm}`);
    const posts = await redditClient.getPostsWithComments(searchTerm);
    console.log(`Found ${posts.length} posts`);

    if (posts.length === 0) {
      return NextResponse.json({
        categories: [],
        totalPainPoints: 0,
        searchTerm,
        analyzedAt: new Date(),
        topCategories: [],
        message: 'No posts found for this search term. Try a different search term or check if it\'s spelled correctly.',
      });
    }

    // Step 2: Extract pain points
    const painPoints = PainPointExtractor.extractPainPoints(posts);
    console.log(`Extracted ${painPoints.length} pain points`);

    if (painPoints.length === 0) {
      return NextResponse.json({
        categories: [],
        totalPainPoints: 0,
        searchTerm,
        analyzedAt: new Date(),
        topCategories: [],
        message: 'No complaints or pain points found in the posts. The discussions might be mostly positive.',
      });
    }

    // Step 3: Filter by engagement (optional)
    const filteredPainPoints = PainPointExtractor.filterByEngagement(painPoints, 2);
    console.log(`Filtered to ${filteredPainPoints.length} high-engagement pain points`);

    // Step 4: AI categorization and analysis
    const analysisResult = await geminiAnalyzer.categorizePainPoints(
      filteredPainPoints.length > 0 ? filteredPainPoints : painPoints,
      searchTerm
    );

    console.log(`Analysis complete: ${analysisResult.categories.length} categories created`);

    return NextResponse.json(analysisResult);

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