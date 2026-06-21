import React from 'react';
import { BaseModal } from '@/components/ui/BaseModal';
import { AlertCircle, Trash2, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-8 h-8 text-red-500 mb-2" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500 mb-2" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'px-5 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-sm hover:bg-red-700 disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600';
      case 'warning':
        return 'px-5 py-2.5 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-sm hover:bg-amber-700 disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600';
      case 'info':
        return 'px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-sm hover:bg-blue-700 disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600';
    }
  };

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={onClose}
      title={title}
      size="sm"
      submitText={confirmText}
      cancelText={cancelText}
      loading={isLoading}
      loadingText="Đang xử lý..."
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
      submitBtnClass={getButtonClass()}
    >
      <div className="flex flex-col items-center text-center py-4">
        {getIcon()}
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </BaseModal>
  );
}
