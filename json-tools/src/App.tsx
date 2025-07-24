import React, { useState, useCallback } from 'react';
import { JSONProcessor } from './utils/jsonProcessor';
import { AIService } from './services/aiService';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Copy, 
  Sparkles,
  Settings,
  Minimize2
} from 'lucide-react';

interface ProcessingOptions {
  indent: number;
  sortKeys: boolean;
  removeWhitespace: boolean;
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [options, setOptions] = useState<ProcessingOptions>({
    indent: 2,
    sortKeys: false,
    removeWhitespace: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);

  const processJSON = useCallback(() => {
    if (!input.trim()) return;

    setIsProcessing(true);
    setError('');

    try {
      const result = JSONProcessor.process(input, options);
      setOutput(result.formatted);
      setStats(result.stats);
      
      if (!result.validation.valid) {
        setError(result.validation.error || 'Invalid JSON');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing error');
    } finally {
      setIsProcessing(false);
    }
  }, [input, options]);

  const handleFormat = () => {
    processJSON();
  };

  const handleMinify = () => {
    try {
      const minified = JSONProcessor.minify(input);
      setOutput(minified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minification error');
    }
  };

  const handleAiFix = async () => {
    if (!error) return;

    setIsAiFixing(true);
    try {
      const suggestion = await AIService.fixJSONSyntax(input, error);
      setInput(suggestion.fixed);
      setAiSuggestion(suggestion.explanation);
      processJSON();
    } catch (err) {
      setError('AI fix failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsAiFixing(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!stats) return;

    try {
      const suggestion = await AIService.suggestStructure(input);
      setAiSuggestion(suggestion.explanation);
    } catch (err) {
      setAiSuggestion('AI suggestions unavailable');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
  };

  const downloadJSON = () => {
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Tools</h1>
          <p className="text-gray-600">AI-Powered JSON Formatter, Validator & Optimizer</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Input JSON</span>
              </div>
              <div className="flex items-center gap-2">
                {JSONProcessor.validate(input).valid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : input && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JSON here..."
              className="w-full h-96 p-4 font-mono text-sm border-0 resize-none focus:outline-none"
            />
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Formatted JSON</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={downloadJSON}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Download JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              className="w-full h-96 p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-50"
              placeholder="Formatted JSON will appear here..."
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Format Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium">Indent:</span>
                <select
                  value={options.indent}
                  onChange={(e) => setOptions({ ...options, indent: parseInt(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>Tab</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.sortKeys}
                  onChange={(e) => setOptions({ ...options, sortKeys: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Sort keys</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleFormat}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Format
              </button>

              <button
                onClick={handleMinify}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                <Minimize2 className="w-4 h-4 inline mr-1" />
                Minify
              </button>

              {error && (
                <button
                  onClick={handleAiFix}
                  disabled={isAiFixing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  {isAiFixing ? 'Fixing...' : 'AI Fix'}
                </button>
              )}

              <button
                onClick={handleAiSuggest}
                disabled={!stats}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                AI Suggest
              </button>
            </div>
          </div>
        </div>

        {/* Stats and AI Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">          {/* Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Original size:</span>
                  <span className="ml-2 font-mono">{stats.size} bytes</span>
                </div>
                <div>
                  <span className="text-gray-600">Formatted size:</span>
                  <span className="ml-2 font-mono">{stats.formattedSize} bytes</span>
                </div>
                <div>
                  <span className="text-gray-600">Objects:</span>
                  <span className="ml-2 font-mono">{stats.objects}</span>
                </div>
                <div>
                  <span className="text-gray-600">Arrays:</span>
                  <span className="ml-2 font-mono">{stats.arrays}</span>
                </div>
                <div>
                  <span className="text-gray-600">Primitives:</span>
                  <span className="ml-2 font-mono">{stats.primitives}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {aiSuggestion && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Suggestions
              </h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap"
              >
                {aiSuggestion}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">JSON Error</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;