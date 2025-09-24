# PainPointer - Reddit Pain Point Analyzer

An AI-powered Next.js application that analyzes Reddit discussions to identify customer pain points and complaints about any product or topic.

## Features

- 🔍 **Smart Reddit Scraping**: Automatically finds relevant subreddits and scrapes posts with complaints
- 🤖 **AI Pain Point Detection**: Uses Google Gemini AI to identify and categorize customer complaints
- 📊 **Visual Analytics**: Interactive pie charts and categorized results with AI-generated summaries
- ⚡ **Real-time Analysis**: On-demand processing without data persistence
- 🎯 **Top 10 Categories**: Automatically categorizes pain points into the most relevant categories
- 📈 **Engagement Rankings**: Ranks pain points by upvotes and comment count

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI Components**: Lucide React icons, Recharts for visualizations
- **Reddit API**: Snoowrap wrapper for Reddit API integration
- **AI/LLM**: Google Gemini API for categorization and summarization
- **Deployment**: Vercel-ready

## Prerequisites

Before running this application, you need to obtain API keys:

### 1. Reddit API Setup
1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Choose "script" as the app type
4. Note down your `client_id` and `client_secret`

### 2. Google Gemini API Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Note down your API key

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   # Reddit API Configuration
   REDDIT_CLIENT_ID=your_reddit_client_id_here
   REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
   REDDIT_USER_AGENT=PainPointer:v1.0.0 (by /u/yourusername)

   # Google Gemini API Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # Next.js Configuration
   NEXTAUTH_SECRET=your_random_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Enter a search term**: Type in any product or topic you want to analyze (e.g., "iPhone 15", "Tesla Model 3", "Netflix")

2. **Wait for analysis**: The app will:
   - Find relevant subreddits
   - Scrape recent posts and comments
   - Extract pain points using keyword analysis
   - Categorize complaints using AI
   - Generate summaries for each category

3. **View results**: Get insights through:
   - Interactive pie chart showing pain point distribution
   - Top 10 categories with AI-generated summaries
   - Sample complaints with engagement metrics
   - Links to original Reddit posts

## Configuration

### App Limits (configurable in `src/lib/config.ts`)
- `maxPosts`: 50 (Maximum posts to analyze per subreddit)
- `maxSubreddits`: 5 (Maximum subreddits to search)
- `maxComments`: 20 (Maximum comments per post to analyze)

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
Make sure to set all required environment variables in your deployment platform.

## License

MIT License
