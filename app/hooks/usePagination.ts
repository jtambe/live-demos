import { useState } from 'react'

export const usePagination = (defaultItemsPerPage = 50) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
  }
}
