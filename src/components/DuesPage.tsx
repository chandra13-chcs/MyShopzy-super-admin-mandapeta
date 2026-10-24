import { useEffect, useMemo, useState } from 'react'
import { DataTable } from './DataTable'
import type { TableColumn } from './DataTable'
import { isDemoMode } from '../config/env'
import { confirmDue, listDues, recordDuePayment, waiveDue } from '../services/api/dues'
import type { Due, DueStatus } from '../services/api/dues'

const statusLabels: Record<DueStatus, string> = {
  'pending-review': 'Pending review',
  confirmed: 'Confirmed',
  waived: 'Waived',
  paid: 'Paid',
}

function formatAmount(amountMinor: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amountMinor / 100)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

export function DuesPage() {
  const [dues, setDues] = useState<Due[]>([])
  const [selectedDueId, setSelectedDueId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    void listDues().then((rows) => {
      if (cancelled) return
      setDues(rows)
      setSelectedDueId((current) => rows.some((due) => due.dueId === current) ? current : rows[0]?.dueId ?? '')
      setLoading(false)
    }).catch((error: unknown) => {
      if (cancelled) return
      setLoadError(getErrorMessage(error))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  const selectedDue = useMemo(
    () => dues.find((due) => due.dueId === selectedDueId) ?? null,
    [dues, selectedDueId],
  )

  async function applyAction(action: () => Promise<Due>) {
    setActionError('')
    setBusy(true)
    try {
      const updatedDue = await action()
      setDues((current) => current.map((due) => due.dueId === updatedDue.dueId ? updatedDue : due))
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm(due: Due) {
    if (!window.confirm(`Confirm the ${formatAmount(due.amountMinor)} due for ${due.customerName}?`)) return
    void applyAction(() => confirmDue(due.dueId))
  }

  function handleWaive(due: Due) {
    const promptedReason = window.prompt('Enter the reason for waiving this due:')
    if (promptedReason === null) return
    const reason = promptedReason.trim()
    if (!reason) {
      setActionError('A reason is required to waive a due.')
      return
    }
    if (!window.confirm(`Waive the ${formatAmount(due.amountMinor)} due for ${due.customerName}?`)) return
    void applyAction(() => waiveDue(due.dueId, reason))
  }

  function handleRecordPayment(due: Due) {
    const rawAmount = window.prompt(`Enter payment amount in rupees (remaining due: ${formatAmount(due.amountMinor)}):`)
    if (rawAmount === null) return
    const amountParts = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rawAmount.trim())
    const amountMinor = amountParts
      ? Number(amountParts[1]) * 100 + Number((amountParts[2] ?? '').padEnd(2, '0'))
      : Number.NaN
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setActionError('Enter a valid payment amount greater than zero.')
      return
    }

    const promptedReference = window.prompt('Enter the payment reference:')
    if (promptedReference === null) return
    const reference = promptedReference.trim()
    if (!reference) {
      setActionError('A payment reference is required.')
      return
    }
    if (amountMinor > due.amountMinor) {
      setActionError('Payment amount cannot exceed the remaining due.')
      return
    }
    if (!window.confirm(`Record ${formatAmount(amountMinor)} payment for ${due.customerName} with reference "${reference}"?`)) return
    void applyAction(() => recordDuePayment(due.dueId, { amountMinor, reference }))
  }

  const columns: TableColumn<Due>[] = [
    {
      key: 'customer',
      heading: 'Customer',
      render: (due) => (
        <button
          aria-pressed={selectedDueId === due.dueId}
          className="button-secondary"
          onClick={() => {
            setSelectedDueId(due.dueId)
            setActionError('')
          }}
          type="button"
        >
          {due.customerName}
        </button>
      ),
    },
    { key: 'order', heading: 'Order', render: (due) => <span className="reference-text">{due.orderId}</span> },
    { key: 'reason', heading: 'Reason', render: (due) => due.reason },
    { key: 'amount', heading: 'Amount', render: (due) => formatAmount(due.amountMinor) },
    {
      key: 'status',
      heading: 'Status',
      render: (due) => (
        <span className="status-badge status-neutral">
          <span className="status-dot" />
          {statusLabels[due.status]}
        </span>
      ),
    },
    { key: 'riderNote', heading: 'Rider note', render: (due) => due.riderNote || '—' },
  ]

  return (
    <div className="module-workspace">
      <section className="panel records-panel" aria-labelledby="dues-list-title">
        <div className="panel-heading records-heading">
          <div>
            <h2 id="dues-list-title">Dues</h2>
            <p>Review, confirm, waive, and record customer due payments.</p>
          </div>
          {isDemoMode && <span className="layout-tag">DEMO DATA</span>}
          {loadError && (
            <button className="button-secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)} type="button">
              Retry
            </button>
          )}
        </div>
        <DataTable
          columns={columns}
          emptyMessage="Pending-review and confirmed dues will appear here."
          emptyTitle="No dues found"
          error={loadError || undefined}
          getRowKey={(due) => due.dueId}
          loading={loading}
          rows={dues}
        />
      </section>

      {selectedDue && !loading && !loadError && (
        <section className="panel records-panel" aria-labelledby="due-detail-title">
          <div className="panel-heading records-heading">
            <div>
              <h2 id="due-detail-title">Due details · {selectedDue.orderId}</h2>
              <p>{selectedDue.customerName} · {selectedDue.customerId}</p>
            </div>
            <span className="status-badge status-neutral">
              <span className="status-dot" />
              {statusLabels[selectedDue.status]}
            </span>
          </div>
          <div className="admin-form">
            <div className="form-field"><span>Reason</span><p>{selectedDue.reason}</p></div>
            <div className="form-field"><span>Remaining amount</span><p>{formatAmount(selectedDue.amountMinor)}</p></div>
            <div className="form-field form-field-wide"><span>Rider note</span><p>{selectedDue.riderNote || 'No rider note.'}</p></div>
            {selectedDue.waiverReason && (
              <div className="form-field form-field-wide"><span>Waiver reason</span><p>{selectedDue.waiverReason}</p></div>
            )}
            {selectedDue.payments.length > 0 && (
              <div className="form-field form-field-wide">
                <span>Recorded payments</span>
                {selectedDue.payments.map((payment) => (
                  <p key={`${payment.reference}-${payment.recordedAt}`}>
                    {formatAmount(payment.amountMinor)} · {payment.reference}
                  </p>
                ))}
              </div>
            )}
          </div>
          {actionError && <p className="partner-submit-error" role="alert">{actionError}</p>}
          <div className="dialog-actions">
            {selectedDue.status === 'pending-review' && (
              <button className="button-primary" disabled={busy} onClick={() => handleConfirm(selectedDue)} type="button">
                Confirm
              </button>
            )}
            {(selectedDue.status === 'pending-review' || selectedDue.status === 'confirmed') && (
              <button className="button-secondary" disabled={busy} onClick={() => handleWaive(selectedDue)} type="button">
                Waive
              </button>
            )}
            {selectedDue.status === 'confirmed' && selectedDue.amountMinor > 0 && (
              <button className="button-secondary" disabled={busy} onClick={() => handleRecordPayment(selectedDue)} type="button">
                Record payment
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
