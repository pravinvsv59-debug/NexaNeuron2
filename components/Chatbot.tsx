import React, { useState, useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage } from '../types';
import { geminiService } from '../services/geminiService';
import { 
    SparklesIcon, UserIcon, PaperAirplaneIcon, PaperClipIcon, XCircleIcon, 
    SpeakerWaveIcon, ClipboardIcon, CodeBracketIcon, CheckIcon, EyeIcon, ShareIcon, ArrowDownTrayIcon,
    PlusIcon
} from '../constants';
import { decode, decodeAudioData } from '../services/utils';
import Spinner from './Spinner';
import Logo from './Logo';


const CodePreviewModal = ({ code, onClose }: { code: string; onClose: () => void }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Code Snippet from NexaNeuron',
                    text: code,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            handleCopyToClipboard();
            alert('Web Share API not supported. Code copied to clipboard instead.');
        }
    };
    
    // Auto-wrap HTML if no <html> tag is present for a better preview
    const finalCode = code.trim().startsWith('<') && !/<html>/i.test(code) 
        ? `<!DOCTYPE html>
           <html>
             <head>
               <title>Preview</title>
               <style>
                 body { 
                   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                   padding: 1rem; 
                   color: #212529;
                 }
               </style>
             </head>
             <body>
               ${code}
             </body>
           </html>`
        : code;

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Preview</h3>
                    <div className="flex items-center gap-2">
                         <button onClick={handleCopyToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                           {copySuccess ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                           {copySuccess ? 'Copied!' : 'Copy Code'}
                         </button>
                         <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                           <ShareIcon className="w-4 h-4" />
                           Share Code
                         </button>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <iframe
                    srcDoc={finalCode}
                    title="Code Preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </div>
    );
};


const Chatbot: React.FC = () => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Normal');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [audioState, setAudioState] = useState<{ index: number | null, status: 'loading' | 'playing' | 'idle' }>({ index: null, status: 'idle' });
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);


  const chatStyles = {
    Normal: {
      name: 'Normal',
      description: 'Default responses from Gemini.',
      systemInstruction: 'You are a helpful and friendly AI assistant.'
    },
    Learning: {
      name: 'Learning',
      description: 'Patient, educational responses that build understanding.',
      systemInstruction: 'You are a patient and educational tutor. Your goal is to help the user build a deep understanding of topics. Use analogies and step-by-step explanations.'
    },
    Concise: {
      name: 'Concise',
      description: 'Shorter responses & more messages.',
      systemInstruction: 'You provide concise, short, and to-the-point answers. Avoid verbosity.'
    },
    Explanatory: {
      name: 'Explanatory',
      description: 'Educational responses for learning.',
      systemInstruction: 'You provide detailed, explanatory, and educational responses for learning. Break down complex topics into understandable parts.'
    },
    Formal: {
      name: 'Formal',
      description: 'Clear and well-structured responses.',
      systemInstruction: 'You respond in a formal, clear, and well-structured manner. Use professional language and formatting.'
    }
  };

  useEffect(() => {
    // Initialize chat and load history when style changes
    const systemInstruction = chatStyles[selectedStyle as keyof typeof chatStyles].systemInstruction;
    chatRef.current = geminiService.startChat('gemini-2.5-flash', systemInstruction);
    
    const savedHistoryRaw = localStorage.getItem(`nexaneuron-chat-history-${selectedStyle}`);
    if (savedHistoryRaw) {
      try {
        const savedHistory = JSON.parse(savedHistoryRaw);
        if (Array.isArray(savedHistory)) {
          setHistory(savedHistory);
        }
      } catch (error) {
        console.error("Failed to parse chat history from localStorage", error);
        setHistory([]);
      }
    } else {
       setHistory([]); // Clear history if nothing is saved for this style
    }
  }, [selectedStyle]);
  
  useEffect(() => {
    // Save history to localStorage whenever it changes
    const storageKey = `nexaneuron-chat-history-${selectedStyle}`;
    if (history.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [history, selectedStyle]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
   useEffect(() => {
    // Cleanup audio context on unmount
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const removeImage = () => {
    setImage(null);
    if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        // Clean up previous preview
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !image) || loading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }], imagePreview: imagePreview };
    setHistory(prev => [...prev, userMessage]);
    setLoading(true);
    
    const currentPrompt = prompt;
    const currentImage = image;

    setPrompt('');
    removeImage();

    try {
      const result = await geminiService.sendMessageToChat(chatRef.current, currentPrompt, currentImage);
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: result }] };
      setHistory(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] };
      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewChat = () => {
    setHistory([]);
    setPrompt('');
    removeImage();
    if (audioSourceRef.current && audioState.status !== 'idle') {
      audioSourceRef.current.stop();
      setAudioState({ index: null, status: 'idle' });
    }
  };

  const handleCopy = (text: string, type: 'text' | 'code', index: number) => {
    navigator.clipboard.writeText(text);
    const key = `${type}-${index}`;
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleDownload = (text: string, index: number) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `NexaNeuron-chat-${index + 1}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleListen = async (text: string, index: number) => {
    if (audioSourceRef.current && audioState.status !== 'idle') {
      audioSourceRef.current.stop();
      setAudioState({ index: null, status: 'idle' });
      if (audioState.index === index) return;
    }

    setAudioState({ index, status: 'loading' });
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      
      const cleanText = text.replace(/<[^>]*>?/gm, ''); // Remove HTML tags for TTS
      const base64Audio = await geminiService.generateSpeech(cleanText, 'Zephyr');
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      audioSourceRef.current = source;
      
      setAudioState({ index, status: 'playing' });

      source.onended = () => {
        setAudioState({ index: null, status: 'idle' });
        audioSourceRef.current = null;
      };

    } catch (error) {
      console.error("Error generating or playing audio:", error);
      setAudioState({ index: null, status: 'idle' });
    }
  };

  const renderMessageContent = (rawText: string, index: number) => {
    const parts = rawText.split(/(```(?:[\w\d-]*)\n(?:[\s\S]+?)\n```)/g).filter(part => part);

    return parts.map((part, i) => {
        const isCodeBlock = part.startsWith('```') && part.endsWith('```');

        if (isCodeBlock) {
            const codeMatch = part.match(/```(?:[\w\d-]*)\n([\s\S]+?)\n```/);
            const codeContent = codeMatch ? codeMatch[1] : '';
            const langMatch = part.match(/```([\w\d-]*)/);
            const language = langMatch ? langMatch[1] : '';
            
            const canPreview = ['html', 'javascript', 'js', 'css', 'xml', 'svg'].includes(language.toLowerCase());

            return (
                <div key={`${index}-${i}`} className="relative group/code my-2 rounded-lg bg-gray-900/80 dark:bg-black/80 overflow-hidden border border-white/10">
                    <div className="flex justify-between items-center px-4 py-1.5 bg-gray-800/80 dark:bg-gray-900/50 text-xs text-gray-400">
                        <span>{language || 'code'}</span>
                        <div className="flex items-center gap-2">
                            {canPreview && (
                                <button onClick={() => setPreviewCode(codeContent)} className="p-1 hover:text-white rounded" title="Preview Code">
                                    <EyeIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => handleCopy(codeContent, 'code', index)} className="p-1 hover:text-white rounded" title="Copy Code">
                                {copiedStates[`code-${index}`] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div 
                        className="prose dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-4 prose-pre:my-0 text-sm"
                        dangerouslySetInnerHTML={{ __html: geminiService.formatResponse(part) }} 
                    />
                </div>
            )
        } else {
            return (
                <div 
                    key={`${index}-${i}`}
                    className="prose dark:prose-invert max-w-none prose-p:my-2"
                    dangerouslySetInnerHTML={{ __html: geminiService.formatResponse(part) }} 
                />
            )
        }
    });
};

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50">
      {previewCode && <CodePreviewModal code={previewCode} onClose={() => setPreviewCode(null)} />}
      <div className="p-4 flex-shrink-0 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">NexaNeuron Ai</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">Style: <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedStyle}</span></p>
        </div>
        <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Start a new chat"
        >
            <PlusIcon className="w-4 h-4" />
            New Chat
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {history.map((msg, index) => {
          const rawText = msg.parts[0].text;
          
          return (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <Logo className="flex-shrink-0 w-8 h-8" showText={false} />}
              <div className="group flex flex-col items-start gap-1">
                <div className={`px-4 py-3 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none'}`}>
                  {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="User upload" className="rounded-lg mb-2 max-w-xs max-h-48" />
                  )}
                  {rawText && renderMessageContent(rawText, index)}
                </div>

                {msg.role === 'model' && rawText && (
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => handleListen(rawText, index)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Listen">
                      {audioState.index === index && audioState.status === 'loading' && <Spinner size="sm" />}
                      {audioState.index !== index && <SpeakerWaveIcon className="w-4 h-4" />}
                      {audioState.index === index && audioState.status === 'playing' && <div className="w-4 h-4 flex items-center justify-center"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div></div>}
                    </button>
                    <button onClick={() => handleCopy(rawText, 'text', index)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Copy Full Text">
                      {copiedStates[`text-${index}`] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDownload(rawText, index)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Download as .txt">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 dark:bg-gray-700 flex items-center justify-center"><UserIcon /></div>}
            </div>
          )
        })}
        {loading && (
          <div className="flex items-start gap-4">
            <Logo className="flex-shrink-0 w-8 h-8" showText={false} />
            <div className="px-4 py-3 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50">
        {imagePreview && (
          <div className="relative inline-block w-24 h-24 mb-2 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
            <img src={imagePreview} alt="Image preview" className="w-full h-full object-cover rounded-md" />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-gray-100 dark:bg-black rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors focus:outline-none"
              aria-label="Remove image"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="w-full">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-2 gap-1">
                <div className="relative" ref={styleMenuRef}>
                    {isStyleMenuOpen && (
                    <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 p-2 animate-fade-in-down">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white px-2 pb-2">Select a Style</p>
                        {Object.values(chatStyles).map((style) => (
                        <button
                            key={style.name}
                            onClick={() => {
                            setSelectedStyle(style.name);
                            setIsStyleMenuOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-md transition-colors ${selectedStyle === style.name ? 'bg-indigo-600/50 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <p className="font-medium text-gray-900 dark:text-white">{style.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-300">{style.description}</p>
                        </button>
                        ))}
                    </div>
                    )}
                    <button
                    type="button"
                    onClick={() => setIsStyleMenuOpen(prev => !prev)}
                    disabled={loading}
                    className="p-2 text-gray-500 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Select style"
                    >
                    <SparklesIcon />
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    disabled={loading}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="p-2 text-gray-500 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Attach file"
                >
                    <PaperClipIcon />
                </button>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent px-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none"
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    disabled={loading || (!prompt.trim() && !image)} 
                    className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
                    aria-label="Send message"
                >
                    <PaperAirplaneIcon />
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
