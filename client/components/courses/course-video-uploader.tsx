'use client';

import { useRef, useState } from 'react';

interface CourseVideoUploaderProps {
  onUploadComplete: (videoUrl: string) => void;
  moduleIndex?: number;
  lessonIndex?: number;
}

export default function CourseVideoUploader({ 
  onUploadComplete, 
  moduleIndex, 
  lessonIndex 
}: CourseVideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a video file.');
      return;
    }
    
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const urlResponse = await fetch(
        `/api/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`
      );
      
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(`Failed to get upload URL: ${errorData.error || urlResponse.statusText}`);
      }
      
      const { uploadUrl, publicUrl } = await urlResponse.json();
      
      const uploadResponse = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(null, { status: xhr.status }));
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };
        xhr.send(file);
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      setVideoUrl(publicUrl);
      onUploadComplete(publicUrl);
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="video-upload" className="text-sm font-medium">
          Select video file {moduleIndex !== undefined && lessonIndex !== undefined && 
            `for Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}`
          }
        </label>
        <input 
          id="video-upload"
          type="file" 
          accept="video/*" 
          ref={inputRef}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          disabled={uploading}
        />
      </div>
      
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {uploading ? 'Uploading…' : 'Upload Video'}
      </button>
      
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Upload progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {videoUrl && !error && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-green-800 dark:text-green-200">
          <p className="font-medium">Video uploaded successfully!</p>
        </div>
      )}
    </div>
  );
} 