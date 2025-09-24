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
}