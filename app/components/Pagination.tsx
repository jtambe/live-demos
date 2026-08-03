import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalPages <= 1) return null

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onItemsPerPageChange) {
      onItemsPerPageChange(parseInt(e.target.value))
    }
  }

  return (
    <div className={styles.pagination}>
      <div className={styles.itemsPerPageControl}>
        <label htmlFor="pagination-items">Show per page:</label>
        <select
          id="pagination-items"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className={styles.itemsSelect}
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className={styles.navButton}
      >
        ← Previous
      </button>

      <div className={styles.pageNumbers}>
        {getPageNumbers().map((page, idx) => (
          <button
            key={idx}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`${styles.pageButton} ${
              page === currentPage ? styles.active : ''
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={styles.navButton}
      >
        Next →
      </button>

      <div className={styles.info}>
        Page {currentPage} of {totalPages} ({totalItems} total)
      </div>
    </div>
  )
}
