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
  const [compareInput, setCompareInput] = useState('');
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
  const [activeTool, setActiveTool] = useState<'format' | 'xml' | 'compare' | 'query'>('format');
  const [jsonPathQuery, setJsonPathQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);

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

  const handleBeautifyToggle = () => {
    if (options.removeWhitespace) {
      // Change to beautify mode
      setOptions({ ...options, removeWhitespace: false });
    } else {
      // Change to minify mode
      setOptions({ ...options, removeWhitespace: true });
    }
  };

  const clearInput = () => {
    setInput('');
    setCompareInput('');
    setOutput('');
    setError('');
    setStats(null);
    setAiSuggestion('');
    setQueryResults([]);
    setJsonPathQuery('');
  };

  const handleXMLConvert = () => {
    try {
      setIsProcessing(true);
      setError('');
      const xml = JSONProcessor.toXML(input);
      setOutput(xml);
      setActiveTool('xml');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'XML conversion error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompare = () => {
    try {
      setIsProcessing(true);
      setError('');
      const result = JSONProcessor.compareJSON(input, compareInput);
      setOutput(result.diff);
      setActiveTool('compare');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = () => {
    try {
      setIsProcessing(true);
      setError('');
      const results = JSONProcessor.queryJSON(input, jsonPathQuery);
      setQueryResults(results);
      setOutput(JSON.stringify(results, null, 2));
      setActiveTool('query');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInput(e.target?.result as string);
      };
      reader.readAsText(file);
    }
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

        {/* Main Editor */}
        {activeTool === 'format' && (
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
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="btn-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>上传</span>
                    </label>
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
        )}

        {/* XML Conversion View */}
        {activeTool === 'xml' && (
          <div className="editor-container">
            <div className="panel-group">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileJson className="w-5 h-5 text-purple-400" />
                    <span>原始JSON</span>
                  </div>
                  <div className="panel-actions">
                    <button
                      onClick={handleXMLConvert}
                      disabled={isProcessing || !input.trim()}
                      className="btn-primary flex items-center gap-2"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>转换为XML</span>
                    </button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload-xml"
                    />
                    <label
                      htmlFor="file-upload-xml"
                      className="btn-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>上传</span>
                    </label>
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

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span>XML输出</span>
                  </div>
                  <div className="panel-actions">
                    <button
                      onClick={copyToClipboard}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>复制</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([output], { type: 'application/xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'converted.xml';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>下载XML</span>
                    </button>
                  </div>
                </div>
                <div className="editor-area">
                  {output ? (
                    <pre
                      className="json-display"
                      style={{ color: '#4ade80' }}
                    >
                      {output}
                    </pre>
                  ) : (
                    <div className="json-editor json-display text-gray-500"
                      style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}
                    >
                      转换后的XML将显示在这里...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON Compare View */}
        {activeTool === 'compare' && (
          <div className="editor-container">
            <div className="panel-group">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileJson className="w-5 h-5 text-purple-400" />
                    <span>JSON 1</span>
                  </div>
                </div>
                <div className="editor-area">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="在此粘贴第一个JSON数据..."
                    className="json-editor"
                  />
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileJson className="w-5 h-5 text-purple-400" />
                    <span>JSON 2</span>
                  </div>
                </div>
                <div className="editor-area">
                  <textarea
                    value={compareInput}
                    onChange={(e) => setCompareInput(e.target.value)}
                    placeholder="在此粘贴第二个JSON数据..."
                    className="json-editor"
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Code2 className="w-5 h-5 text-purple-400" />
                    <span>差异结果</span>
                  </div>
                  <div className="panel-actions">
                    <button
                      onClick={handleCompare}
                      disabled={isProcessing || !input.trim() || !compareInput.trim()}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Code2 className="w-4 h-4" />
                      <span>比较</span>
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>复制差异</span>
                    </button>
                  </div>
                </div>
                <div className="editor-area">
                  {output ? (
                    <pre
                      className="json-display"
                      style={{ 
                        color: 'var(--text-primary)',
                        lineHeight: '2'
                      }}
                    >
                      {output.split('\n').map((line, index) => (
                        <div
                          key={index}
                          style={{
                            color: line.startsWith('+ ') ? '#4ade80' : line.startsWith('- ') ? '#f87171' : 'var(--text-secondary)'
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </pre>
                  ) : (
                    <div className="json-editor json-display text-gray-500"
                      style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}
                    >
                      比较结果将显示在这里...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON Path Query View */}
        {activeTool === 'query' && (
          <div className="editor-container">
            <div className="panel-group">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileJson className="w-5 h-5 text-purple-400" />
                    <span>原始JSON</span>
                  </div>
                  <div className="panel-actions">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload-query"
                    />
                    <label
                      htmlFor="file-upload-query"
                      className="btn-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>上传</span>
                    </label>
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

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Search className="w-5 h-5 text-purple-400" />
                    <span>查询结果</span>
                  </div>
                </div>
                <div className="editor-area">
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={jsonPathQuery}
                        onChange={(e) => setJsonPathQuery(e.target.value)}
                        placeholder="输入JSONPath，如: users[0].name 或 items.*"
                        className="json-editor"
                        style={{ 
                          height: '40px', 
                          borderRadius: '8px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.9rem'
                        }}
                      />
                      <button
                        onClick={handleQuery}
                        disabled={isProcessing || !input.trim() || !jsonPathQuery.trim()}
                        className="btn-primary flex items-center gap-2"
                        style={{ height: '40px' }}
                      >
                        <Search className="w-4 h-4" />
                        <span>查询</span>
                      </button>
                    </div>
                  </div>
                  {output ? (
                    <pre
                      className="json-display"
                      dangerouslySetInnerHTML={{ __html: formatJSONWithHighlight(output) }}
                    />
                  ) : (
                    <div className="json-editor json-display text-gray-500"
                      style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}
                    >
                      查询结果将显示在这里...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-12 p-8">
          {/* Stats */}
          {stats && (
            <div className="glass-panel p-8" style={{ padding: '1.5rem' }}>
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
          <div className="glass-panel p-8 mt-8 mb-8" style={{ padding: '1.5rem', marginTop: '1rem', marginBottom: '5rem' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              格式化选项
            </h3>
            <div style={{ marginTop: '2rem' }} className="flex gap-6">
              <div className="flex-1">
                <label className="flex items-center justify-start">
                  <span className="text-sm" style={{ marginRight: '2rem' }}>缩进空格数:</span>
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
                  <span className="text-sm" style={{ marginRight: '2rem' }}>排序键名:</span>
                  <input
                    type="checkbox"
                    checked={options.sortKeys}
                    onChange={(e) => setOptions({ ...options, sortKeys: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500"
                  />
                </label>
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-start">
                  <span className="text-sm" style={{ marginRight: '2rem' }}>输出模式:</span>
                  <button
                    onClick={handleBeautifyToggle}
                    className="btn-secondary px-3 py-1 text-sm"
                    style={{ 
                      background: options.removeWhitespace ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                      borderColor: options.removeWhitespace ? 'var(--error)' : 'var(--success)',
                      color: options.removeWhitespace ? 'var(--error)' : 'var(--success)'
                    }}
                  >
                    {options.removeWhitespace ? '压缩' : '美化'}
                  </button>
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