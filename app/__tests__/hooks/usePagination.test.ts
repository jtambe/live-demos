/**
 * Tests for usePagination hook
 */
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '@/hooks/usePagination'

describe('usePagination Hook', () => {
  it('should initialize with default items per page of 50', () => {
    const { result } = renderHook(() => usePagination())

    expect(result.current.currentPage).toBe(1)
    expect(result.current.itemsPerPage).toBe(50)
  })

  it('should initialize with custom items per page', () => {
    const { result } = renderHook(() => usePagination(25))

    expect(result.current.currentPage).toBe(1)
    expect(result.current.itemsPerPage).toBe(25)
  })

  it('should change current page using setCurrentPage', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.setCurrentPage(3)
    })

    expect(result.current.currentPage).toBe(3)
  })

  it('should handle page navigation with handlePageChange', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.handlePageChange(5)
    })

    expect(result.current.currentPage).toBe(5)
  })

  it('should change items per page and reset to page 1', () => {
    const { result } = renderHook(() => usePagination(50))

    // Go to page 3
    act(() => {
      result.current.setCurrentPage(3)
    })
    expect(result.current.currentPage).toBe(3)

    // Change items per page
    act(() => {
      result.current.handleItemsPerPageChange(25)
    })

    expect(result.current.itemsPerPage).toBe(25)
    expect(result.current.currentPage).toBe(1) // Should reset to page 1
  })

  it('should use setItemsPerPage without resetting page', () => {
    const { result } = renderHook(() => usePagination(50))

    act(() => {
      result.current.setCurrentPage(3)
    })

    act(() => {
      result.current.setItemsPerPage(100)
    })

    expect(result.current.itemsPerPage).toBe(100)
    expect(result.current.currentPage).toBe(3) // Page should not reset
  })

  it('should support multiple items per page values', () => {
    const { result } = renderHook(() => usePagination(10))

    expect(result.current.itemsPerPage).toBe(10)

    act(() => {
      result.current.setItemsPerPage(25)
    })
    expect(result.current.itemsPerPage).toBe(25)

    act(() => {
      result.current.setItemsPerPage(50)
    })
    expect(result.current.itemsPerPage).toBe(50)

    act(() => {
      result.current.setItemsPerPage(100)
    })
    expect(result.current.itemsPerPage).toBe(100)
  })

  it('should handle rapid page changes', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.handlePageChange(1)
      result.current.handlePageChange(5)
      result.current.handlePageChange(10)
    })

    expect(result.current.currentPage).toBe(10)
  })

  it('should allow setting page to 0 or negative (caller responsibility)', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.setCurrentPage(0)
    })

    expect(result.current.currentPage).toBe(0)
  })
})
