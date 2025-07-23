/**
 * Professional Table Component
 * 
 * Elegant, accessible, and highly customizable table components
 * with modern design patterns and comprehensive functionality.
 */

import * as React from 'react';
import { VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';

// =================================
// Table Variants & Styles
// =================================

const tableVariants = cva(
  'relative w-full border-collapse overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border border-slate-200 rounded-xl shadow-sm bg-white',
        minimal: 'border-0 bg-transparent',
        bordered: 'border-2 border-slate-300 rounded-lg',
        striped: 'border border-slate-200 rounded-xl shadow-sm bg-white [&_tbody_tr:nth-child(even)]:bg-slate-50/50',
        modern: 'border-0 rounded-2xl shadow-lg bg-white ring-1 ring-slate-200/50',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
      density: {
        compact: '[&_td]:py-2 [&_th]:py-2',
        default: '[&_td]:py-3 [&_th]:py-3',
        comfortable: '[&_td]:py-4 [&_th]:py-4',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      density: 'default',
    },
  }
);

const headerVariants = cva(
  'border-b font-medium text-left transition-colors',
  {
    variants: {
      variant: {
        default: 'border-slate-200 bg-slate-50/50 text-slate-700',
        minimal: 'border-slate-200 bg-transparent text-slate-600',
        modern: 'border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-800',
        dark: 'border-slate-700 bg-slate-800 text-slate-200',
      }
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// =================================
// Core Table Components
// =================================

interface TableProps 
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  stickyHeader?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, size, density, stickyHeader, ...props }, ref) => (
    <div className="relative overflow-auto">
      <table
        ref={ref}
        className={cn(
          tableVariants({ variant, size, density }),
          stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10',
          className
        )}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & VariantProps<typeof headerVariants>
>(({ className, variant, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(headerVariants({ variant }), className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      'divide-y divide-slate-200 [&_tr:last-child]:border-0',
      className
    )}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-slate-200 bg-slate-50/50 font-medium text-slate-700',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    hover?: boolean;
    selected?: boolean;
  }
>(({ className, hover = true, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'transition-colors border-b border-slate-200',
      hover && 'hover:bg-slate-50/50',
      selected && 'bg-blue-50/50 hover:bg-blue-50/70',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: () => void;
  }
>(({ className, sortable, sortDirection, onSort, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-4 py-3 text-left font-semibold text-slate-700 select-none',
      sortable && 'cursor-pointer hover:bg-slate-100/80 transition-colors',
      className
    )}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    <div className="flex items-center gap-2 group">
      <span className="truncate">{children}</span>
      {sortable && (
        <div className="flex-shrink-0 w-4 h-4 text-slate-400 group-hover:text-slate-600">
          {sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronsUpDown className="w-4 h-4" />
          )}
        </div>
      )}
    </div>
  </th>
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    truncate?: boolean;
    numeric?: boolean;
  }
>(({ className, truncate, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-3 text-slate-600',
      truncate && 'truncate max-w-0',
      numeric && 'text-right tabular-nums',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      'mt-4 text-sm text-slate-500 text-center',
      className
    )}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

// =================================
// Advanced Table Components
// =================================

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  children: React.ReactNode;
}

const SortableTableHead = React.forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ sortKey, currentSort, onSort, children, className, ...props }, ref) => {
    const isActive = currentSort?.key === sortKey;
    const direction = isActive ? currentSort.direction : null;

    return (
      <TableHead
        ref={ref}
        className={cn(
          'group cursor-pointer select-none hover:bg-slate-100/80',
          isActive && 'bg-slate-100/60',
          className
        )}
        onClick={() => onSort(sortKey)}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-slate-700 group-hover:text-slate-900">
            {children}
          </span>
          <div className="flex-shrink-0 w-4 h-4 text-slate-400 group-hover:text-slate-600">
            {direction === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : direction === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </TableHead>
    );
  }
);
SortableTableHead.displayName = 'SortableTableHead';

interface SelectableTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  disabled?: boolean;
}

const SelectableTableRow = React.forwardRef<HTMLTableRowElement, SelectableTableRowProps>(
  ({ selected, onSelect, disabled, className, children, ...props }, ref) => (
    <TableRow
      ref={ref}
      className={cn(
        'group',
        selected && 'bg-blue-50/50 hover:bg-blue-50/70',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
      onClick={!disabled && onSelect ? () => onSelect(!selected) : undefined}
      {...props}
    >
      {children}
    </TableRow>
  )
);
SelectableTableRow.displayName = 'SelectableTableRow';

const TableActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'left' | 'center' | 'right';
  }
>(({ className, align = 'right', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-2',
      align === 'left' && 'justify-start',
      align === 'center' && 'justify-center',
      align === 'right' && 'justify-end',
      className
    )}
    {...props}
  />
));
TableActions.displayName = 'TableActions';

// =================================
// Table State Components
// =================================

const TableEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
  }
>(({ className, icon, title, description, action, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      className
    )}
    {...props}
  >
    {icon && (
      <div className="w-12 h-12 mb-4 text-slate-400 flex items-center justify-center">
        {icon}
      </div>
    )}
    {title && (
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        {title}
      </h3>
    )}
    {description && (
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {description}
      </p>
    )}
    {action && action}
  </div>
));
TableEmpty.displayName = 'TableEmpty';

const TableLoading = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    rows?: number;
    columns?: number;
  }
>(({ className, rows = 5, columns = 4, ...props }, ref) => (
  <div ref={ref} className={cn('animate-pulse', className)} {...props}>
    <Table variant="minimal">
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: columns }).map((_, j) => (
              <TableCell key={j}>
                <div className="h-4 bg-slate-200 rounded w-full max-w-[120px]"></div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
));
TableLoading.displayName = 'TableLoading';

// =================================
// Pagination Component
// =================================

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

const TablePagination = React.forwardRef<HTMLDivElement, TablePaginationProps>(
  ({ 
    currentPage, 
    totalPages, 
    pageSize, 
    totalItems, 
    onPageChange, 
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSizeSelector = true,
    showPageInfo = true,
    className,
    ...props 
  }, ref) => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const left = Math.max(1, currentPage - delta);
      const right = Math.min(totalPages, currentPage + delta);

      for (let i = left; i <= right; i++) {
        range.push(i);
      }

      return range;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-6">
          {showPageInfo && (
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </div>
          )}
          
          {showPageSizeSelector && onPageSizeChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="text-sm border border-slate-300 rounded px-2 py-1 bg-white"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'px-3 py-1 text-sm border rounded',
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 hover:bg-slate-50'
              )}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    );
  }
);
TablePagination.displayName = 'TablePagination';

// =================================
// Exports
// =================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SortableTableHead,
  SelectableTableRow,
  TableActions,
  TableEmpty,
  TableLoading,
  TablePagination,
  tableVariants,
  type TableProps,
  type SortableTableHeadProps,
  type SelectableTableRowProps,
  type TablePaginationProps,
};