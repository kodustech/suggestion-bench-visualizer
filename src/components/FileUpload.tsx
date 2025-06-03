'use client';

import { useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  accept: string;
  label: string;
  description: string;
  loading?: boolean;
}

export default function FileUpload({ 
  onFileContent, 
  accept, 
  label, 
  description,
  loading = false 
}: FileUploadProps) {
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileContent(content, file.name);
    };
    reader.readAsText(file);
  }, [onFileContent]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          loading 
            ? 'border-blue-300 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        )}
      >
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-600 font-medium">Processando arquivo...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <Upload className="w-12 h-12 text-gray-400" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {label}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {description}
                </p>
                
                <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                  <File className="w-4 h-4 mr-2" />
                  Escolher arquivo
                  <input
                    type="file"
                    accept={accept}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
                
                <p className="text-xs text-gray-500 mt-3">
                  Ou arraste e solte o arquivo aqui
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 