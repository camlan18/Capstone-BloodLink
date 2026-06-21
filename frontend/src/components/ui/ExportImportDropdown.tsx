import React from 'react';
import { MoreHorizontal, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './dropdown-menu';

interface ExportImportDropdownProps {
  onImportClick: () => void;
  onExportClick: () => void;
  onDownloadTemplateClick?: () => void;
}

export function ExportImportDropdown({
  onImportClick,
  onExportClick,
  onDownloadTemplateClick
}: ExportImportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" className="bg-white border-slate-200 text-slate-700 shadow-sm rounded-md px-3 hover:bg-slate-50">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      } />
      
      <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg p-1 rounded-md">
        <DropdownMenuItem onClick={onImportClick} className="cursor-pointer py-2 px-3 hover:bg-slate-50">
          <Upload className="w-4 h-4 mr-2 text-slate-500" />
          <span>Nhập dữ liệu</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onExportClick} className="cursor-pointer py-2 px-3 hover:bg-slate-50">
          <Download className="w-4 h-4 mr-2 text-slate-500" />
          <span>Xuất dữ liệu</span>
        </DropdownMenuItem>
        
        {onDownloadTemplateClick && (
          <>
            <DropdownMenuSeparator className="bg-slate-100 my-1" />
            <DropdownMenuItem onClick={onDownloadTemplateClick} className="cursor-pointer py-2 px-3 hover:bg-slate-50">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
              <span>Tải file mẫu</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
