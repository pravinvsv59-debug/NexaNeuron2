import { GoogleGenAI, Chat, Modality, Part, Type, Content } from '@google/genai';
import { marked } from 'marked';
import { AspectRatio, GroundingSource } from '../types';
import { fileToGenerativePart, decode, pcmToWavBlob } from './utils';

class GeminiService {
  private getAi(forceNew: boolean = false) {
    // For VEO, we need a new instance to pick up the key.
    // This is a simplified approach; a more robust solution would manage this state better.
    if (forceNew) {
      return new GoogleGenAI({ apiKey: process.env.API_KEY! });
    }
    // Standard singleton pattern for other services
    // Note: The global API key from process.env.API_KEY is used here.
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  // CHATBOT
  startChat(model: string, systemInstruction?: string): Chat {
    const ai = this.getAi();
    return ai.chats.create({
      model,
      ...(systemInstruction && { config: { systemInstruction } }),
    });
  }

  async sendMessageToChat(chat: Chat, message: string, image: File | null = null): Promise<string> {
    const parts: Part[] = [];
    if (message.trim()) {
        parts.push({ text: message });
    }
    if (image) {
        const imagePart = await fileToGenerativePart(image);
        parts.push(imagePart);
    }
    const response = await chat.sendMessage({ message: parts });
    return response.text;
  }

  // COMPLEX TASK SOLVER
  async solveComplexTask(prompt: string): Promise<string> {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text;
  }

  // GROUNDED SEARCH
  async groundedSearch(query: string, useMaps: boolean, location: { latitude: number; longitude: number } | null): Promise<{ text: string, sources: GroundingSource[] }> {
    const ai = this.getAi();
    const tools: any[] = [{ googleSearch: {} }];
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }
    
    const config: any = { tools };
    if (useMaps && location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location
        }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config,
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .map((chunk: any) => {
        const source = chunk.web || chunk.maps;
        if (!source || !source.uri) return null;
        return { title: source.title || source.uri, uri: source.uri };
      })
      .filter((s): s is GroundingSource => s !== null);
    
    return { text: response.text, sources };
  }

  // IMAGE ANALYZER
  async analyzeImage(prompt: string, image: File): Promise<string> {
    const ai = this.getAi();
    const imagePart = await fileToGenerativePart(image);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, imagePart] }
    });
    return response.text;
  }

  // IMAGE GENERATOR
  async generateImage(prompt: string, aspectRatio: AspectRatio, numberOfImages: number): Promise<string[]> {
    const ai = this.getAi();
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: numberOfImages,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });
    const imageUrls = response.generatedImages.map(img => {
      const base64ImageBytes: string = img.image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    });
    return imageUrls;
  }

  // LIVE AGENT
  connectLive(callbacks: any) {
    const ai = this.getAi();
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
      }
    });
  }

  // TEXT TO SPEECH
  async generateSpeech(text: string, voice: string): Promise<string> {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");
    return base64Audio;
  }

  async generateSpeechAndGetUrl(text: string, voice: string): Promise<string> {
    const base64Audio = await this.generateSpeech(text, voice);
    const decodedPcm = decode(base64Audio);
    const wavBlob = pcmToWavBlob(decodedPcm, 24000, 1); // TTS is 24kHz, mono
    return URL.createObjectURL(wavBlob);
  }

  // VIDEO PROCESSING
  private async _processVideoToFrames(
    videoSource: File | string,
    onProgress: (p: number) => void,
    frameCount: number = 10
  ): Promise<string[]> {
    const isFile = videoSource instanceof File;
    const videoURL = isFile ? URL.createObjectURL(videoSource) : videoSource as string;

    const videoElement = document.createElement('video');
    if (!isFile) {
        videoElement.crossOrigin = 'anonymous';
    }
    videoElement.src = videoURL;
    
    try {
        await new Promise<void>((resolve, reject) => {
            videoElement.addEventListener('loadedmetadata', () => resolve());
            videoElement.addEventListener('error', () => {
                reject(new Error('Could not load video. This may be due to web security (CORS) restrictions. Try a different URL or upload the file directly.'));
            });
        });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const framePromises: Promise<string>[] = [];
        const duration = videoElement.duration;

        // Ensure duration is valid
        if (duration <= 0 || !isFinite(duration)) {
          throw new Error("Video duration is invalid or could not be determined.");
        }
        
        for (let i = 0; i < frameCount; i++) {
            const time = (duration / frameCount) * i;
            videoElement.currentTime = time;
            
            await new Promise<void>((resolve, reject) => {
                const onSeeked = () => {
                    videoElement.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                videoElement.addEventListener('seeked', onSeeked);
                const onError = () => {
                   videoElement.removeEventListener('error', onError);
                   reject(new Error('Error seeking video to extract frame.'));
                }
                videoElement.addEventListener('error', onError);
            });

            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const framePromise = new Promise<string>((resolve, reject) => {
              canvas.toBlob(blob => {
                  if (!blob) {
                      reject(new Error('Failed to extract video frame, possibly due to CORS policy.'));
                      return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              }, 'image/jpeg');
            });

            framePromises.push(framePromise);
            onProgress(((i + 1) / frameCount) * 50); 
        }

        const base64Frames = await Promise.all(framePromises);
        return base64Frames;
    } finally {
        if (isFile) {
            URL.revokeObjectURL(videoURL);
        }
    }
  }

  async getVideoFrames(videoSource: File | string, frameCount: number = 3): Promise<string[]> {
    // A simplified version of the processing without progress reporting for this use case
    const onProgress = () => {};
    const frames = await this._processVideoToFrames(videoSource, onProgress, frameCount);
    return frames;
  }
  
  async analyzeVideo(prompt: string, videoSource: File | string, onProgress: (p: number) => void): Promise<string> {
    const frames = await this._processVideoToFrames(videoSource, onProgress);
    const parts = [
      { text: prompt },
      ...frames.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }))
    ];
    onProgress(51);
    const response = await this.getAi().models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts }
    });
    onProgress(100);
    return response.text;
  }

  async getVideoAnalysis(
    videoSource: File | string,
    prompt: string,
    onProgress: (p: number) => void,
    responseSchema?: any
  ): Promise<string> {
    const frames = await this._processVideoToFrames(videoSource, onProgress, 15);
    const parts = [
      { text: prompt },
      ...frames.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }))
    ];

    onProgress(51);

    const config: any = {};
    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }
    
    const response = await this.getAi().models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts },
      config,
    });

    onProgress(100);
    return response.text;
  }

  // VIDEO GENERATOR
  async generateVideo(prompt: string, aspectRatio: "16:9" | "9:16", image: File | null, duration: number | null, referenceImages?: string[] | null): Promise<string> {
    const ai = this.getAi(true);

    const hasReferenceImages = referenceImages && referenceImages.length > 0;

    const config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: hasReferenceImages ? '16:9' : aspectRatio,
    };

    if (duration) {
      config.duration = `${duration}s`;
    }
    
    const payload: any = {
        model: hasReferenceImages ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview',
        prompt,
        config,
    };

    if (hasReferenceImages) {
      payload.config.referenceImages = referenceImages.map(imgBase64 => ({
          image: {
              imageBytes: imgBase64,
              mimeType: 'image/jpeg', // Assuming jpeg from our frame extractor
          },
          referenceType: 'ASSET', // Using string literal as type is not imported
      }));
    }

    if (image) { // This is the overlay image
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(image);
        });
        payload.image = {
            imageBytes: base64Data,
            mimeType: image.type,
        };
    }
    
    let operation = await ai.models.generateVideos(payload);
    
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
        throw new Error('Video generation failed or returned no URI.');
    }

    const downloadLink = operation.response.generatedVideos[0].video.uri;
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  }

  // UTILITY
  formatResponse(text: string): string {
    return marked(text, { breaks: true, gfm: true });
  }
}

export const geminiService = new GeminiService();