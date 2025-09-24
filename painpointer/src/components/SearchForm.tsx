'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onAnalyze: (searchTerm: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onAnalyze, isLoading }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && !isLoading) {
      onAnalyze(searchTerm.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter a product or topic to analyze (e.g., iPhone 15, Tesla Model 3, Netflix)"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
        />
      </div>
      
      <button
        type="submit"
        disabled={!searchTerm.trim() || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                   text-white font-semibold py-3 px-6 rounded-lg
                   transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Reddit...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Analyze Pain Points
          </>
        )}
      </button>

      {/* Example searches */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['iPhone 15', 'Tesla Model 3', 'Windows 11', 'ChatGPT'].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => !isLoading && setSearchTerm(example)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 
                         text-gray-700 dark:text-gray-300 rounded-full
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}