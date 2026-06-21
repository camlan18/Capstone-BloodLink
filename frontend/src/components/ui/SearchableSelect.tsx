import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  renderValue?: React.ReactNode;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Chọn một tùy chọn',
  searchPlaceholder = 'Tìm kiếm...',
  className,
  triggerClassName,
  renderValue,
  disabled
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    // Normalize string to remove accents for better searching in Vietnamese
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedSearch = normalize(search);
    
    return options.filter(opt => 
      normalize(opt.label).includes(normalizedSearch) || 
      opt.label.toLowerCase().includes(lowerSearch)
    );
  }, [options, search]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <Select value={value} onValueChange={(val) => onValueChange(val as string)} disabled={disabled}>
      <SelectTrigger className={triggerClassName}>
        {renderValue ? renderValue : (
          selectedOption ? (
            <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1 items-center gap-1.5">{selectedOption.label}</span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )
        )}
      </SelectTrigger>
      <SelectContent className={className}>
        <div 
          className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10" 
          onKeyDown={e => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 h-9 text-sm focus-visible:ring-1 focus-visible:ring-blood/50"
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filteredOptions.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Không tìm thấy kết quả.
          </div>
        ) : (
          filteredOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
