import Snoowrap from 'snoowrap';
import { config } from './config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI;
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Initialize Reddit client
    try {
      this.reddit = new Snoowrap({
        userAgent: config.reddit.userAgent,
        clientId: config.reddit.clientId,
        clientSecret: config.reddit.clientSecret,
        username: config.reddit.username,
        password: config.reddit.password,
      });
    } catch (error) {
      console.warn('Username/password auth failed, this might be due to app type. Error:', error);
      throw new Error(
        'Reddit authentication failed. Please ensure your Reddit app is configured as a "script" app type. ' +
        'Go to https://www.reddit.com/prefs/apps and change your app type to "script", or create a new script app.'
      );
    }

    // Initialize Gemini AI for subreddit suggestions
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Use AI to suggest relevant subreddits for a search term
   */
  private async getAISuggestedSubreddits(searchTerm: string): Promise<string[]> {
    try {
      console.log(`🤖 Using AI to suggest subreddits for: "${searchTerm}"`);
      
      const prompt = `
You are an expert Reddit user who knows all the major subreddits. I need to find the best subreddits to search for discussions about "${searchTerm}" where people might be complaining or discussing problems.

Please suggest 8-10 relevant subreddits where people would discuss this topic. Consider:
1. Official/brand-specific subreddits 
2. Product category subreddits
3. General complaint/problem subreddits
4. Tech/review subreddits
5. Community subreddits where this topic would be discussed

For "${searchTerm}", suggest subreddits that are:
- Active and popular
- Likely to have complaints or discussions about this topic
- Real subreddit names (without r/ prefix)

CRITICAL: Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanations. Just the raw JSON array.

Example format:
["apple", "iphone", "mobilephones", "technology", "complaints"]

JSON array:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      console.log(`🤖 AI response:`, text);
      
      // Parse the AI response - handle markdown code blocks
      let jsonText = text;
      
      // Remove markdown code block markers if present
      if (text.includes('```json')) {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
      } else if (text.includes('```')) {
        // Handle generic code blocks
        const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonText = codeMatch[1].trim();
        }
      }
      
      // Parse the cleaned JSON
      const suggestions = JSON.parse(jsonText);
      
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        console.log(`✅ AI suggested subreddits:`, suggestions);
        return suggestions.slice(0, 8); // Limit to 8 subreddits
      }
      
      throw new Error('Invalid AI response format');
      
    } catch (error) {
      console.error('❌ AI subreddit suggestion failed:', error);
      return this.getFallbackSubreddits(searchTerm);
    }
  }

  /**
   * Fallback subreddits when AI fails
   */
  private getFallbackSubreddits(searchTerm: string): string[] {
    const term = searchTerm.toLowerCase();
    console.log(`🔄 Using fallback subreddit logic for: "${searchTerm}"`);
    
    // Smart category-based fallbacks
    if (term.includes('iphone') || term.includes('apple') || term.includes('ios')) {
      return ['apple', 'iphone', 'ios', 'mobilephones', 'smartphones', 'technology'];
    }
    if (term.includes('tesla') || term.includes('model') && (term.includes('3') || term.includes('y') || term.includes('s'))) {
      return ['tesla', 'teslamotors', 'electricvehicles', 'cars', 'automotive'];
    }
    if (term.includes('netflix') || term.includes('streaming')) {
      return ['netflix', 'streaming', 'cordcutters', 'television', 'movies'];
    }
    if (term.includes('windows') || term.includes('microsoft')) {
      return ['windows', 'microsoft', 'windows10', 'windows11', 'techsupport'];
    }
    if (term.includes('playstation') || term.includes('ps5') || term.includes('ps4')) {
      return ['playstation', 'ps5', 'ps4', 'gaming', 'console'];
    }
    if (term.includes('xbox')) {
      return ['xbox', 'xboxone', 'gaming', 'console'];
    }
    
    // Generic tech/product fallbacks
    return ['technology', 'gadgets', 'reviews', 'complaints', 'mildlyinfuriating', 'assholedesign'];
  }
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
   * Get posts with their comments using comprehensive parallel search
   */
  async getPostsWithComments(searchTerm: string): Promise<RedditPost[]> {
    console.log(`🔍 Starting comprehensive parallel search for: "${searchTerm}"`);
    
    const allPosts: RedditPost[] = [];
    const maxPosts = config.app.maxPosts || 500;

    // Prepare all search strategies to run in parallel
    const searchPromises: Promise<RedditPost[]>[] = [];

    // 1. Direct Reddit-wide search
    console.log(`📱 Preparing direct Reddit search`);
    searchPromises.push(this.performDirectSearch(searchTerm, 100));

    // 2. AI-suggested subreddits search
    console.log(`📱 Preparing AI-suggested subreddit searches`);
    searchPromises.push(this.performAISubredditSearch(searchTerm, 100));

    // 3. Search variations
    console.log(`📱 Preparing search variation queries`);
    searchPromises.push(this.performVariationSearch(searchTerm, 80));

    // 4. Time-based searches (recent vs historical)
    console.log(`📱 Preparing time-based searches`);
    searchPromises.push(this.performTimeBasedSearch(searchTerm, 70));

    // Execute all searches in parallel
    console.log(`🚀 Executing ${searchPromises.length} search strategies in parallel...`);
    const searchResults = await Promise.allSettled(searchPromises);

    // Aggregate all results
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value) {
        for (const post of result.value) {
          // Avoid duplicates by checking post ID
          const exists = allPosts.some(p => p.id === post.id);
          if (!exists) {
            allPosts.push(post);
          }
        }
      } else if (result.status === 'rejected') {
        console.warn(`⚠️ One search strategy failed:`, result.reason);
      }
    }

    console.log(`✅ Comprehensive search completed. Found ${allPosts.length} unique posts total`);
    
    if (allPosts.length === 0) {
      console.log(`ℹ️ No results found for "${searchTerm}". This might be:
        - A new/unreleased product
        - A very specific or niche term  
        - A misspelled product name
        - Something with limited Reddit discussion`);
    }

    // Sort by engagement (score + comments) for relevance
    const sortedPosts = allPosts.sort((a, b) => 
      (b.score + b.num_comments) - (a.score + a.num_comments)
    );

    // Return all posts up to limit
    return sortedPosts.slice(0, Math.min(maxPosts, allPosts.length));
  }

  /**
   * Direct Reddit-wide search
   */
  private async performDirectSearch(searchTerm: string, limit: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      console.log(`🔍 Direct search: "${searchTerm}"`);
      
      const searchResults = await this.reddit.search({
        query: searchTerm,
        sort: 'relevance',
        time: 'all'
      });

      const limitedResults = Array.from(searchResults).slice(0, limit);
      for (const post of limitedResults) {
        if (post.title && (post.selftext || post.title.length > 15)) {
          posts.push({
            id: post.id,
            title: post.title,
            selftext: post.selftext || '',
            score: post.score,
            num_comments: post.num_comments,
            url: post.url,
            subreddit: post.subreddit.display_name,
            created_utc: post.created_utc,
            author: post.author?.name || '[deleted]',
            comments: []
          });
        }
      }
      
      console.log(`✅ Direct search found ${posts.length} posts`);
    } catch (error) {
      console.warn(`⚠️ Direct search failed:`, error);
    }

    return posts;
  }

  /**
   * AI-suggested subreddit searches
   */
  private async performAISubredditSearch(searchTerm: string, limit: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      console.log(`🤖 AI subreddit search for: "${searchTerm}"`);
      
      const suggestedSubreddits = await this.getAISuggestedSubreddits(searchTerm);
      const postsPerSubreddit = Math.floor(limit / suggestedSubreddits.length);
      
      // Search all suggested subreddits in parallel
      const subredditPromises = suggestedSubreddits.map(async (subredditName) => {
        try {
          const subredditPosts = await this.reddit.getSubreddit(subredditName).search({
            query: searchTerm,
            sort: 'relevance',
            time: 'all'
          });

          const limitedPosts = Array.from(subredditPosts).slice(0, postsPerSubreddit);
          return limitedPosts
            .filter(post => post.title && (post.selftext || post.title.length > 15))
            .map(post => ({
              id: post.id,
              title: post.title,
              selftext: post.selftext || '',
              score: post.score,
              num_comments: post.num_comments,
              url: post.url,
              subreddit: post.subreddit.display_name,
              created_utc: post.created_utc,
              author: post.author?.name || '[deleted]',
              comments: []
            }));
        } catch (error) {
          console.warn(`⚠️ Failed to search r/${subredditName}:`, error);
          return [];
        }
      });

      const subredditResults = await Promise.allSettled(subredditPromises);
      
      for (const result of subredditResults) {
        if (result.status === 'fulfilled') {
          posts.push(...result.value);
        }
      }
      
      console.log(`✅ AI subreddit search found ${posts.length} posts from ${suggestedSubreddits.length} subreddits`);
    } catch (error) {
      console.warn(`⚠️ AI subreddit search failed:`, error);
    }

    return posts;
  }

  /**
   * Search with complaint-focused variations
   */
  private async performVariationSearch(searchTerm: string, limit: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      console.log(`� Variation search for: "${searchTerm}"`);
      
      const searchVariations = [
        `${searchTerm} problems`,
        `${searchTerm} issues`,
        `${searchTerm} complaints`,
        `${searchTerm} broken`,
        `${searchTerm} disappointed`,
        `${searchTerm} hate`,
        `${searchTerm} sucks`,
        `${searchTerm} terrible`,
        `${searchTerm} awful`,
        `${searchTerm} worst`
      ];

      const postsPerVariation = Math.floor(limit / searchVariations.length);
      
      // Search all variations in parallel
      const variationPromises = searchVariations.map(async (variation) => {
        try {
          const searchResults = await this.reddit.search({
            query: variation,
            sort: 'relevance',
            time: 'year' // Broader time range for variations
          });

          const limitedResults = Array.from(searchResults).slice(0, postsPerVariation);
          return limitedResults
            .filter(post => post.title && (post.selftext || post.title.length > 15))
            .map(post => ({
              id: post.id,
              title: post.title,
              selftext: post.selftext || '',
              score: post.score,
              num_comments: post.num_comments,
              url: post.url,
              subreddit: post.subreddit.display_name,
              created_utc: post.created_utc,
              author: post.author?.name || '[deleted]',
              comments: []
            }));
        } catch (error) {
          console.warn(`⚠️ Variation search failed for "${variation}":`, error);
          return [];
        }
      });

      const variationResults = await Promise.allSettled(variationPromises);
      
      for (const result of variationResults) {
        if (result.status === 'fulfilled') {
          posts.push(...result.value);
        }
      }
      
      console.log(`✅ Variation search found ${posts.length} posts from ${searchVariations.length} variations`);
    } catch (error) {
      console.warn(`⚠️ Variation search failed:`, error);
    }

    return posts;
  }

  /**
   * Time-based search (recent vs historical data)
   */
  private async performTimeBasedSearch(searchTerm: string, limit: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      console.log(`⏰ Time-based search for: "${searchTerm}"`);
      
      const timeRanges = ['week', 'month', 'year', 'all'];
      const postsPerTimeRange = Math.floor(limit / timeRanges.length);
      
      // Search across different time ranges in parallel
      const timePromises = timeRanges.map(async (timeRange) => {
        try {
          const searchResults = await this.reddit.search({
            query: searchTerm,
            sort: 'top', // Top posts in each time range
            time: timeRange as any
          });

          const limitedResults = Array.from(searchResults).slice(0, postsPerTimeRange);
          return limitedResults
            .filter(post => post.title && (post.selftext || post.title.length > 15))
            .map(post => ({
              id: post.id,
              title: post.title,
              selftext: post.selftext || '',
              score: post.score,
              num_comments: post.num_comments,
              url: post.url,
              subreddit: post.subreddit.display_name,
              created_utc: post.created_utc,
              author: post.author?.name || '[deleted]',
              comments: []
            }));
        } catch (error) {
          console.warn(`⚠️ Time-based search failed for "${timeRange}":`, error);
          return [];
        }
      });

      const timeResults = await Promise.allSettled(timePromises);
      
      for (const result of timeResults) {
        if (result.status === 'fulfilled') {
          posts.push(...result.value);
        }
      }
      
      console.log(`✅ Time-based search found ${posts.length} posts across ${timeRanges.length} time ranges`);
    } catch (error) {
      console.warn(`⚠️ Time-based search failed:`, error);
    }

    return posts;
  }
}