import React, { useRef, useState } from 'react';
import { BaseModal } from './BaseModal';
import { Button } from './button';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onImport: (file: File) => Promise<void>;
  onDownloadTemplate: () => void;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  title,
  onImport,
  onDownloadTemplate
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      setUploading(true);
      await onImport(file);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} size="md" hideFooter={true}>
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Tải file mẫu (Template)</p>
              <p className="text-blue-600">Sử dụng file mẫu để nhập dữ liệu chính xác</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
            onClick={onDownloadTemplate}
          >
            <Download className="w-4 h-4 mr-2" />
            Tải mẫu
          </Button>
        </div>

        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-blood bg-red-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          
          <div className="mx-auto w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4">
            <Upload className={`w-6 h-6 ${file ? 'text-blood' : 'text-slate-400'}`} />
          </div>
          
          {file ? (
            <div>
              <p className="text-base font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <p className="text-sm text-blood font-medium mt-3">Nhấn để chọn file khác</p>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium text-slate-800">Kéo thả file Excel vào đây</p>
              <p className="text-sm text-slate-500 mt-1">hoặc nhấn để chọn từ máy tính</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
            Hủy bỏ
          </Button>
          <Button 
            className="bg-blood hover:bg-blood-deep text-white" 
            disabled={!file || uploading}
            onClick={handleSubmit}
          >
            {uploading ? 'Đang xử lý...' : 'Nhập dữ liệu'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
