'use client';

import { useEffect, useState } from 'react';
import { Loader2, Brain, Search, BarChart3, Filter, CheckCircle, Sparkles } from 'lucide-react';

interface ProgressState {
  stage: string;
  message: string;
  progress: number;
  details?: string;
}

interface LoadingSpinnerProps {
  analysisId?: string;
}

export function LoadingSpinner({ analysisId }: LoadingSpinnerProps) {
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'setup',
    message: 'Starting analysis...',
    progress: 0
  });

  useEffect(() => {
    if (!analysisId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/progress?id=${analysisId}`);
        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData);
          
          // Stop polling if complete
          if (progressData.progress >= 100) {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    };

    // Start polling immediately
    pollProgress();
    const interval = setInterval(pollProgress, 3000);

    return () => clearInterval(interval);
  }, [analysisId]);

  const getStageIcon = (stage: string, isActive: boolean, isComplete: boolean) => {
    if (isComplete) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isActive) return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    
    switch (stage) {
      case 'searching': return <Search className="w-5 h-5 text-gray-400" />;
      case 'extracting': return <Filter className="w-5 h-5 text-gray-400" />;
      case 'filtering': return <BarChart3 className="w-5 h-5 text-gray-400" />;
      case 'categorizing': return <Brain className="w-5 h-5 text-gray-400" />;
      case 'summarizing': return <Sparkles className="w-5 h-5 text-gray-400" />;
      default: return <Loader2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStageColor = (stage: string, isActive: boolean, isComplete: boolean) => {
    if (isComplete) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (isActive) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
  };

  const stages = [
    { key: 'setup', name: 'Setup', description: 'Initializing services' },
    { key: 'searching', name: 'Reddit Search', description: 'Comprehensive parallel search' },
    { key: 'extracting', name: 'Pain Point Extraction', description: 'Finding complaints' },
    { key: 'filtering', name: 'Quality Filtering', description: 'Selecting best data' },
    { key: 'categorizing', name: 'AI Categorization', description: 'Grouping complaints' },
    { key: 'summarizing', name: 'Summary Generation', description: 'Creating insights' }
  ];

  return (
    <div className="max-w-3xl mx-auto text-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
        {/* Header with Progress Bar */}
        <div className="mb-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Analyzing Pain Points
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {progress.message}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {progress.progress}% Complete
          </div>
          
          {progress.details && (
            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
              {progress.details}
            </div>
          )}
        </div>

        {/* Detailed Progress Steps */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const isComplete = progress.progress >= ((index + 1) * 100) / stages.length;
            const isActive = progress.stage === stage.key;
            
            return (
              <div 
                key={stage.key}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${getStageColor(stage.key, isActive, isComplete)}`}
              >
                <div className="flex items-center">
                  {getStageIcon(stage.key, isActive, isComplete)}
                  <div className="ml-3 text-left">
                    <div className={`text-sm font-medium ${isComplete ? 'text-green-700 dark:text-green-300' : isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {stage.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isActive ? progress.message : stage.description}
                    </div>
                  </div>
                </div>
                
                {isActive && !isComplete && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
                
                {isComplete && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Message */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          {progress.stage === 'searching' && 'Running 4 parallel search strategies across Reddit...'}
          {progress.stage === 'extracting' && 'Using advanced pattern matching to identify complaints...'}
          {progress.stage === 'categorizing' && 'AI is analyzing and grouping pain points...'}
          {progress.stage === 'complete' && 'Analysis complete! Preparing results...'}
        </div>
      </div>
    </div>
  );
}