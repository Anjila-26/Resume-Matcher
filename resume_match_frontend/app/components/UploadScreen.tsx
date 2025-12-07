'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface UploadScreenProps {
  onBack: () => void;
}

interface Results {
  evaluation: string;
  email: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function UploadScreen({ onBack }: UploadScreenProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>('');
  const [jobText, setJobText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInputDocuments, setShowInputDocuments] = useState<boolean>(false);
  const [cvContent, setCvContent] = useState<string>('');
  const [jobContent, setJobContent] = useState<string>('');
  const cvInputRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);

  const isValidFileType = (file: File): boolean => {
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];
    const fileName = file.name.toLowerCase();
    
    // Check MIME type first
    if (validTypes.includes(file.type)) {
      return true;
    }
    
    // Fallback to file extension check (some browsers don't set MIME type correctly)
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isValidFileType(file)) {
        setFile(file);
        setError(null); // Clear any previous errors
      } else {
        setError('Please upload a PDF or TXT file only');
        alert('Please upload a PDF or TXT file');
      }
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    setFile: (file: File | null) => void
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (isValidFileType(file)) {
        setFile(file);
        setError(null); // Clear any previous errors
      } else {
        setError('Please upload a PDF or TXT file only');
        alert('Please upload a PDF or TXT file');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        reject(new Error('PDF files must be processed server-side'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleProcessFiles = async () => {
    if (!cvFile || !jobFile) {
      setError('Please upload both CV and job description files');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('cv_file', cvFile);
      formData.append('job_file', jobFile);

      const response = await fetch(`${API_BASE_URL}/api/process-files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process files');
      }

      const data = await response.json();
      setResults(data);
      
      // Try to read file content for display (only for text files)
      const cvIsText = cvFile.type === 'text/plain' || cvFile.name.toLowerCase().endsWith('.txt');
      const jobIsText = jobFile.type === 'text/plain' || jobFile.name.toLowerCase().endsWith('.txt');
      
      if (cvIsText) {
        setCvContent(await readFileAsText(cvFile).catch(() => 'File content not available'));
      } else {
        setCvContent('PDF file - content processed by server');
      }
      
      if (jobIsText) {
        setJobContent(await readFileAsText(jobFile).catch(() => 'File content not available'));
      } else {
        setJobContent('PDF file - content processed by server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing files');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessText = async () => {
    if (!cvText.trim() || !jobText.trim()) {
      setError('Please enter both CV and job description content');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cv_content: cvText,
          job_content: jobText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process text');
      }

      const data = await response.json();
      setResults(data);
      setCvContent(cvText);
      setJobContent(jobText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing text');
    } finally {
      setLoading(false);
    }
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const FileUploadArea = ({
    title,
    file,
    onFileSelect,
    inputRef,
  }: {
    title: string;
    file: File | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className="space-y-2">
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      <div
        className="border-2 border-dashed border-white/20 rounded-xl p-8 bg-white/5 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
        onDrop={(e) => handleDrop(e, (f) => (file === cvFile ? setCvFile(f) : setJobFile(f)))}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={onFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-white/60 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <>
              <p className="text-white font-medium">Drag and drop file here</p>
              <p className="text-white/60 text-sm">Limit 200MB per file • TXT, PDF</p>
            </>
          )}
        </div>
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
      >
        Browse files
      </button>
    </div>
  );

  return (
    <div 
      className="min-h-screen px-6 py-8"
      style={{
        background: 'linear-gradient(to bottom right, #0a0e27, #1a1f3a, #0a0e27)'
      }}
    >
      {/* Status Bar Simulation */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-3 text-white/70 text-sm">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 border border-white/70 rounded-sm">
            <div className="w-3 h-1.5 bg-white/70 rounded-sm m-0.5"></div>
          </div>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.24 0 1 1 0 01-1.415-1.415 5 5 0 017.07 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <div className="w-6 h-3 border border-white/70 rounded-sm">
            <div className="w-full h-full bg-white/70 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pt-12">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
              }}
            >
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-white text-2xl font-semibold">ResuMatch</span>
          </div>
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Title Section */}
        <div className="text-center mb-12">
          <p className="text-xl text-white/70">
            Upload your CV and a job description to get an evaluation and email response.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-white/20">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-4 px-2 font-semibold transition-colors duration-200 ${
              activeTab === 'upload'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`pb-4 px-2 font-semibold transition-colors duration-200 ${
              activeTab === 'text'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Text Input
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'upload' ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Upload Your Files</h2>
              <div className="space-y-6">
                <FileUploadArea
                  title="Upload your CV (TXT, PDF):"
                  file={cvFile}
                  onFileSelect={(e) => handleFileSelect(e, setCvFile)}
                  inputRef={cvInputRef}
                />
                <FileUploadArea
                  title="Upload Job Description (TXT, PDF):"
                  file={jobFile}
                  onFileSelect={(e) => handleFileSelect(e, setJobFile)}
                  inputRef={jobInputRef}
                />
              </div>
            </div>


            {/* Process Button */}
            {cvFile && jobFile && (
              <button
                onClick={handleProcessFiles}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 mt-8"
              >
                {loading ? 'Processing...' : 'Process'}
              </button>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                {error}
              </div>
            )}

            {/* Results Display */}
            {results && (
              <div className="mt-8 space-y-6">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <button
                    onClick={() => setShowInputDocuments(!showInputDocuments)}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors w-full"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${showInputDocuments ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>View Input Documents</span>
                  </button>
                  
                  {showInputDocuments && (
                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">CV Content</h4>
                        <textarea
                          readOnly
                          value={cvContent}
                          className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white/80 text-sm min-h-[150px]"
                        />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Job Description</h4>
                        <textarea
                          readOnly
                          value={jobContent}
                          className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white/80 text-sm min-h-[150px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Evaluation</h3>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="text-white/90 whitespace-pre-wrap">{results.evaluation}</div>
                      <button
                        onClick={() => downloadText(results.evaluation, 'cv_evaluation.txt')}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Download Evaluation
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Email Response</h3>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="text-white/90 whitespace-pre-wrap">{results.email}</div>
                      <button
                        onClick={() => downloadText(results.email, 'email_response.txt')}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Download Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Enter Your Information</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-white font-semibold text-lg">
                    Paste your CV content:
                  </label>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 min-h-[200px]"
                    placeholder="Paste your CV content here..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white font-semibold text-lg">
                    Paste job description:
                  </label>
                  <textarea
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 min-h-[200px]"
                    placeholder="Paste the job description here..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleProcessText}
              disabled={loading || !cvText.trim() || !jobText.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 mt-8"
            >
              {loading ? 'Processing...' : 'Process'}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                {error}
              </div>
            )}

            {/* Results Display */}
            {results && (
              <div className="mt-8 space-y-6">
                {/* Evaluation Section */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Evaluation</h3>
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="prose prose-invert max-w-none text-white/90">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-4 text-white/90 leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-6 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-5 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-white">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-white">{children}</h4>,
                          h5: ({ children }) => <h5 className="text-sm font-semibold mb-1 mt-2 text-white">{children}</h5>,
                          h6: ({ children }) => <h6 className="text-sm font-medium mb-1 mt-2 text-white/90">{children}</h6>,
                          ul: ({ children }) => <ul className="list-disc list-outside mb-4 ml-6 space-y-2 text-white/90">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-outside mb-4 ml-6 space-y-2 text-white/90">{children}</ol>,
                          li: ({ children }) => <li className="text-white/90 leading-relaxed pl-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-blue-300 font-mono">{children}</code>
                            ) : (
                              <code className={className}>{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="bg-white/10 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-white/80 my-4">{children}</blockquote>,
                          hr: () => <hr className="my-6 border-white/20" />,
                        }}
                      >
                        {results.evaluation}
                      </ReactMarkdown>
                    </div>
                    <button
                      onClick={() => downloadText(results.evaluation, 'cv_evaluation.txt')}
                      className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Download Evaluation
                    </button>
                  </div>
                </div>

                {/* Input Documents Section */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Input Documents</h3>
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <button
                      onClick={() => setShowInputDocuments(!showInputDocuments)}
                      className="flex items-center gap-2 text-white/70 hover:text-white transition-colors w-full mb-4"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${showInputDocuments ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span>{showInputDocuments ? 'Hide' : 'Show'} Input Documents</span>
                    </button>
                    
                    {showInputDocuments && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-white font-semibold mb-2">CV Content</h4>
                          <textarea
                            readOnly
                            value={cvContent}
                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white/80 text-sm min-h-[150px] resize-none"
                          />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-2">Job Description</h4>
                          <textarea
                            readOnly
                            value={jobContent}
                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white/80 text-sm min-h-[150px] resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Response Section */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Email Response</h3>
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="prose prose-invert max-w-none text-white/90">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-4 text-white/90 leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-6 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-5 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-white">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-white">{children}</h4>,
                          h5: ({ children }) => <h5 className="text-sm font-semibold mb-1 mt-2 text-white">{children}</h5>,
                          h6: ({ children }) => <h6 className="text-sm font-medium mb-1 mt-2 text-white/90">{children}</h6>,
                          ul: ({ children }) => <ul className="list-disc list-outside mb-4 ml-6 space-y-2 text-white/90">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-outside mb-4 ml-6 space-y-2 text-white/90">{children}</ol>,
                          li: ({ children }) => <li className="text-white/90 leading-relaxed pl-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-blue-300 font-mono">{children}</code>
                            ) : (
                              <code className={className}>{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="bg-white/10 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-white/80 my-4">{children}</blockquote>,
                          hr: () => <hr className="my-6 border-white/20" />,
                        }}
                      >
                        {results.email}
                      </ReactMarkdown>
                    </div>
                    <button
                      onClick={() => downloadText(results.email, 'email_response.txt')}
                      className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Download Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

