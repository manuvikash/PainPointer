import { RedditPost } from './reddit-client';

export interface PainPoint {
  id: string;
  content: string;
  source: 'title' | 'post' | 'comment';
  score: number;
  num_comments: number;
  subreddit: string;
  url: string;
  created_utc: number;
  engagementScore: number; // Calculated score based on upvotes + comments
}

export class PainPointExtractor {
  // Keywords that indicate complaints or pain points
  private static readonly COMPLAINT_KEYWORDS = [
    // Direct complaints
    'hate', 'awful', 'terrible', 'worst', 'horrible', 'annoying', 'frustrating',
    'useless', 'broken', 'buggy', 'slow', 'expensive', 'overpriced',
    
    // Problem indicators
    'problem', 'issue', 'bug', 'error', 'fail', 'crash', 'freeze', 'glitch',
    'doesn\'t work', 'not working', 'stopped working', 'broken',
    
    // Negative experiences
    'disappointed', 'regret', 'waste', 'scam', 'rip off', 'avoid', 'never again',
    'poor quality', 'bad experience', 'customer service', 'support',
    
    // Improvement needs
    'should fix', 'needs to', 'wish they would', 'hope they', 'better if',
    'why can\'t', 'when will', 'still waiting'
  ];

  // Negative sentiment patterns
  private static readonly NEGATIVE_PATTERNS = [
    /why (does|is|are|do) .+ (so|such) .+ (bad|awful|terrible|slow|expensive)/i,
    /can't believe .+ (still|doesn't|won't)/i,
    /(hate|dislike) (how|that|when) .+/i,
    /wish .+ (would|could|didn't) .+/i,
    /(sick|tired) (of|from) .+/i,
    /what's wrong with .+/i,
    /(anyone else|does anyone) (hate|dislike|have problems) .+/i
  ];

  /**
   * Extract pain points from Reddit posts
   */
  static extractPainPoints(posts: RedditPost[]): PainPoint[] {
    const painPoints: PainPoint[] = [];

    for (const post of posts) {
      // Check title for pain points
      if (this.containsPainPoint(post.title)) {
        painPoints.push({
          id: `${post.id}_title`,
          content: post.title,
          source: 'title',
          score: post.score,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          url: post.url,
          created_utc: post.created_utc,
          engagementScore: this.calculateEngagementScore(post.score, post.num_comments),
        });
      }

      // Check post content for pain points
      if (post.selftext && this.containsPainPoint(post.selftext)) {
        painPoints.push({
          id: `${post.id}_post`,
          content: this.extractRelevantText(post.selftext),
          source: 'post',
          score: post.score,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          url: post.url,
          created_utc: post.created_utc,
          engagementScore: this.calculateEngagementScore(post.score, post.num_comments),
        });
      }

      // Process comments if available
      if (post.comments) {
        for (const comment of post.comments) {
          if (this.containsPainPoint(comment.body)) {
            painPoints.push({
              id: `${comment.id}_comment`,
              content: this.extractRelevantText(comment.body),
              source: 'comment',
              score: comment.score,
              num_comments: 0,
              subreddit: post.subreddit,
              url: post.url,
              created_utc: comment.created_utc,
              engagementScore: this.calculateEngagementScore(comment.score, 0),
            });
          }
        }
      }
    }

    // Sort by engagement score and remove duplicates
    return this.deduplicateAndSort(painPoints);
  }

  /**
   * Check if text contains pain point indicators
   */
  private static containsPainPoint(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for complaint keywords
    const hasComplaintKeywords = this.COMPLAINT_KEYWORDS.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    // Check for negative patterns
    const hasNegativePatterns = this.NEGATIVE_PATTERNS.some(pattern => 
      pattern.test(text)
    );

    // Additional checks for question-based complaints
    const isComplaintQuestion = (
      lowerText.includes('?') && 
      (lowerText.includes('why') || lowerText.includes('how')) &&
      (lowerText.includes('bad') || lowerText.includes('slow') || lowerText.includes('broken'))
    );

    return hasComplaintKeywords || hasNegativePatterns || isComplaintQuestion;
  }

  /**
   * Extract relevant text snippet (first 200 chars for long posts)
   */
  private static extractRelevantText(text: string): string {
    const cleanText = text.replace(/\n+/g, ' ').trim();
    return cleanText.length > 200 ? cleanText.substring(0, 200) + '...' : cleanText;
  }

  /**
   * Calculate engagement score based on upvotes and comments
   */
  private static calculateEngagementScore(score: number, numComments: number): number {
    // Weight comments higher as they indicate engagement
    return score + (numComments * 2);
  }

  /**
   * Remove duplicates and sort by engagement score
   */
  private static deduplicateAndSort(painPoints: PainPoint[]): PainPoint[] {
    // Simple deduplication based on similar content
    const seen = new Set<string>();
    const deduplicated = painPoints.filter(point => {
      const key = point.content.toLowerCase().substring(0, 50);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by engagement score (highest first)
    return deduplicated
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 100); // Limit to top 100 pain points
  }

  /**
  import { GoogleGenerativeAI } from '@google/generative-ai';
  import { config } from './config';
   * Filter pain points by minimum engagement threshold
   */
  static filterByEngagement(painPoints: PainPoint[], minScore: number = 5): PainPoint[] {
    return painPoints.filter(point => point.engagementScore >= minScore);
  }

  /**
   * Group pain points by subreddit
   */
  static groupBySubreddit(painPoints: PainPoint[]): Record<string, PainPoint[]> {
    return painPoints.reduce((groups, point) => {
      if (!groups[point.subreddit]) {
        groups[point.subreddit] = [];
      }
      groups[point.subreddit].push(point);
      return groups;
    }, {} as Record<string, PainPoint[]>);
  }

  /**
   * AI-powered relevance filter for pain points
   * Only keeps pain points that are actually about the search term
   */
  static async aiFilterRelevantPainPoints(painPoints: PainPoint[], searchTerm: string): Promise<PainPoint[]> {
    if (!painPoints.length) return [];
    // Dynamically import to avoid issues in environments without the package
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const { config } = await import('./config');
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Batch up to 10 pain points per prompt for efficiency
    const batchSize = 10;
    const batches: PainPoint[][] = [];
    for (let i = 0; i < painPoints.length; i += batchSize) {
      batches.push(painPoints.slice(i, i + batchSize));
    }

    const relevantPainPoints: PainPoint[] = [];

    for (const batch of batches) {
      const prompt = `You are an expert at identifying product complaints. For each Reddit post/comment below, answer:
1. Is this complaint actually about the product/topic "${searchTerm}"? (yes/no)
2. If yes, extract or summarize the pain point in 1-2 sentences.
3. If no, return "irrelevant".

Return a JSON array of objects like:
[{ "relevant": true/false, "pain_point": "..." }]

Posts:
${batch.map((p, idx) => `[${idx+1}] ${p.content}`).join('\n')}
`;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        // Remove code block if present
        if (text.startsWith('```json')) {
          text = text.replace(/```json|```/g, '').trim();
        } else if (text.startsWith('```')) {
          text = text.replace(/```/g, '').trim();
        }
        const aiResults = JSON.parse(text);
        for (let i = 0; i < aiResults.length; i++) {
          if (aiResults[i].relevant === true) {
            relevantPainPoints.push({
              ...batch[i],
              content: aiResults[i].pain_point || batch[i].content
            });
          }
        }
      } catch (error) {
        console.error('AI relevance filter failed, falling back to keyword filter for this batch:', error);
        // Fallback: keep all batch pain points
        relevantPainPoints.push(...batch);
      }
    }
    return relevantPainPoints;
  }
}