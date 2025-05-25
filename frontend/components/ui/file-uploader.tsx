'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, FileText, Table, Image, FileIcon, Plus } from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  compact?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return <Table className="w-4 h-4 text-green-600" />;
    case 'xlsx':
    case 'xls':
      return <Table className="w-4 h-4 text-green-700" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <Image className="w-4 h-4 text-blue-600" />;
    case 'txt':
    case 'md':
      return <FileText className="w-4 h-4 text-gray-600" />;
    default:
      return <FileIcon className="w-4 h-4 text-gray-500" />;
  }
};

export function FileUploader({ files, onFilesAdd, onFileRemove, compact = false }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    onFilesAdd(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    onFilesAdd(selectedFiles);
    
    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact Upload Area */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg transition-all
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <Plus className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Add files</span>
          </button>
          
          <span className="text-xs text-gray-500">
            CSV, XLSX files supported
          </span>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Compact File List */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200 text-sm"
              >
                {getFileIcon(file.name)}
                <span className="truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => onFileRemove(file.id)}
                  className="hover:bg-gray-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Regular Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          <span className="font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">
          CSV, XLSX files supported
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Regular File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => onFileRemove(file.id)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 