import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { FilmIcon, SparklesIcon, PhotoIcon, SpeakerWaveIcon, SAMPLE_VIDEOS, ArrowDownTrayIcon } from '../constants';
import Spinner from './Spinner';

const loadingMessages = [
    "Remixing your assets with AI magic...",
    "Consulting the digital director...",
    "Analyzing style reference frames...",
    "Rendering the AI's vision...",
    "Adding cinematic flair...",
    "This can take a few minutes, the result will be worth it...",
    "Finalizing the special effects...",
    "Almost ready for the premiere...",
];

type StyleReference = { type: 'url' | 'file', source: string | File };

const VideoEditor: React.FC = () => {
    // API Key State
    const [hasApiKey, setHasApiKey] = useState(true);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    // Input State
    const [mainVideo, setMainVideo] = useState<File | null>(null);
    const [overlayImage, setOverlayImage] = useState<File | null>(null);
    const [backgroundAudio, setBackgroundAudio] = useState<File | null>(null);
    const [styleReference, setStyleReference] = useState<StyleReference>({ type: 'url', source: SAMPLE_VIDEOS[0].url });
    const [instructions, setInstructions] = useState('Create a short, exciting trailer from my video.');
    
    // Preview State
    const [mainVideoPreview, setMainVideoPreview] = useState<string | null>(null);
    const [overlayImagePreview, setOverlayImagePreview] = useState<string | null>(null);
    const [backgroundAudioPreview, setBackgroundAudioPreview] = useState<string | null>(null);
    const [styleReferencePreview, setStyleReferencePreview] = useState<string | null>(null);

    // Output State
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [outputAudioUrl, setOutputAudioUrl] = useState<string | null>(null);
    
    // Control State
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const checkKey = async () => {
            if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
                try {
                    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                    setHasApiKey(hasKey);
                } catch (e) {
                    console.error("Error checking for API key", e);
                    setHasApiKey(false);
                }
            }
            setIsCheckingKey(false);
        };
        checkKey();
    }, []);

    // Cleanup object URLs on unmount or when files change
    useEffect(() => {
        return () => {
            [mainVideoPreview, overlayImagePreview, backgroundAudioPreview, styleReferencePreview, generatedVideoUrl, outputAudioUrl].forEach(url => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [mainVideoPreview, overlayImagePreview, backgroundAudioPreview, styleReferencePreview, generatedVideoUrl, outputAudioUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'audio' | 'style') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);

            const cleanup = (url: string | null) => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            }

            switch(type) {
                case 'video':
                    setMainVideo(file);
                    cleanup(mainVideoPreview);
                    setMainVideoPreview(previewUrl);
                    break;
                case 'image':
                    setOverlayImage(file);
                    cleanup(overlayImagePreview);
                    setOverlayImagePreview(previewUrl);
                    break;
                case 'audio':
                    setBackgroundAudio(file);
                    cleanup(backgroundAudioPreview);
                    setBackgroundAudioPreview(previewUrl);
                    break;
                case 'style':
                    setStyleReference({ type: 'file', source: file });
                    cleanup(styleReferencePreview);
                    setStyleReferencePreview(previewUrl);
                    break;
            }
        }
    };
    
    const handleSelectSample = (url: string) => {
        if (styleReferencePreview) URL.revokeObjectURL(styleReferencePreview);
        setStyleReferencePreview(null);
        setStyleReference({ type: 'url', source: url });
    }

    const handleSelectKey = async () => {
        if (typeof (window as any).aistudio?.openSelectKey === 'function') {
            try {
                await (window as any).aistudio.openSelectKey();
                setHasApiKey(true);
                setError('');
            } catch (err) {
                console.error("Error opening API key selector:", err);
            }
        }
    };

    const handleSubmit = async () => {
        if (isSubmitDisabled) return;

        setLoading(true);
        if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        if (outputAudioUrl) URL.revokeObjectURL(outputAudioUrl);
        setGeneratedVideoUrl(null);
        setOutputAudioUrl(null);
        setError('');

        const messageInterval = window.setInterval(() => {
            setLoadingMessage(prev => loadingMessages[(loadingMessages.indexOf(prev) + 1) % loadingMessages.length]);
        }, 5000);
        setLoadingMessage(loadingMessages[0]);

        try {
            let videoPromise;

            if (styleReference.type === 'file') {
                const frames = await geminiService.getVideoFrames(styleReference.source as File, 3);
                videoPromise = geminiService.generateVideo(instructions, "16:9", overlayImage, null, frames);
            } else {
                const selectedSample = SAMPLE_VIDEOS.find(v => v.url === styleReference.source);
                const stylePrompt = `The style should be similar to a video of ${selectedSample?.name.toLowerCase()}.`;
                const finalPrompt = `${instructions}. ${stylePrompt}`;
                videoPromise = geminiService.generateVideo(finalPrompt, "16:9", overlayImage, null, null);
            }
            
            if (backgroundAudio) {
                setOutputAudioUrl(URL.createObjectURL(backgroundAudio));
            }

            const newVideoUrl = await videoPromise;
            setGeneratedVideoUrl(newVideoUrl);

        } catch (err) {
            let errorMessage = 'An error occurred during generation.';
            if (err instanceof Error && err.message.includes('Requested entity was not found')) {
                errorMessage = 'API Key error. Please re-select your API key and try again.';
                setHasApiKey(false);
            }
            console.error(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
            clearInterval(messageInterval);
        }
    };
    
    const isSubmitDisabled = loading || isCheckingKey || !hasApiKey || !mainVideo || !instructions.trim();

    const AssetUploader: React.FC<{
        title: string;
        Icon: React.FC<{ className?: string }>;
        preview: string | null;
        file: File | null;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        accept: string;
        id: string;
    }> = ({ title, Icon, preview, file, onChange, accept, id }) => (
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
            <label htmlFor={id} className="cursor-pointer">
                <div className="h-24 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors text-center text-gray-400">
                    {preview ? (
                        accept.startsWith('video') ? <video src={preview} className="h-full w-full object-contain p-1" muted loop autoPlay /> :
                        accept.startsWith('image') ? <img src={preview} alt="preview" className="h-full w-full object-contain p-1" /> :
                        accept.startsWith('audio') ? <audio src={preview} controls className="w-full p-2" /> : null
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <Icon className="w-6 h-6" />
                            <span className="text-xs font-semibold">{title}</span>
                        </div>
                    )}
                </div>
            </label>
            <input id={id} type="file" accept={accept} className="hidden" onChange={onChange} disabled={loading} />
            {file && <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-300 truncate px-1">{file.name}</p>}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Video Remixer</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300">Combine your assets to create a new video with Veo</p>
            </div>
            
            {!isCheckingKey && !hasApiKey && (
                 <div className="bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 px-4 py-3 rounded-lg relative text-center space-y-3" role="alert">
                    <p><strong className="font-bold">API Key Required:</strong> Select an API key to use the Veo video generator.</p>
                     <button onClick={handleSelectKey} className="px-6 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105">
                         Select API Key
                     </button>
                 </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column: Inputs */}
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">1. Select or Upload a Style Reference</label>
                        <div className="grid grid-cols-4 gap-2">
                             <div className="col-span-3 grid grid-cols-3 gap-2">
                                {SAMPLE_VIDEOS.map(sample => (
                                    <button
                                        key={sample.name}
                                        onClick={() => handleSelectSample(sample.url)}
                                        className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 shadow-md transform hover:scale-105 ${
                                            styleReference.type === 'url' && styleReference.source === sample.url
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-1 ring-white/20 shadow-lg'
                                            : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {sample.name}
                                    </button>
                                ))}
                             </div>
                             <div className={`p-1 rounded-lg ${styleReference.type === 'file' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-200 dark:bg-gray-800'}`}>
                                <AssetUploader title="Upload Style" Icon={FilmIcon} preview={styleReferencePreview} file={styleReference.type === 'file' ? styleReference.source as File : null} onChange={(e) => handleFileChange(e, 'style')} accept="video/*" id="style-video-upload" />
                             </div>
                        </div>
                        {styleReference.type === 'file' && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">Note: Using an uploaded style reference will generate a 16:9 video.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">2. Upload Your Assets</label>
                        <div className="grid grid-cols-3 gap-2">
                           <AssetUploader title="Main Video" Icon={FilmIcon} preview={mainVideoPreview} file={mainVideo} onChange={(e) => handleFileChange(e, 'video')} accept="video/*" id="main-video-upload" />
                           <AssetUploader title="Overlay Image" Icon={PhotoIcon} preview={overlayImagePreview} file={overlayImage} onChange={(e) => handleFileChange(e, 'image')} accept="image/*" id="overlay-image-upload" />
                           <AssetUploader title="Background Audio" Icon={SpeakerWaveIcon} preview={backgroundAudioPreview} file={backgroundAudio} onChange={(e) => handleFileChange(e, 'audio')} accept="audio/*" id="audio-upload" />
                        </div>
                         <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">Main Video is required. Image & Audio are optional.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">3. Write Editing Instructions</label>
                        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g., Make a cinematic trailer..." className="w-full h-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
                    >
                        {loading ? <Spinner /> : <SparklesIcon />}
                        {loading ? 'Remixing Video...' : 'Generate Remix'}
                    </button>
                </div>
                
                {/* Right Column: Output */}
                <div className="h-full min-h-[300px] lg:min-h-0 bg-gray-50/80 dark:bg-black/50 rounded-lg p-4 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center justify-center text-center">
                    {loading && (
                        <div>
                            <Spinner size='lg' />
                            <p className="mt-4 text-gray-900 dark:text-white">{loadingMessage}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">(Video generation can take several minutes)</p>
                        </div>
                    )}
                     {!loading && generatedVideoUrl && (
                        <div className="w-full max-w-md mx-auto space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Generated Video:</h3>
                                <video src={generatedVideoUrl} className="w-full object-contain rounded-lg" controls autoPlay loop/>
                                <a href={generatedVideoUrl} download="remixed-video.mp4" className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors">
                                    <ArrowDownTrayIcon /> Download Video
                                </a>
                            </div>
                            {outputAudioUrl && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Your Audio:</h3>
                                    <audio src={outputAudioUrl} controls className="w-full" />
                                    <a href={outputAudioUrl} download={`background-audio.${backgroundAudio?.name.split('.').pop()}`} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors">
                                        <ArrowDownTrayIcon /> Download Audio
                                    </a>
                                </div>
                            )}
                            {outputAudioUrl && <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">Note: Video and audio are separate. Download both and combine them in a video editor.</p>}
                        </div>
                    )}
                    {!loading && !generatedVideoUrl && <p className="text-gray-500 dark:text-gray-500">Your remixed video will appear here.</p>}
                    {error && <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;