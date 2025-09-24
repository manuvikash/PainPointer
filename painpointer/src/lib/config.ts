export const config = {
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    userAgent: process.env.REDDIT_USER_AGENT!,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
  },
  app: {
    maxPosts: 50, // Maximum posts to analyze per subreddit
    maxSubreddits: 5, // Maximum subreddits to search
    maxComments: 20, // Maximum comments per post to analyze
  },
};

export const validateConfig = () => {
  const missing = [];
  
  if (!config.reddit.clientId) missing.push('REDDIT_CLIENT_ID');
  if (!config.reddit.clientSecret) missing.push('REDDIT_CLIENT_SECRET');
  if (!config.reddit.userAgent) missing.push('REDDIT_USER_AGENT');
  if (!config.gemini.apiKey) missing.push('GEMINI_API_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};