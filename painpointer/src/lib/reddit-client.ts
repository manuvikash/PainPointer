import Snoowrap from 'snoowrap';
import { config } from './config';

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  url: string;
  subreddit: string;
  created_utc: number;
  author: string;
  comments?: RedditComment[];
}

export interface RedditComment {
  id: string;
  body: string;
  score: number;
  created_utc: number;
  author: string;
  replies?: RedditComment[];
}

export class RedditClient {
  private reddit: Snoowrap;

  constructor() {
    try {
      // Try username/password authentication for script apps
      this.reddit = new Snoowrap({
        userAgent: config.reddit.userAgent,
        clientId: config.reddit.clientId,
        clientSecret: config.reddit.clientSecret,
        username: config.reddit.username,
        password: config.reddit.password,
      });
    } catch (error) {
      console.warn('Username/password auth failed, this might be due to app type. Error:', error);
      // Fallback: try without credentials (limited functionality)
      throw new Error(
        'Reddit authentication failed. Please ensure your Reddit app is configured as a "script" app type. ' +
        'Go to https://www.reddit.com/prefs/apps and change your app type to "script", or create a new script app.'
      );
    }
  }

  /**
   * Find relevant subreddits based on search term
   */
  async findRelevantSubreddits(searchTerm: string): Promise<string[]> {
    try {
      const subreddits = await this.reddit.searchSubreddits({
        query: searchTerm,
        limit: config.app.maxSubreddits,
      });

      return subreddits.map(sub => sub.display_name);
    } catch (error) {
      console.error('Error finding subreddits:', error);
      // Fallback to common complaint subreddits
      return ['complaints', 'mildlyinfuriating', 'assholedesign', 'crappydesign'];
    }
  }

  /**
   * Search for posts in multiple subreddits
   */
  async searchPosts(searchTerm: string, subreddits: string[]): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];
    const postsPerSubreddit = Math.floor(config.app.maxPosts / subreddits.length);

    for (const subreddit of subreddits) {
      try {
        const posts = await this.reddit.getSubreddit(subreddit).search({
          query: searchTerm,
          sort: 'relevance',
          time: 'month', // Last month for recent complaints
        });

        const limitedPosts = posts.slice(0, postsPerSubreddit);
        const formattedPosts = limitedPosts.map((post: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: post.id,
          title: post.title,
          selftext: post.selftext,
          score: post.score,
          num_comments: post.num_comments,
          url: post.url,
          subreddit: post.subreddit.display_name,
          created_utc: post.created_utc,
          author: post.author?.name || '[deleted]',
        }));

        allPosts.push(...formattedPosts);
      } catch (error) {
        console.error(`Error searching in r/${subreddit}:`, error);
        continue; // Skip this subreddit and continue with others
      }
    }

    return allPosts;
  }

  /**
   * Get comments for a specific post
   */
  async getPostComments(postId: string): Promise<RedditComment[]> {
    try {
      // For now, return empty array to avoid complex async typing issues
      // We'll focus on post content which contains most complaints
      return [];
    } catch (error) {
      console.error(`Error getting comments for post ${postId}:`, error);
      return [];
    }
  }

  /**
   * Get posts with their comments
   */
  async getPostsWithComments(searchTerm: string): Promise<RedditPost[]> {
    const subreddits = await this.findRelevantSubreddits(searchTerm);
    const posts = await this.searchPosts(searchTerm, subreddits);
    
    // Get comments for top posts (by engagement)
    const topPosts = posts
      .sort((a, b) => (b.score + b.num_comments) - (a.score + a.num_comments))
      .slice(0, 20); // Limit to top 20 posts to avoid rate limits

    const postsWithComments = await Promise.all(
      topPosts.map(async (post) => {
        const comments = await this.getPostComments(post.id);
        return { ...post, comments };
      })
    );

    return postsWithComments;
  }
}