import { useState, useCallback } from 'react';
import { JSONProcessor } from './utils/jsonProcessor';
import { AIService } from './services/aiService';
import {
  FileText,
  Download,
  Copy,
  Sparkles,
  Minimize2,
  Database,
  Trash2,
  Settings,
  AlertCircle,
  Wand2,
  CheckCircle2,
  Search,
  FileJson,
  Code2,
  ArrowLeftRight,
  Zap
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
    navigator.clipboard.writeText(output).then(() => {
      // Could add toast notification here
    });
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

  const clearInput = () => {
    setInput('');
    setOutput('');
    setError('');
    setStats(null);
    setAiSuggestion('');
  };

  const getStatusIndicator = () => {
    if (!input.trim()) return 'status-empty';
    try {
      JSON.parse(input);
      return 'status-valid';
    } catch {
      return 'status-invalid';
    }
  };

  const formatJSONWithHighlight = (json: string) => {
    if (!json.trim()) return '';

    try {
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, 2);

      return formatted
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, (match) => {
          let cls = '';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          } else if (!isNaN(parseFloat(match))) {
            cls = 'json-number';
          }
          return `<span class="${cls}">${match}</span>`;
        })
        .replace(/({|}|[|])/g, '<span class="json-brace">$1</span>')
        .replace(/\n/g, '<br>')
        .replace(/  /g, '&nbsp;&nbsp;');
    } catch {
      return json;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <header className="header-glow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 floating">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">JSONMagic</h1>
              <p className="text-gray-400 mt-1 text-base">强大的在线JSON处理工具，提供格式化、验证、转换等多种功能</p>
            </div>
          </div>
        </header>

        {/* Main Editor - Exactly like example */}
        <div className="editor-container">
          <div className="panel-group">
            {/* Input Panel */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <FileJson className="w-5 h-5 text-purple-400" />
                  <span>原始JSON</span>
                  <span className={`status-indicator ${getStatusIndicator()}`} />
                </div>
                <div className="panel-actions">
                  <button
                    onClick={handleFormat}
                    disabled={isProcessing}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>格式化</span>
                  </button>
                  <button
                    onClick={error ? handleAiFix : handleAiSuggest}
                    disabled={isAiFixing || (!error && !stats)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {isAiFixing ? (
                      <>
                        <div className="spinner" />
                        <span>AI处理中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI助手</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearInput}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>清空</span>
                  </button>
                </div>
              </div>
              <div className="editor-area">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="在此粘贴或输入JSON数据..."
                  className="json-editor"
                />
              </div>
            </div>

            {/* Output Panel */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>格式化输出</span>
                </div>
                <div className="panel-actions">
                  <button
                    onClick={handleMinify}
                    disabled={isProcessing}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>压缩</span>
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>下载</span>
                  </button>
                </div>
              </div>
              <div className="editor-area">
                {output ? (
                  <pre
                    className="json-display"
                    dangerouslySetInnerHTML={{ __html: formatJSONWithHighlight(output) }}
                  />
                ) : (
                  <div className="json-editor json-display text-gray-500"
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}
                  >
                    格式化后的JSON将显示在这里...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tools Panel - Exactly like the example */}
        <div className="toolbar">
          <div className="tool-card active">
            <Zap className="tool-icon" />
            <h3>JSON格式化</h3>
            <p>美化JSON数据，添加缩进和空格以增强可读性</p>
          </div>

          <div className="tool-card">
            <Minimize2 className="tool-icon" />
            <h3>JSON压缩</h3>
            <p>删除JSON中所有不必要的空格和换行符</p>
          </div>

          <div className="tool-card">
            <CheckCircle2 className="tool-icon" />
            <h3>JSON验证</h3>
            <p>检查JSON语法和数据结构是否正确</p>
          </div>

          <div className="tool-card">
            <ArrowLeftRight className="tool-icon" />
            <h3>JSON转XML</h3>
            <p>将JSON数据转换为XML格式</p>
          </div>

          <div className="tool-card">
            <Code2 className="tool-icon" />
            <h3>JSON对比</h3>
            <p>比较两个JSON数据并高亮显示差异</p>
          </div>

          <div className="tool-card">
            <Search className="tool-icon" />
            <h3>JSON路径查询</h3>
            <p>使用JSONPath查询特定的JSON数据</p>
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-12">
          {/* Stats */}
          {stats && (
            <div className="glass-panel p-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                统计信息
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">原始大小:</span>
                  <span className="font-mono text-purple-400">{stats.size} B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">格式化后:</span>
                  <span className="font-mono text-green-400">{stats.formattedSize} B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">对象数:</span>
                  <span className="font-mono text-blue-400">{stats.objects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">数组数:</span>
                  <span className="font-mono text-orange-400">{stats.arrays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">基本类型:</span>
                  <span className="font-mono text-pink-400">{stats.primitives}</span>
                </div>
              </div>
            </div>
          )}

          {/* Format Options */}
          <div className="glass-panel p-8 mt-8 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              格式化选项
            </h3>
            <div style={{marginTop: '2rem'}} className="flex gap-6">
              <div className="flex-1">
                <label className="flex items-center justify-start">
                  <span className="text-sm" style={{marginRight: '2rem'}}>缩进空格数</span>
                  <select
                    value={options.indent}
                    onChange={(e) => setOptions({ ...options, indent: parseInt(e.target.value) })}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    <option value={2}>2 空格</option>
                    <option value={4}>4 空格</option>
                    <option value={8}>8 空格</option>
                  </select>
                </label>
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-start">
                  <span className="text-sm" style={{marginRight: '2rem'}}>排序键名</span>
                  <input
                    type="checkbox"
                    checked={options.sortKeys}
                    onChange={(e) => setOptions({ ...options, sortKeys: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        {aiSuggestion && (
          <div className="glass-panel p-8 mt-8 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI 建议
            </h3>
            <div className="text-sm text-gray-300 leading-relaxed bg-gray-800/50 p-4 rounded-lg"
              style={{ borderLeft: '3px solid var(--accent-primary)' }}
            >
              {aiSuggestion}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-16 mb-16 glass-panel p-6"
            style={{
              borderLeft: '4px solid var(--error)',
              background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1), rgba(239, 68, 68, 0.05))'
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--error)' }} />
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2" style={{ color: 'var(--error)' }}>
                  JSON 错误
                </h4>
                <div className="text-gray-300 text-sm leading-relaxed"
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(248, 113, 113, 0.2)'
                  }}
                >
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;