import { Loader2, Brain, Search, BarChart3 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
        <div className="mb-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Analyzing Pain Points
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            This may take a minute as we scrape Reddit and analyze the data...
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center">
              <Search className="w-5 h-5 text-blue-500 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Searching Reddit
              </span>
            </div>
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-50">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-500">
                AI Analysis
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-50">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-500">
                Generating Results
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Analyzing recent posts and comments for pain points...
        </div>
      </div>
    </div>
  );
}