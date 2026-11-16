import React from 'react';

/** Props cấu hình phần tiêu đề đầu trang trong giao diện quản trị. */
export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Component hiển thị tiêu đề trang, mô tả ngắn và vùng chứa các nút thao tác bên phải.
 */
export const PageHeader = ({
  title,
  description,
  action,
}: PageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
