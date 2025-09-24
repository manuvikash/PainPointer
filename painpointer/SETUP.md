# PainPointer Setup Guide

## 🚀 Quick Start

### 1. Get API Keys

**Reddit API:**
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" → Choose "script"
3. Copy your `client_id` and `client_secret`

**Google Gemini API:**
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy your API key

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=PainPointer:v1.0.0 (by /u/yourusername)
GEMINI_API_KEY=your_gemini_api_key_here
NEXTAUTH_SECRET=any_random_string_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 🎯 How to Use

1. **Enter a search term** (e.g., "iPhone 15", "Tesla", "Netflix")
2. **Wait for analysis** (~30-60 seconds)
3. **View results:**
   - Interactive pie chart
   - Top 10 pain point categories
   - AI-generated summaries
   - Sample complaints with Reddit links

## 📊 What You Get

- **Smart Analysis**: AI identifies real customer complaints
- **Visual Insights**: Pie chart showing pain point distribution  
- **Categorization**: Top 10 most common complaint categories
- **Engagement Metrics**: Ranked by upvotes + comments
- **AI Summaries**: Concise summaries for each category
- **Source Links**: Direct links to original Reddit discussions

## 🔧 Technical Details

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Reddit**: Snoowrap API wrapper
- **AI**: Google Gemini for categorization & summarization
- **Charts**: Recharts for visualizations

## 🚨 Common Issues

**No Results Found:**
- Try different search terms
- Check if topic has recent Reddit discussions
- Verify API keys are correct

**Rate Limits:**
- Reddit/Gemini APIs have rate limits
- Wait a few minutes between requests

**Build Errors:**
- Run `npm run build` to check for issues
- Ensure all environment variables are set

## 🎉 Ready to Use!

Your PainPointer app is now ready to analyze customer pain points from Reddit discussions!