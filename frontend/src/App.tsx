import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  Network,
  Terminal,
  Play
} from 'lucide-react';

interface FileMetric {
  filepath: string;
  loc: number;
  max_complexity: number;
  avg_complexity: number;
  complexity_rank: string;
  churn: number;
  bug_commits: number;
  duplicate_lines: number;
  bus_factor: number;
  primary_author: string;
  knowledge_concentration: number;
  total_authors: number;
  priority_score: number;
  roi_hours_saved: number;
  roi_bugs_prevented: number;
  roi_score: number;
  ai_recommendations?: string;
}

interface SecretLeak {
  secret_type: string;
  filepath: string;
  commit_sha: string;
  author: string;
  snippet: string;
  date: string;
}

interface DuplicateCode {
  hash: string;
  occurrences: { file: string; line: number }[];
}

interface DependencyGraph {
  nodes: { id: string; loc: number; score: number; complexity: number }[];
  links: { source: string; target: string }[];
}

interface AnalysisResult {
  summary: {
    total_files: number;
    total_loc: number;
    total_churn: number;
    avg_complexity: number;
    total_secrets_leaked: number;
    total_bugs_found: number;
  };
  ranked_files: FileMetric[];
  secrets: SecretLeak[];
  duplicates: DuplicateCode[];
  dependency_graph: DependencyGraph;
}

function App() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const [repoPath, setRepoPath] = useState('https://github.com/sushanth-kumar-prog/Times-series-analysis.git');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quadrant' | 'dependencies' | 'security' | 'roi' | 'chat'>('dashboard');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [selectedForRefactor, setSelectedForRefactor] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepFile, setSelectedDepFile] = useState<string | null>(null);
  
  // Chat states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Real-time terminal logs simulator
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleAnalyze = async () => {
    if (!repoPath.trim()) return;
    setLoading(true);
    setError(null);
    setLogs([]);
    setSelectedForRefactor([]);
    
    appendLog("Starting repository scan...");
    appendLog(`Scanning target path: ${repoPath}`);
    
    try {
      // Simulate backend pipeline logging step by step
      await new Promise(r => setTimeout(r, 600));
      appendLog("Reading git repository log files...");
      
      await new Promise(r => setTimeout(r, 600));
      appendLog("Analyzing commit authorship and modification churn rates...");
      
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository_path: repoPath }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis failed. Please verify the folder exists.');
      }

      appendLog("Running code complexity analyzers on active source files...");
      await new Promise(r => setTimeout(r, 600));
      
      appendLog("Scanning commit diff logs for exposed security keys...");
      
      const data = await response.json();
      
      appendLog("Correlating git churn metrics with code file complexity...");
      await new Promise(r => setTimeout(r, 600));
      
      appendLog("Running scikit-learn priority scoring engine...");
      appendLog("Structuring data endpoints...");

      setResult(data);
      if (data.ranked_files && data.ranked_files.length > 0) {
        setSelectedDepFile(data.ranked_files[0].filepath);
      }
      appendLog("Repository analysis completed successfully.");
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
      appendLog(`Error: ${err.message || 'Analysis aborted.'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRefactorSelect = (path: string) => {
    if (selectedForRefactor.includes(path)) {
      setSelectedForRefactor(selectedForRefactor.filter(p => p !== path));
    } else {
      setSelectedForRefactor([...selectedForRefactor, path]);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim() || !result) return;
    setChatLoading(true);
    setChatAnswer('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: chatQuestion,
          repo_summary: result.summary,
          hotspots: result.ranked_files
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      const data = await response.json();
      setChatAnswer(data.answer);
    } catch (err: any) {
      setChatAnswer("Error: Could not reach the codebase AI assistant. Please make sure the backend server is running.");
    } finally {
      setChatLoading(false);
    }
  };

  const calculateSelectedROI = () => {
    if (!result) return { hours: 0, bugs: 0 };
    let hours = 0;
    let bugs = 0;
    result.ranked_files.forEach(f => {
      if (selectedForRefactor.includes(f.filepath)) {
        hours += f.roi_hours_saved;
        bugs += f.roi_bugs_prevented;
      }
    });
    return { hours: Math.round(hours), bugs };
  };

  const { hours: roiHours, bugs: roiBugs } = calculateSelectedROI();

  // Find max churn and complexity to scale scatter plot quadrant
  const getMaxScatterValues = () => {
    if (!result || result.ranked_files.length === 0) return { churn: 10, complexity: 10 };
    const maxChurn = Math.max(...result.ranked_files.map(f => f.churn), 1);
    const maxComplexity = Math.max(...result.ranked_files.map(f => f.max_complexity), 1);
    return { churn: maxChurn, complexity: maxComplexity };
  };

  const scatterScale = getMaxScatterValues();

  // Plain-English Repository AI summary
  const getPlainEnglishSummary = () => {
    if (!result || result.ranked_files.length === 0) return "";
    const totalFiles = result.ranked_files.length;
    const hotspots = result.ranked_files.filter(f => f.priority_score > 50);
    const worstFile = result.ranked_files[0];
    
    let summaryText = `Your codebase has ${totalFiles} total files. Out of these, we found ${hotspots.length} files that are modified frequently and have high complexity. `;
    
    if (worstFile) {
      summaryText += `The main file slowing down your team is ${worstFile.filepath}. It has been modified ${worstFile.churn} times and has a cyclomatic complexity score of ${worstFile.max_complexity}. We recommend refactoring this file first because cleaning it up will prevent about ${worstFile.roi_bugs_prevented} bugs and save around ${worstFile.roi_hours_saved} hours of development time.`;
    }
    
    if (result.summary.total_secrets_leaked > 0) {
      summaryText += ` Warning: We also detected ${result.summary.total_secrets_leaked} credentials left in the git history that must be revoked immediately.`;
    } else {
      summaryText += ` On the positive side, we did not find any API keys or credentials leaked in your repository history.`;
    }
    
    return summaryText;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e4e7] flex flex-col font-sans antialiased leading-relaxed">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3b82f6] rounded">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                DebtLens
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Technical debt analyzer
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-8">
        
        {/* Pitch / Plain English Product Value */}
        <section className="border-b border-gray-800 pb-6">
          <h2 className="text-xl font-bold text-white mb-2">Find what makes your code hard to maintain</h2>
          <p className="text-sm text-gray-400 max-w-2xl">
            DebtLens looks through your Git history and codebase files. It finds files that developers edit constantly and files that contain overly complex programming statements. It then ranks these files so you know what to clean up first.
          </p>
        </section>

        {/* Input Form */}
        <section className="bg-[#121214] border border-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Enter your project directory path
              </label>
              <input
                type="text"
                placeholder="e.g. d:/sush/Debtlens"
                className="w-full bg-[#18181b] border border-gray-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-[#3b82f6] text-gray-200 transition-colors"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
              />
              <span className="text-[10px] text-gray-500 mt-2 block font-medium">
                * Note: Analyzing remote repositories or large codebases requires cloning and traversing history, which can take 1-2 minutes. Please wait while the progress bar runs.
              </span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm py-3 px-6 rounded transition-colors disabled:opacity-50 w-full md:w-auto justify-center flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Analyze Codebase
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-rose-950/20 border border-rose-800/40 text-rose-400 text-xs py-3 px-4 rounded mt-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {result ? (
          <>
            {/* Plain English AI Summary Box */}
            <section className="bg-[#18181b] border-l-4 border-[#3b82f6] p-6 rounded-r border-t border-r border-b border-t-gray-800 border-r-gray-800 border-b-gray-800 animate-[pulse_4s_infinite] shadow-md shadow-[#3b82f6]/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-2">Codebase Health Summary</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {getPlainEnglishSummary()}
              </p>
            </section>

            {/* Flat Statistics Panel */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#121214] border border-gray-850 p-5 rounded">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Analyzed Files</span>
                <span className="text-xl font-bold text-white mt-1 block">{result.summary.total_files}</span>
              </div>
              <div className="bg-[#121214] border border-gray-850 p-5 rounded">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Lines of Code</span>
                <span className="text-xl font-bold text-white mt-1 block">{result.summary.total_loc.toLocaleString()}</span>
              </div>
              <div className="bg-[#121214] border border-gray-850 p-5 rounded">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Total Edits (Churn)</span>
                <span className="text-xl font-bold text-white mt-1 block">{result.summary.total_churn}</span>
              </div>
              <div className="bg-[#121214] border border-gray-850 p-5 rounded">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Average Complexity</span>
                <span className="text-xl font-bold text-white mt-1 block">{result.summary.avg_complexity}</span>
              </div>
              <div className="bg-[#121214] border border-gray-850 p-5 rounded col-span-2 md:col-span-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Exposed Keys</span>
                <span className="text-xl font-bold mt-1 block text-rose-500">{result.summary.total_secrets_leaked}</span>
              </div>
            </section>

            {/* Navigation tabs */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Refactoring Priorities
              </button>
              <button
                onClick={() => setActiveTab('quadrant')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'quadrant'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Complexity × Churn Map
              </button>
              <button
                onClick={() => setActiveTab('dependencies')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'dependencies'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Import Relationships
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'security'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Exposed Secrets ({result.secrets.length})
              </button>
              <button
                onClick={() => setActiveTab('roi')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'roi'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Savings Calculator
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-[#3b82f6] text-white bg-[#18181b]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Codebase Q&A
              </button>
            </div>

            {/* Views */}
            <section className="flex flex-col gap-6">
              
              {/* Tab 1: List view */}
              {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-4">
                  {result.ranked_files.map((file) => {
                    const isExpanded = expandedFile === file.filepath;
                    return (
                      <div 
                        key={file.filepath} 
                        className={`bg-[#121214] border rounded overflow-hidden transition-all ${
                          isExpanded ? 'border-[#3b82f6]' : 'border-gray-800'
                        }`}
                      >
                        <div 
                          onClick={() => setExpandedFile(isExpanded ? null : file.filepath)}
                          className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-[#18181b]"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-sm text-white truncate block">{file.filepath}</span>
                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                              <span>Grade: {file.complexity_rank}</span>
                              <span>•</span>
                              <span>{file.loc} lines</span>
                              <span>•</span>
                              <span>Modified {file.churn} times</span>
                              <span>•</span>
                              <span>{file.bug_commits} bugs found</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Priority Score</span>
                              <span className={`text-base font-bold ${
                                file.priority_score > 60 ? 'text-rose-500' : 'text-amber-500'
                              }`}>{file.priority_score.toFixed(0)} / 100</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-850 bg-[#18181b] p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">How to refactor:</span>
                              <div className="bg-[#121214] border border-gray-800 p-4 rounded text-sm text-gray-300 font-mono whitespace-pre-line leading-relaxed">
                                {file.ai_recommendations || "No recommendations generated."}
                              </div>
                            </div>
                            <div className="bg-[#121214] border border-gray-800 p-4 rounded flex flex-col justify-between">
                              <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Ownership info</span>
                                <div className="flex justify-between text-xs py-1">
                                  <span className="text-gray-500">Author:</span>
                                  <span className="font-mono text-white">{file.primary_author}</span>
                                </div>
                                <div className="flex justify-between text-xs py-1">
                                  <span className="text-gray-500">Ownership:</span>
                                  <span className="text-white">{(file.knowledge_concentration * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-xs py-1">
                                  <span className="text-gray-500">Bus Factor:</span>
                                  <span className="text-white">{file.bus_factor} developer</span>
                                </div>
                              </div>
                              <div className="border-t border-gray-800 pt-3 mt-4 flex justify-between text-xs">
                                <span className="text-gray-500">Estimated refactoring payoff:</span>
                                <span className="text-[#10b981] font-bold">~{file.roi_hours_saved} Hours Saved</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Complexity x Churn Quadrant Map (Scatter Plot) */}
              {activeTab === 'quadrant' && (
                <div className="bg-[#121214] border border-gray-850 p-6 rounded flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Complexity × Churn Scatter Plot</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Files in the top-right quadrant have high complexity and undergo frequent changes. They represent the highest refactoring priority.
                    </p>
                  </div>

                  <div className="relative border-l border-b border-gray-700 w-full h-[350px] mt-4">
                    {/* Y-axis title */}
                    <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Complexity
                    </div>
                    {/* X-axis title */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Git Churn (Modifications)
                    </div>

                    {/* Quadrant borders */}
                    <div className="absolute left-1/2 top-0 bottom-0 border-r border-dashed border-gray-800"></div>
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-800"></div>

                    {/* Background labeling */}
                    <div className="absolute top-4 right-4 text-[9px] font-bold text-rose-500 bg-rose-950/20 border border-rose-900/50 px-2 py-1 rounded">
                      Top Right: High Risk Hotspots
                    </div>

                    {/* Render dots */}
                    {result.ranked_files.map((file, idx) => {
                      // Calculate percentage placement
                      const leftPercent = Math.min((file.churn / scatterScale.churn) * 100, 95);
                      const bottomPercent = Math.min((file.max_complexity / scatterScale.complexity) * 100, 90);
                      const isHotspot = file.priority_score > 50;

                      return (
                        <div
                          key={idx}
                          className="absolute group"
                          style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
                        >
                          <div 
                            onClick={() => {
                              setExpandedFile(file.filepath);
                              setActiveTab('dashboard');
                            }}
                            className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all border ${
                              isHotspot 
                                ? 'bg-rose-500 border-white hover:scale-125' 
                                : 'bg-[#3b82f6] border-[#09090b] hover:scale-125'
                            }`}
                          />
                          {/* Tooltip on hover */}
                          <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#09090b] border border-gray-800 p-2.5 rounded text-[10px] font-mono whitespace-nowrap z-50 text-white shadow-lg">
                            <span className="font-bold block">{file.filepath.split('/').pop()}</span>
                            <span>Churn: {file.churn} | CCN: {file.max_complexity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Import Relationships */}
              {activeTab === 'dependencies' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-[#121214] border border-gray-850 p-5 rounded h-[450px] overflow-y-auto space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 block">Repository Files</span>
                    {result.ranked_files.map((file) => (
                      <button
                        key={file.filepath}
                        onClick={() => setSelectedDepFile(file.filepath)}
                        className={`w-full text-left py-2 px-3 rounded text-xs font-mono truncate transition-all block ${
                          selectedDepFile === file.filepath
                            ? 'bg-[#18181b] text-[#3b82f6] border border-gray-800'
                            : 'text-gray-300 border border-transparent hover:bg-[#18181b]'
                        }`}
                      >
                        {file.filepath}
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-2 bg-[#121214] border border-gray-850 p-6 rounded flex flex-col justify-between min-h-[450px]">
                    {selectedDepFile ? (
                      <>
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Selected Node</span>
                          <h4 className="text-sm font-mono font-bold text-white break-all">{selectedDepFile}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-6 flex-1">
                          <div className="border border-gray-850 bg-[#18181b] p-4 rounded min-h-[180px] flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                              Used by:
                            </span>
                            <div className="overflow-y-auto flex-1 flex flex-col gap-1.5">
                              {result.dependency_graph.links.filter(l => l.target === selectedDepFile).length > 0 ? (
                                result.dependency_graph.links
                                  .filter(l => l.target === selectedDepFile)
                                  .map((link, idx) => (
                                    <div key={idx} className="bg-[#121214] py-1.5 px-3 rounded text-xs font-mono text-gray-300 truncate">
                                      {link.source}
                                    </div>
                                  ))
                              ) : (
                                <span className="text-xs text-gray-600 italic m-auto">No references detected.</span>
                              )}
                            </div>
                          </div>

                          <div className="border border-gray-850 bg-[#18181b] p-4 rounded min-h-[180px] flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                              Imports:
                            </span>
                            <div className="overflow-y-auto flex-1 flex flex-col gap-1.5">
                              {result.dependency_graph.links.filter(l => l.source === selectedDepFile).length > 0 ? (
                                result.dependency_graph.links
                                  .filter(l => l.source === selectedDepFile)
                                  .map((link, idx) => (
                                    <div key={idx} className="bg-[#121214] py-1.5 px-3 rounded text-xs font-mono text-gray-300 truncate">
                                      {link.target}
                                    </div>
                                  ))
                              ) : (
                                <span className="text-xs text-gray-600 italic m-auto">No import paths extracted.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="m-auto text-gray-500 text-xs italic">
                        Select a file from the list to view its connection pathways.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Exposed Secrets */}
              {activeTab === 'security' && (
                <div className="flex flex-col gap-4">
                  {result.secrets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {result.secrets.map((leak, index) => (
                        <div key={index} className="bg-[#121214] p-5 rounded border border-rose-950/40 flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                {leak.secret_type}
                              </span>
                              <span className="font-mono text-xs text-gray-500">Commit: {leak.commit_sha}</span>
                            </div>
                            <span className="font-mono text-xs text-gray-200 block break-all mb-2">
                              File: {leak.filepath}
                            </span>
                            <div className="bg-[#18181b] border border-gray-850 p-3 rounded font-mono text-xs text-rose-300 overflow-x-auto">
                              {leak.snippet}
                            </div>
                          </div>
                          
                          <div className="flex flex-col justify-between items-end text-right text-xs text-gray-400">
                            <div>
                              <span className="font-semibold block text-gray-300">By: {leak.author}</span>
                              <span>{new Date(leak.date).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[10px] text-rose-500 uppercase tracking-wider font-bold mt-2">
                              Action Required
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#121214] border border-gray-850 p-12 text-center rounded flex flex-col gap-3 justify-center items-center">
                      <h4 className="text-sm font-bold text-white">No credential leaks detected</h4>
                      <p className="text-xs text-gray-500 max-w-sm">
                        No exposed Stripe keys, AWS credentials, or API secret tokens were detected in your file log structures.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Savings Calculator */}
              {activeTab === 'roi' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-gray-300">Select files to plan refactoring backlog</h3>
                    <div className="flex flex-col gap-2">
                      {result.ranked_files.map((file) => {
                        const isSelected = selectedForRefactor.includes(file.filepath);
                        return (
                          <div
                            key={file.filepath}
                            onClick={() => toggleRefactorSelect(file.filepath)}
                            className={`bg-[#121214] p-4 rounded border cursor-pointer transition-all flex items-center gap-4 ${
                              isSelected ? 'border-[#10b981]' : 'border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div>
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-[#10b981]" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs text-gray-200 block truncate">{file.filepath}</span>
                              <div className="flex gap-4 text-[10px] text-gray-500 mt-1.5">
                                <span>Complexity: {file.complexity_rank}</span>
                                <span>Churn: {file.churn}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-[#10b981] block">+ {file.roi_hours_saved}h</span>
                              <span className="text-[9px] text-gray-500">Savings</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#121214] border border-gray-850 p-6 rounded h-fit flex flex-col gap-6 sticky top-24">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Backlog Planning Output</h4>
                      <p className="text-xs text-gray-500 mt-1">Estimations are calculated based on churn hours saved.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#18181b] border border-gray-850 p-4 rounded text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Hours Saved</span>
                        <div className="text-2xl font-bold text-[#10b981] mt-2 flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-[#10b981]" />
                          {roiHours}h
                        </div>
                      </div>
                      <div className="bg-[#18181b] border border-gray-850 p-4 rounded text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Bugs Prevented</span>
                        <div className="text-2xl font-bold text-[#3b82f6] mt-2 flex items-center justify-center gap-1">
                          {roiBugs}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Selected Files:</span>
                        <span className="font-bold text-white">{selectedForRefactor.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Calculated Savings:</span>
                        <span className="font-bold text-[#10b981]">${(roiHours * 75).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Q&A Chat Panel */}
              {activeTab === 'chat' && (
                <div className="bg-[#121214] border border-gray-850 p-6 rounded flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Ask questions about your repository</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Our AI assistant uses the metrics, file data, complexity scores, and secret reports to answer structural and maintenance questions about your codebase.
                    </p>
                  </div>

                  <form onSubmit={handleChatSubmit} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="e.g. Which file has the worst complexity? or How can I improve my bus factor?"
                      className="flex-1 bg-[#18181b] border border-gray-800 rounded px-4 py-2 text-xs focus:outline-none focus:border-[#3b82f6] text-gray-200"
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-xs py-2 px-5 rounded transition-colors disabled:opacity-50"
                    >
                      {chatLoading ? "Asking..." : "Ask AI"}
                    </button>
                  </form>

                  {chatAnswer && (
                    <div className="border border-gray-850 bg-[#18181b] p-5 rounded">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">AI Architect Response:</span>
                      <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">{chatAnswer}</p>
                    </div>
                  )}
                </div>
              )}

            </section>
          </>
        ) : (
          /* Landing Screen */
          <section className="bg-[#121214] border border-gray-800 p-12 text-center rounded max-w-xl mx-auto mt-8 flex flex-col gap-4 justify-center items-center">
            <div className="p-3 bg-[#3b82f6]/10 rounded border border-[#3b82f6]/20 text-[#3b82f6]">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">No analysis loaded</h2>
              <p className="text-xs text-gray-400 max-w-sm mt-2">
                Type a project folder path in the input field above (for example, your current DebtLens path) and click the analyze button to generate your codebase diagnostics.
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              className="bg-[#18181b] border border-gray-800 hover:bg-[#202024] text-xs font-semibold py-2.5 px-5 rounded text-[#3b82f6]"
            >
              Analyze this project
            </button>
          </section>
        )}

        {/* Real-time Terminal Log Feed Widget */}
        <section className="bg-[#09090b] border border-gray-800 rounded">
          <div className="bg-[#121214] px-4 py-2 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Analysis Console Log</span>
            </div>
            {logs.length > 0 && (
              <button 
                onClick={() => setLogs([])}
                className="text-[9px] text-gray-500 hover:text-gray-300 font-bold"
              >
                Clear console
              </button>
            )}
          </div>
          <div className="p-4 h-[120px] overflow-y-auto font-mono text-[11px] text-gray-400 flex flex-col gap-1.5 bg-[#09090b]">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="leading-5">
                  <span className="text-gray-600 mr-2">&gt;</span>
                  {log}
                </div>
              ))
            ) : (
              <span className="text-gray-600 italic">No console logs active. Start an analysis to stream logs.</span>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-6 text-center text-xs text-gray-600 font-mono mt-auto bg-[#070709]">
        DebtLens &copy; 2026. Minimalist dashboard engine.
      </footer>
    </div>
  );
}

export default App;
