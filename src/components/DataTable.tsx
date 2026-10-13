import type { ReactNode } from 'react'

export type TableColumn<T> = {
  key: string
  heading: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyTitle: string
  emptyMessage: string
  loading: boolean
  error?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle,
  emptyMessage,
  loading,
  error,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="table-state" role="status" aria-live="polite">
        <span className="loading-spinner" />
        <strong>Loading records</strong>
        <p>Please wait while the data is prepared.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="table-state table-error" role="alert">
        <span className="state-icon">!</span>
        <strong>Unable to load records</strong>
        <p>{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="table-state">
        <span className="state-icon state-empty" aria-hidden="true">⌕</span>
        <strong>{emptyTitle}</strong>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
