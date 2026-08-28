import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SkeletonRow } from './SkeletonRow';
import { EmptyState } from './EmptyState';
import { Input } from './Input';
import { Button } from './Button';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = 'Search records...',
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filter parameters.',
  onRowClick,
  bulkActions = [],
  initialSortField = '',
  initialSortOrder = 'asc',
  pageSize = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(initialSortField);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [showColMenu, setShowColMenu] = useState(false);

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginate Data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === paginatedData.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(paginatedData.map((row) => row.id));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#EEF1FA] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#EEF1FA]/50 p-3 rounded-full">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            icon={Search}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setShowColMenu(!showColMenu)}
            >
              Columns
            </Button>
            {showColMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EEF1FA] rounded-2xl shadow-xl p-3 z-20 space-y-1">
                <div className="text-[11px] font-bold uppercase text-[#8A8FA3] px-2 py-1">
                  Toggle Columns
                </div>
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#16181D] hover:bg-[#EEF1FA] rounded-full cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key] !== false}
                      onChange={() =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: !prev[col.key],
                        }))
                      }
                      className="accent-[#3B5BFD]"
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedRowIds.length > 0 && (
        <div className="flex items-center justify-between bg-[#3B5BFD]/10 border border-[#3B5BFD]/20 px-5 py-2.5 rounded-full text-xs font-medium text-[#3B5BFD]">
          <span>
            {selectedRowIds.length} item{selectedRowIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => (
              <Button
                key={i}
                variant="secondary"
                size="sm"
                onClick={() => action.onClick(selectedRowIds)}
              >
                {action.label}
              </Button>
            ))}
            <button
              onClick={() => setSelectedRowIds([])}
              className="hover:underline text-xs ml-2 text-[#8A8FA3]"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Table Shell */}
      <div className="overflow-x-auto rounded-2xl border border-[#EEF1FA]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          {/* Table Header */}
          <thead className="bg-[#EEF1FA]/60 text-[#8A8FA3] font-medium border-b border-[#EEF1FA]">
            <tr>
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedData.length > 0 &&
                    selectedRowIds.length === paginatedData.length
                  }
                  onChange={toggleSelectAll}
                  className="accent-[#3B5BFD]"
                />
              </th>
              {columns
                .filter((col) => visibleColumns[col.key] !== false)
                .map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`py-3.5 px-4 uppercase tracking-wider text-[11px] font-bold ${
                      col.sortable !== false ? 'cursor-pointer select-none hover:text-[#16181D]' : ''
                    } ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.header}
                      {col.sortable !== false && (
                        <span>
                          {sortField === col.key ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#3B5BFD]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#3B5BFD]" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-[#8A8FA3]/40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[#EEF1FA]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length + 1} />
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const isSelected = selectedRowIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer hover:bg-[#EEF1FA]/40' : ''
                    } ${isSelected ? 'bg-[#3B5BFD]/5' : ''}`}
                  >
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(row.id, e)}
                        className="accent-[#3B5BFD]"
                      />
                    </td>
                    {columns
                      .filter((col) => visibleColumns[col.key] !== false)
                      .map((col) => (
                        <td
                          key={col.key}
                          className={`py-3.5 px-4 ${col.align === 'right' ? 'text-right' : ''} ${
                            col.mono ? 'font-mono' : ''
                          }`}
                        >
                          {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                        </td>
                      ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#8A8FA3] px-2 py-1 gap-2">
          <div>
            Showing <span className="font-semibold font-mono text-[#16181D]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold font-mono text-[#16181D]">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold font-mono text-[#16181D]">{sortedData.length}</span> entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>

            <span className="font-mono text-xs text-[#16181D] px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
