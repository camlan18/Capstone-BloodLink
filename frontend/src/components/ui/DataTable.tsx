import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react';

export interface Column<T> {
  key: string;
  title?: string;
  label?: string;
  sortable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  hidden?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  totalRecords: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  keyword: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  itemName?: string;
  selectable?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearch: (keyword: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc' | undefined) => void;
  toolbarFilters?: React.ReactNode;
  rowActions?: (item: T) => ActionItem[];
  // Selection
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  totalRecords,
  loading,
  page,
  pageSize,
  keyword,
  sortBy,
  sortDirection,
  itemName = 'dữ liệu',
  selectable = false,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort,
  toolbarFilters,
  rowActions,
  selectedIds = [],
  onSelectionChange
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState(keyword);
  const [goToPage, setGoToPage] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.filter(c => !c.defaultHidden).map(c => c.key));
  
  // State quản lý Menu Action của từng dòng
  const [actionMenu, setActionMenu] = useState<{ item: T; x: number; y: number } | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  const safeData = data || [];

  // Đóng column menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đóng action menu khi cuộn chuột để tránh menu bị trôi
  useEffect(() => {
    const handleScroll = () => setActionMenu(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const totalPages = Math.ceil(totalRecords / pageSize);
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortBy === key) {
      if (sortDirection === 'asc') onSort(key, 'desc');
      else if (sortDirection === 'desc') onSort(key, undefined);
      else onSort(key, 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const renderSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown className="h-4 w-4 text-gray-400 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4 text-[#0f4c3a]" />;
    return <ArrowDown className="h-4 w-4 text-[#0f4c3a]" />;
  };

  const activeColumns = columns.filter(col => visibleColumns.includes(col.key) && col.key !== 'actions');

  const generatePagination = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      const allIds = data.map(item => item.id).filter(id => !!id);
      onSelectionChange(Array.from(new Set([...selectedIds, ...allIds])));
    } else {
      const currentIds = data.map(item => item.id);
      onSelectionChange(selectedIds.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  const isAllSelected = safeData.length > 0 && safeData.every(item => selectedIds.includes(item.id));
  const isSomeSelected = safeData.some(item => selectedIds.includes(item.id)) && !isAllSelected;

  return (
    <div className="w-full bg-white flex flex-col relative">
      {/* ----------------- ACTION MENU POPUP (PORTAL-LIKE) ----------------- */}
      {actionMenu && rowActions && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-[101] bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: actionMenu.y + 4, right: window.innerWidth - actionMenu.x }}
          >
            {rowActions(actionMenu.item).filter(a => !a.hidden).map((action, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setActionMenu(null);
                }}
                className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${action.className || 'text-gray-700'}`}
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ----------------- TOOLBAR ----------------- */}
      <div className="flex flex-col xl:flex-row items-start justify-between p-4 gap-4 border-b border-gray-100">
        <div className="relative w-full xl:w-80 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block h-11 w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md text-sm placeholder-slate-400 focus:outline-none focus:border-blood focus:ring-1 focus:ring-blood transition-all bg-white"
            placeholder="Tìm kiếm..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchValue)}
          />
        </div>

        <div className="flex items-start gap-2 w-full xl:w-auto flex-wrap justify-end">
          {toolbarFilters}   
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`h-11 w-11 border rounded-md transition-colors flex items-center justify-center ${
                showColumnMenu ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
            
            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  Hiển thị cột
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {columns.filter(c => c.hideable !== false && (c.title || c.label)).map(col => (
                    <label 
                      key={col.key} 
                      className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-blood focus:ring-blood cursor-pointer"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span className="text-sm font-medium text-gray-700 select-none">{col.title || col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- TABLE DATA ----------------- */}
      <div className="overflow-x-auto min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blood"></div>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-xs text-gray-500 font-semibold border-b border-gray-200 uppercase">
              <tr>
                {selectable && (
                  <th className="px-4 py-4 w-12 text-center whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blood focus:ring-blood cursor-pointer" 
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                
                {/* ---------------- CỘT STT ---------------- */}
                <th className="px-4 py-4 w-16 text-center whitespace-nowrap">
                  STT
                </th>

                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-4 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-50' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.title || col.label}
                      {col.sortable && renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
                
                {/* Cột Actions (Ghim cố định bên phải) */}
                {rowActions && (
                  <th className="px-4 py-4 text-center whitespace-nowrap sticky right-0 bg-white z-10 w-16">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {safeData.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50 transition-colors group">
                  {selectable && (
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blood focus:ring-blood cursor-pointer" 
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}

                  {/* ---------------- RENDER STT ---------------- */}
                  <td className="px-4 py-4 text-center text-gray-500 whitespace-nowrap font-medium">
                    {(page - 1) * pageSize + index + 1}
                  </td>

                  {activeColumns.map((col) => (
                    <td key={`${item.id || index}-${col.key}`} className="px-4 py-4 text-gray-700 whitespace-nowrap">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  
                  {/* Cột Nút Action (Ghim cố định) */}
                  {rowActions && (
                    <td className="px-4 py-4 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10">
                      {rowActions(item).filter(a => !a.hidden).length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActionMenu({ item, x: rect.right, y: rect.bottom });
                          }}
                          className="p-1.5 text-gray-500 hover:text-blood hover:bg-gray-100 rounded-md transition-colors focus:outline-none"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {safeData.length === 0 && (
                <tr>
                  {/* +1 cho cột STT mới thêm */}
                  <td colSpan={activeColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0) + 1} className="px-4 py-12 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ----------------- PAGINATION ----------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 gap-4 text-sm text-gray-600">
        <div className="flex flex-wrap items-center gap-3">
          <span>Hiển thị {startRecord} đến {endRecord} trong {totalRecords} {itemName}</span>
          <select
            className="border border-gray-200 rounded-md text-sm px-2 py-1 bg-white focus:outline-none focus:border-[#0f4c3a]"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {generatePagination().map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === 'number' ? onPageChange(p) : null}
                className={`w-8 h-8 flex items-center justify-center rounded border ${
                  p === page 
                    ? 'border-[#0f4c3a] bg-[#0f4c3a] text-white' 
                    : p === '...' 
                      ? 'border-transparent cursor-default' 
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span>Đến trang</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const p = Number(goToPage);
                  if (p >= 1 && p <= totalPages) onPageChange(p);
                  setGoToPage('');
                }
              }}
              className="w-12 px-2 py-1 text-center border border-gray-200 rounded focus:outline-none focus:border-[#0f4c3a]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
