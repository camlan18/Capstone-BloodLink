import React from 'react';
import { BaseModal } from '@/components/ui/BaseModal';
import { BloodRequestDetailContent } from './BloodRequestDetailContent';

interface BloodRequestDetailModalProps {
  requestCode: string | null;
  isOpen: boolean;
  onClose: () => void;
  zIndexClass?: string;
}

export const BloodRequestDetailModal: React.FC<BloodRequestDetailModalProps> = ({
  requestCode,
  isOpen,
  onClose,
  zIndexClass = 'z-[10002]'
}) => {
  if (!isOpen) return null;

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={onClose}
      title="Chi tiết Yêu cầu máu Khẩn cấp"
      subtitle={requestCode ? `Mã yêu cầu: ${requestCode}` : ''}
      size="2xl"
      hideFooter
      zIndexClass={zIndexClass}
    >
      <BloodRequestDetailContent requestCode={requestCode} />
      <div className="pt-2">
         <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-sm transition-colors">
            Đóng
         </button>
      </div>
    </BaseModal>
  );
};
