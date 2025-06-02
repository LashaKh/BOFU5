import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { File, X, CheckCircle, AlertTriangle, Image, Upload, Trash2, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import * as PDFJS from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { processScannedPDF } from '../utils/geminiApi';

// Import the worker setup file - this ensures the worker is properly initialized
import '../pdf-worker.js';

// Note: We no longer need to set the worker source here, as it's done in the pdf-worker.js file

interface DocumentUploaderProps {
  onDocumentsProcessed: (documents: ProcessedDocument[], forceUpdate: boolean) => void;
}

export interface ProcessedDocument {
  name: string;
  type: string;
  content: string;
  status: 'processed' | 'processing' | 'error';
  error?: string;
  isGoogleDoc?: boolean;
  usedAI?: boolean;
  originalFile?: File;
  rawUrl?: string;
  file_url?: string;
}

export function DocumentUploader({ onDocumentsProcessed }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isOverallProcessing, setIsOverallProcessing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<{ content: string; usedAI: boolean }> => {
    try {
      // Create a copy of the array buffer to prevent detachment issues
      const originalArrayBuffer = await file.arrayBuffer();
      const arrayBufferCopy = originalArrayBuffer.slice(0);
      
      const pdf = await PDFJS.getDocument({ data: arrayBufferCopy }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n\n';
      }
      
      // Check if the extraction was successful by evaluating text content
      // This helps detect scanned PDFs or PDFs with embedded images instead of text
      const isEmptyOrMinimal = text.trim().length < 100 || !/[a-zA-Z]/.test(text);
      
      if (isEmptyOrMinimal) {
        console.log('PDF text extraction yielded minimal results, falling back to image-based extraction');
        toast.loading('Using AI to extract text from scanned PDF...', { id: 'ai-extraction' });
        
        // Use a new copy of the array buffer for image processing
        const imageArrayBuffer = originalArrayBuffer.slice(0);
        
        // Fall back to image-based extraction
        const aiExtractedText = await processScannedPDF(imageArrayBuffer);
        toast.success('Successfully extracted text using AI processing', { id: 'ai-extraction' });
        
        return { content: aiExtractedText, usedAI: true };
      }
      
      return { content: text, usedAI: false };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      
      // Try image-based extraction as a fallback
      try {
        toast.loading('Primary extraction failed, using AI to extract text...', { id: 'ai-extraction' });
        // Create a fresh copy of the array buffer for the fallback
        const fallbackArrayBuffer = await file.arrayBuffer();
        const aiExtractedText = await processScannedPDF(fallbackArrayBuffer);
        toast.success('Successfully extracted text using AI processing', { id: 'ai-extraction' });
        
        return { content: aiExtractedText, usedAI: true };
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        throw new Error('Failed to extract text from PDF using both methods');
      }
    }
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX file');
    }
  };

  const extractTextFromDOC = async (file: File): Promise<string> => {
    try {
      // For legacy .doc files, we'll attempt to extract some text
      // but note this is limited as .doc is a binary format
      const text = await file.text();
      // Try to clean up binary content and extract readable text
      let extractedText = '';
      const textChunks = text.split(/[\x00-\x09\x0B\x0C\x0E-\x1F]+/)
        .filter(chunk => chunk.length > 20) // Filter out small chunks that likely aren't text
        .filter(chunk => /[a-zA-Z]/.test(chunk)); // Must have at least one letter
      
      if (textChunks.length > 0) {
        extractedText = textChunks.join('\n\n');
        return extractedText;
      } else {
        throw new Error('Could not extract readable text from DOC file');
      }
    } catch (error) {
      console.error('Error processing DOC file:', error);
      throw new Error('Legacy DOC format is not fully supported. Please convert to DOCX for better results.');
    }
  };

  const extractTextFromPPTX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // PPTX files store slide content in /ppt/slides/slide*.xml files
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      // Sort the slides by their number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace('ppt/slides/slide', '').replace('.xml', ''));
        const numB = parseInt(b.replace('ppt/slides/slide', '').replace('.xml', ''));
        return numA - numB;
      });
      
      let text = '';
      
      for (const slideFile of slideFiles) {
        const slideContent = await zip.file(slideFile)?.async('text');
        if (slideContent) {
          // Extract text from XML using regex - not perfect but works for basic extraction
          const slideNumber = slideFile.replace('ppt/slides/slide', '').replace('.xml', '');
          text += `Slide ${slideNumber}:\n`;
          
          // Extract text from <a:t> tags which contain text content
          const textMatches = slideContent.match(/<a:t>([^<]*)<\/a:t>/g);
          if (textMatches) {
            for (const match of textMatches) {
              const content = match.replace(/<a:t>/, '').replace(/<\/a:t>/, '');
              if (content.trim()) {
                text += content.trim() + '\n';
              }
            }
          }
          text += '\n';
        }
      }
      
      return text || 'No text content found in presentation.';
    } catch (error) {
      console.error('Error extracting text from PPTX:', error);
      throw new Error('Failed to extract text from PPTX file');
    }
  };

  const extractGoogleDocsInfo = async (file: File): Promise<{ content: string, isGoogleDoc: boolean }> => {
    try {
      // Read the .gdoc file as text (it's actually JSON)
      const text = await file.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid Google Docs file format');
      }
      
      // Extract information from the Google Docs JSON
      const docId = jsonData?.docId || jsonData?.resourceId || 'Unknown';
      const title = jsonData?.title || file.name;
      const url = jsonData?.url || `https://docs.google.com/document/d/${docId}/edit`;
      
      // Return a formatted message with the Google Docs information
      return {
        content: `[Google Docs File Information]\n
Title: ${title}
Document ID: ${docId}
URL: ${url}

NOTE: This is a Google Docs reference file (.gdoc), not the actual document content.
To process this document, please export it from Google Docs as PDF or DOCX format first.`,
        isGoogleDoc: true
      };
    } catch (error) {
      console.error('Error processing Google Docs file:', error);
      throw new Error('Failed to process Google Docs file. Please export it as PDF or DOCX first.');
    }
  };

  const extractTextFromDocument = async (file: File): Promise<{ content: string, isGoogleDoc?: boolean, usedAI?: boolean }> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Check for Google Docs files by extension
    if (fileName.endsWith('.gdoc')) {
      return await extractGoogleDocsInfo(file);
    }
    
    if (fileType.includes('pdf')) {
      const result = await extractTextFromPDF(file);
      return { content: result.content, usedAI: result.usedAI };
    } else if (fileType.includes('openxmlformats-officedocument.wordprocessingml.document')) {
      // DOCX files
      return { content: await extractTextFromDOCX(file) };
    } else if (fileType.includes('msword')) {
      // Legacy DOC files
      return { content: await extractTextFromDOC(file) };
    } else if (fileType.includes('openxmlformats-officedocument.presentationml.presentation')) {
      // PPTX files
      return { content: await extractTextFromPPTX(file) };
    } else if (fileType.includes('ms-powerpoint')) {
      // Legacy PPT files
      return { 
        content: `Content extraction from legacy PowerPoint (.ppt) files is limited.\n\nPlease convert to PPTX format for better results.`
      };
    } else if (fileType.includes('text') || fileType === 'application/rtf') {
      // Plain text or RTF files
      return { content: await file.text() };
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsOverallProcessing(true);
    // Reset documents state for new batch or append as preferred
    // For now, let's assume we process a new batch clearing old ones from current UI processing list if not yet fully submitted
    // setDocuments([]); 

    const currentBatchProcessedDocuments: ProcessedDocument[] = [];

    for (const file of acceptedFiles) {
      const tempDoc: ProcessedDocument = {
        name: file.name,
        type: file.type || 'unknown',
        content: '',
        status: 'processing',
        originalFile: file,
      };
      // Add to UI immediately with 'processing' state
      setDocuments(prev => [...prev, tempDoc]); 
      currentBatchProcessedDocuments.push(tempDoc); // Keep a reference to docs in this batch

      try {
        const { content, isGoogleDoc, usedAI } = await extractTextFromDocument(file);
        // Update the specific document in the main 'documents' state and in our batch reference
        setDocuments(prev => prev.map(d => 
          (d.originalFile === file && d.name === file.name && d.status === 'processing') ? 
          { ...d, content, status: 'processed', isGoogleDoc, usedAI } : d
        ));
        const batchDocIndex = currentBatchProcessedDocuments.findIndex(d => d.originalFile === file && d.name === file.name);
        if (batchDocIndex > -1) {
          currentBatchProcessedDocuments[batchDocIndex] = {
            ...currentBatchProcessedDocuments[batchDocIndex],
            content,
            status: 'processed',
            isGoogleDoc,
            usedAI
          };
        }
      } catch (error: any) {
        console.error('Error processing file:', file.name, error);
        setDocuments(prev => prev.map(d => 
          (d.originalFile === file && d.name === file.name && d.status === 'processing') ? 
          { ...d, status: 'error', error: error.message || 'Failed to process' } : d
        ));
        const batchDocIndex = currentBatchProcessedDocuments.findIndex(d => d.originalFile === file && d.name === file.name);
        if (batchDocIndex > -1) {
          currentBatchProcessedDocuments[batchDocIndex] = {
            ...currentBatchProcessedDocuments[batchDocIndex],
            status: 'error',
            error: error.message || 'Failed to process'
          };
        }
      }
    }
    
    onDocumentsProcessed(currentBatchProcessedDocuments, forceUpdate);
    setIsOverallProcessing(false);
  }, [forceUpdate, onDocumentsProcessed]); // Removed 'documents' from deps, as we use setDocuments(prev => ...)

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
    // DO NOT call onDocumentsProcessed here, this is a local UI removal
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.google-apps.document': ['.gdoc'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/rtf': ['.rtf']
    },
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Section Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary-500/20 to-blue-500/20 border border-primary-500/30 rounded-full backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
        >
          <Upload className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium text-primary-300">Step 1</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Upload Your Research Sources</h2>
        <p className="text-white/70 max-w-lg mx-auto">
          Drag and drop your documents or browse to upload. We support PDF, Word, PowerPoint, and text files.
        </p>
      </motion.div>

      {/* Enhanced Upload Zone */}
      <motion.div
        {...getRootProps()}
        className={`
          relative group cursor-pointer transition-all duration-500 ease-out
          ${isDragActive 
            ? 'scale-[1.02] shadow-2xl shadow-primary-500/20' 
            : 'hover:scale-[1.01] hover:shadow-xl hover:shadow-primary-500/10'
          }
        `}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <input {...getInputProps()} />
        
        {/* Glassmorphism Background */}
        <div className={`
          relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-500
          ${isDragActive 
            ? 'bg-gradient-to-br from-primary-500/20 via-blue-500/15 to-purple-500/20 border-primary-400/60 shadow-2xl shadow-primary-500/25' 
            : 'bg-gradient-to-br from-white/5 via-white/10 to-white/5 border-white/20 hover:border-primary-400/40 hover:bg-gradient-to-br hover:from-primary-500/10 hover:via-blue-500/5 hover:to-purple-500/10'
          }
        `}>
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary-400/40 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center">
            <motion.div
              className={`mb-8 p-6 rounded-full backdrop-blur-sm transition-all duration-300 ${
                isDragActive 
                  ? 'bg-primary-500/30 shadow-2xl shadow-primary-500/30' 
                  : 'bg-primary-500/20 group-hover:bg-primary-500/30 group-hover:shadow-xl group-hover:shadow-primary-500/20'
              }`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={isDragActive ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Upload 
                  className={`transition-all duration-300 ${
                    isDragActive ? 'text-primary-300 w-12 h-12' : 'text-primary-400 w-10 h-10 group-hover:text-primary-300'
                  }`}
                />
              </motion.div>
            </motion.div>
            
            <motion.div className="space-y-4">
              <motion.h3 
                className={`text-2xl font-bold transition-colors duration-300 ${
                  isDragActive ? 'text-primary-300' : 'text-white group-hover:text-primary-200'
                }`}
                animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
              >
                {isDragActive ? '✨ Drop your files here!' : 'Drag & drop your research files'}
              </motion.h3>
              
              <motion.p 
                className="text-white/70 text-lg max-w-md mx-auto leading-relaxed"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: isDragActive ? 1 : 0.7 }}
              >
                {isDragActive 
                  ? 'Release to upload your documents' 
                  : 'We support PDF, Word, PowerPoint, and text files up to 10MB each'
                }
              </motion.p>
              
              <motion.div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8">
                <motion.button 
                  type="button"
                  className="group/btn relative px-8 py-4 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/30 focus:ring-4 focus:ring-primary-300/50"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Browse Files
                  </span>
                </motion.button>
                
                <div className="text-white/50 text-sm">or</div>
                
                <motion.div 
                  className="text-white/60 text-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  🔗 <span className="underline cursor-pointer hover:text-white/80">Paste URL</span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced File List */}
      {documents.length > 0 && (
        <motion.div 
          className="space-y-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div 
            className="flex justify-between items-center p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl backdrop-blur-sm border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <h3 className="text-lg font-semibold text-white">
                Uploaded Documents ({documents.length})
              </h3>
            </div>
            
            {documents.length > 1 && (
              <motion.button 
                onClick={() => {
                  setDocuments([]);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all duration-200 backdrop-blur-sm border border-red-500/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 size={14} />
                Clear All
              </motion.button>
            )}
          </motion.div>
          
          <div className="grid gap-3">
            <AnimatePresence>
              {documents.map((doc, index) => (
                <motion.div 
                  key={index}
                  variants={item}
                  exit={{ opacity: 0, x: -100, scale: 0.95 }}
                  layout
                  className="group relative flex items-center justify-between p-5 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:border-primary-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
                  whileHover={{ x: 4, scale: 1.01 }}
                >
                  {/* Status Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 rounded-l-2xl transition-opacity duration-300" />
                  
                  <div className="flex items-center flex-1 min-w-0">
                    <motion.div 
                      className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 ${
                        doc.status === 'processed' 
                          ? doc.isGoogleDoc 
                            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30' 
                            : doc.usedAI 
                              ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30' 
                              : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30' 
                          : doc.status === 'error' 
                            ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                      whileHover={{ rotate: 5, scale: 1.1 }}
                    >
                      <File size={20} />
                    </motion.div>
                    
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-semibold text-white truncate text-lg">
                        {doc.name}
                      </p>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        {doc.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <motion.div 
                              className="w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-sm text-primary-300 font-medium">Processing...</span>
                          </div>
                        )}
                        
                        {doc.status === 'processed' && doc.isGoogleDoc && (
                          <motion.span 
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-300 border border-yellow-400/30"
                            whileHover={{ scale: 1.05 }}
                          >
                            📄 Google Docs Link
                          </motion.span>
                        )}
                        
                        {doc.status === 'processed' && doc.usedAI && (
                          <motion.span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-400/20 to-purple-400/20 text-indigo-300 border border-indigo-400/30"
                            whileHover={{ scale: 1.05 }}
                          >
                            <Brain size={12} />
                            AI-Enhanced
                          </motion.span>
                        )}
                        
                        {doc.status === 'processed' && !doc.isGoogleDoc && !doc.usedAI && (
                          <motion.span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-400/20 to-emerald-400/20 text-green-300 border border-green-400/30"
                            whileHover={{ scale: 1.05 }}
                          >
                            <CheckCircle size={12} />
                            Processed
                          </motion.span>
                        )}
                        
                        {doc.status === 'error' && (
                          <motion.span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-400/20 to-pink-400/20 text-red-300 border border-red-400/30"
                            whileHover={{ scale: 1.05 }}
                          >
                            <AlertTriangle size={12} />
                            Error
                          </motion.span>
                        )}
                        
                        {doc.originalFile && (
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-lg">
                            {(doc.originalFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <motion.button 
                    onClick={() => removeDocument(index)}
                    className="ml-4 p-2 rounded-xl hover:bg-red-500/20 transition-colors duration-200 text-white/60 hover:text-red-300 border border-transparent hover:border-red-500/30"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      
      {/* Enhanced Processing State */}
      {isOverallProcessing && (
        <motion.div 
          className="flex items-center justify-center p-8 bg-gradient-to-r from-primary-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl backdrop-blur-sm border border-primary-500/20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-6 h-6 rounded-full border-3 border-primary-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-lg font-medium text-white">Processing your documents...</span>
          </div>
        </motion.div>
      )}

      {/* Enhanced Options */}
      <motion.div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl backdrop-blur-sm border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <motion.input
            type="checkbox"
            id="forceUpdateCheckbox"
            checked={forceUpdate}
            onChange={(e) => setForceUpdate(e.target.checked)}
            className="w-5 h-5 text-primary-600 bg-white/10 border-white/30 rounded focus:ring-primary-500 focus:ring-2 backdrop-blur-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
          <label htmlFor="forceUpdateCheckbox" className="text-sm text-white/80 font-medium cursor-pointer">
            Replace existing documents if duplicates are found
          </label>
        </div>
        
        {documents.length === 0 && !isOverallProcessing && (
          <motion.div 
            className="text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            🚀 Ready to upload your first document
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}