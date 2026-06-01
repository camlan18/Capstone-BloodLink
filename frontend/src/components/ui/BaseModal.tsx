import React from 'react';
import { X } from 'lucide-react';

export interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: React.ReactNode;
  size?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | 'full'
    | 'screen';
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  loading?: boolean;
  loadingText?: string;
  cancelText?: string;
  hideFooter?: boolean;
  disableSubmit?: boolean;
  /** Dùng khi mở modal chồng modal (vd. thêm NCC trong popup tạo phiếu CN) */
  zIndexClass?: string;
}

export const BaseModal = ({
  open,
  onOpenChange,
  title,
  subtitle,
  size = 'md',
  children,
  onSubmit,
  submitText = 'Lưu',
  loading = false,
  loadingText = 'Đang xử lý...',
  cancelText = 'Hủy',
  hideFooter = false,
  disableSubmit = false,
  zIndexClass = 'z-50',
}: BaseModalProps) => {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
    screen: 'w-[95vw] h-[95vh]',
  };

  const content = (
    <>
      {/* Body - Có thanh cuộn */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">
        {children}
      </div>

      {/* Footer - Cố định */}
      {!hideFooter && (
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
          >
            {cancelText}
          </button>

          {onSubmit && (
            <button
              type="submit"
              data-enter-submit
              disabled={loading || disableSubmit}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0f4c3a] border border-transparent rounded-sm hover:bg-[#0a3327] disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f4c3a]"
            >
              {loading ? loadingText : submitText}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4`}>
      <div
        className={`
          w-full max-h-[95vh] bg-white rounded-sm shadow-2xl flex flex-col overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
          ${sizeClasses[size]}
        `}
      >
        {/* Header - Cố định */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {title}
            </h2>
            {subtitle && (
              <div className="text-sm text-gray-500 mt-0.5">
                {subtitle}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {onSubmit ? (
          <form
            onSubmit={onSubmit}
            className="flex flex-col flex-1 overflow-hidden min-h-0"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const tag = (e.target as HTMLElement).tagName;
              if (tag === 'TEXTAREA') return;
              if ((e.target as HTMLElement).closest('[data-enter-submit]')) return;
              e.preventDefault();
            }}
          >
            {content}
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
