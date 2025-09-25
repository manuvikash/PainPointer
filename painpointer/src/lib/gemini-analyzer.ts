import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config';
import { PainPoint } from './pain-point-extractor';

export interface PainPointCategory {
  id: string;
  name: string;
  description: string;
  painPoints: PainPoint[];
  count: number;
  averageEngagement: number;
  summary: string;
}

export interface AnalysisResult {
  categories: PainPointCategory[];
  totalPainPoints: number;
  searchTerm: string;
  analyzedAt: Date;
  topCategories: PainPointCategory[]; // Top 10 by count
  message?: string; // Optional message for empty results
}

export class GeminiAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Categorize pain points using Gemini AI
   */
  async categorizePainPoints(painPoints: PainPoint[], searchTerm: string): Promise<AnalysisResult> {
    if (painPoints.length === 0) {
      return {
        categories: [],
        totalPainPoints: 0,
        searchTerm,
        analyzedAt: new Date(),
        topCategories: [],
      };
    }

    // Group pain points into batches for analysis
    const categories = await this.performCategorization(painPoints, searchTerm);
    
    // Generate summaries for each category
    const categoriesWithSummaries = await this.generateCategorySummaries(categories);
    
    // Sort categories by count and get top 10
    const topCategories = categoriesWithSummaries
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      categories: categoriesWithSummaries,
      totalPainPoints: painPoints.length,
      searchTerm,
      analyzedAt: new Date(),
      topCategories,
    };
  }

  /**
   * Perform AI-powered categorization
   */
  private async performCategorization(painPoints: PainPoint[], searchTerm: string): Promise<PainPointCategory[]> {
    // Create a comprehensive list of pain point texts
    const painPointTexts = painPoints.map((point, index) => ({
      index,
      text: point.content,
      engagement: point.engagementScore,
    }));

    const prompt = this.buildCategorizationPrompt(painPointTexts, searchTerm);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the AI response to extract categories
      const categories = this.parseCategorizationResponse(text, painPoints);
      return categories;
    } catch (error) {
      console.error('Error in AI categorization:', error);
      // Fallback to rule-based categorization
      return this.fallbackCategorization(painPoints);
    }
  }

  /**
   * Build the categorization prompt for Gemini
   */
  private buildCategorizationPrompt(painPointTexts: Array<{index: number, text: string, engagement: number}>, searchTerm: string): string {
    const painPointList = painPointTexts
      .slice(0, 50) // Limit to avoid token limits
      .map(point => `${point.index}: "${point.text}" (engagement: ${point.engagement})`)
      .join('\n');

    return `
You are an expert at analyzing customer complaints and pain points. I need you to categorize the following complaints about "${searchTerm}" into meaningful categories.

PAIN POINTS TO CATEGORIZE:
${painPointList}

INSTRUCTIONS:
1. Create 5-10 distinct categories that best group these pain points
2. Each category should have a clear, descriptive name (2-4 words)
3. Provide a brief description of what each category represents
4. Assign each pain point to exactly one category by its index number
5. Focus on the core issue or theme, not just keywords

RESPONSE FORMAT (return as JSON):
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description of this category",
      "painPointIndexes": [1, 5, 12, 23]
    }
  ]
}

Return only the JSON response, no additional text.
`;
  }

  /**
   * Parse AI response and create categories
   */
  private parseCategorizationResponse(response: string, painPoints: PainPoint[]): PainPointCategory[] {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const categories: PainPointCategory[] = [];

      for (const category of parsed.categories) {
        const categoryPainPoints = category.painPointIndexes
          .map((index: number) => painPoints[index])
          .filter(Boolean);

        if (categoryPainPoints.length > 0) {
          categories.push({
            id: this.generateCategoryId(category.name),
            name: category.name,
            description: category.description,
            painPoints: categoryPainPoints,
            count: categoryPainPoints.length,
            averageEngagement: this.calculateAverageEngagement(categoryPainPoints),
            summary: '', // Will be filled later
          });
        }
      }

      return categories;
    } catch (error) {
      console.error('Error parsing categorization response:', error);
      return this.fallbackCategorization(painPoints);
    }
  }

  /**
   * Generate summaries for each category
   */
  private async generateCategorySummaries(categories: PainPointCategory[]): Promise<PainPointCategory[]> {
    const summaryPromises = categories.map(async (category) => {
      try {
        const summary = await this.generateCategorySummary(category);
        return { ...category, summary };
      } catch (error) {
        console.error(`Error generating summary for ${category.name}:`, error);
        return { ...category, summary: `Common issues related to ${category.name.toLowerCase()}` };
      }
    });

    return Promise.all(summaryPromises);
  }

  /**
   * Generate AI summary for a single category
   */
  private async generateCategorySummary(category: PainPointCategory): Promise<string> {
    const painPointTexts = category.painPoints
      .slice(0, 10) // Limit for token constraints
      .map(point => `"${point.content}"`)
      .join('\n');

    const prompt = `
Analyze these customer complaints in the "${category.name}" category and create a concise summary:

COMPLAINTS:
${painPointTexts}

Create a 2-3 sentence summary that:
1. Identifies the main issues customers face
2. Mentions the most common specific problems
3. Uses clear, professional language

Summary:`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  /**
   * Fallback categorization when AI fails
   */
  private fallbackCategorization(painPoints: PainPoint[]): PainPointCategory[] {
    const categories = new Map<string, PainPoint[]>();

    // Simple keyword-based categorization
    const categoryKeywords = {
      'Performance Issues': ['slow', 'lag', 'freeze', 'crash', 'performance', 'speed'],
      'User Interface': ['ui', 'interface', 'design', 'layout', 'confusing', 'hard to use'],
      'Bugs & Errors': ['bug', 'error', 'broken', 'not working', 'glitch', 'fail'],
      'Pricing & Value': ['expensive', 'price', 'cost', 'money', 'overpriced', 'cheap'],
      'Customer Service': ['support', 'service', 'help', 'response', 'staff', 'rude'],
      'Feature Requests': ['wish', 'should', 'need', 'want', 'missing', 'add'],
      'Quality Issues': ['quality', 'poor', 'bad', 'terrible', 'awful', 'horrible'],
    };

    for (const painPoint of painPoints) {
      let assigned = false;
      const text = painPoint.content.toLowerCase();

      for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          if (!categories.has(categoryName)) {
            categories.set(categoryName, []);
          }
          categories.get(categoryName)!.push(painPoint);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        if (!categories.has('Other Issues')) {
          categories.set('Other Issues', []);
        }
        categories.get('Other Issues')!.push(painPoint);
      }
    }

    return Array.from(categories.entries()).map(([name, points]) => ({
      id: this.generateCategoryId(name),
      name,
      description: `Issues related to ${name.toLowerCase()}`,
      painPoints: points,
      count: points.length,
      averageEngagement: this.calculateAverageEngagement(points),
      summary: `Common ${name.toLowerCase()} reported by users`,
    }));
  }

  /**
   * Generate a unique category ID
   */
  private generateCategoryId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Calculate average engagement score for a category
   */
  private calculateAverageEngagement(painPoints: PainPoint[]): number {
    if (painPoints.length === 0) return 0;
    const total = painPoints.reduce((sum, point) => sum + point.engagementScore, 0);
    return Math.round(total / painPoints.length);
  }
}