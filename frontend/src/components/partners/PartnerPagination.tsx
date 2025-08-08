import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PaginationInfo } from '@/types/partener';

interface PartnerPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  getPageNumbers: () => (number | string)[];
  loading: boolean;
}

export const PartnerPagination = ({
  pagination,
  onPageChange,
  onPreviousPage,
  onNextPage,
  getPageNumbers,
  loading
}: PartnerPaginationProps) => {
  if (loading || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="border-t px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Afișezi {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} din {pagination.totalItems} parteneri
        </div>
        
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onPreviousPage();
                }}
                className={!pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {getPageNumbers().map((pageNum, index) => (
              <PaginationItem key={index}>
                {pageNum === '...' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(Number(pageNum));
                    }}
                    isActive={pageNum === pagination.currentPage}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onNextPage();
                }}
                className={!pagination.hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
