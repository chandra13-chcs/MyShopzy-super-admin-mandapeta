import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

export type ChartKind = 'line' | 'bar' | 'donut'
export type AnalyticsState = 'unavailable' | 'pending' | 'loading' | 'error' | 'ready'
type ChartDisplayState = AnalyticsState | 'empty'

export type ChartValue = {
  label: string
  value: number
}

export type ChartSeries = {
  label: string
  color?: string
  values: ChartValue[]
}

type KpiCardProps = {
  label: string
  value: string | number | null
  detail: string
  state: 'unavailable' | 'pending'
}

type ChartPanelProps = {
  id: string
  title: string
  description: string
  kind: ChartKind
  unit: string
  state: AnalyticsState
  message: string
  series?: ChartSeries[]
  onSelect?: (label: string) => void
}

const chartColors = ['#345f86', '#547b5d', '#a66c32', '#6d5d99']

function seriesColor(series: ChartSeries, index: number) {
  return series.color ?? chartColors[index % chartColors.length]
}

function formatValue(value: number, unit: string) {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)

  return unit ? `${formatted} ${unit}` : formatted
}

function activateWithKeyboard(event: KeyboardEvent<SVGElement>, activate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    activate()
  }
}

export function KpiCard({ label, value, detail, state }: KpiCardProps) {
  const unavailable = value === null
  const statusLabel = state === 'pending' ? 'PENDING' : 'UNAVAILABLE'

  return (
    <article className="analytics-kpi">
      <div className="analytics-kpi-heading">
        <span>{label}</span>
        <span className={`analytics-state-tag${state === 'pending' ? ' is-pending' : ''}`}>
          {unavailable ? statusLabel : 'LIVE'}
        </span>
      </div>
      <strong aria-label={unavailable ? `${label}: unavailable` : `${label}: ${value}`}>
        {unavailable ? '—' : value}
      </strong>
      <small>{detail}</small>
    </article>
  )
}

function ChartState({ state, message }: { state: ChartDisplayState; message: string }) {
  if (state === 'loading') {
    return (
      <div className="analytics-chart-state" role="status" aria-live="polite">
        <div className="chart-skeleton" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <strong>Loading chart data</strong>
        <p>Please wait while the authorized data source responds.</p>
      </div>
    )
  }

  return (
    <div className={`analytics-chart-state${state === 'error' ? ' is-error' : ''}`} role={state === 'error' ? 'alert' : 'status'}>
      <span className="analytics-state-symbol" aria-hidden="true">{state === 'error' ? '!' : '—'}</span>
      <strong>
        {state === 'pending'
          ? 'Waiting on an approved definition'
          : state === 'error'
            ? 'Chart data could not be loaded'
            : state === 'empty'
              ? 'No records in this period'
              : 'Chart unavailable'}
      </strong>
      <p>{message}</p>
    </div>
  )
}

function ChartLegend({ series, unit }: { series: ChartSeries[]; unit: string }) {
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {series.map((item, index) => (
        <li key={item.label}>
          <span className="chart-legend-swatch" style={{ '--legend-color': seriesColor(item, index) } as CSSProperties} />
          <span>{item.label}</span>
          {series.length === 1 && item.values.length > 0 && (
            <span className="chart-legend-total">
              {formatValue(item.values.reduce((sum, point) => sum + point.value, 0), unit)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function LineChart({
  id,
  series,
  unit,
  onSelect,
}: {
  id: string
  series: ChartSeries[]
  unit: string
  onSelect?: (label: string) => void
}) {
  const values = series.flatMap((item) => item.values.map((point) => point.value))
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const xFor = (index: number, length: number) => 52 + (length < 2 ? 0 : (index / (length - 1)) * 550)
  const yFor = (value: number) => 20 + ((max - value) / span) * 160
  const baseY = yFor(Math.max(0, min))

  return (
    <svg className="analytics-svg line-chart" viewBox="0 0 640 220" role="img" aria-labelledby={`${id}-svg-title`}>
      <title id={`${id}-svg-title`}>{series.map((item) => item.label).join(', ')} by time, measured in {unit || 'values'}</title>
      {[0, 1, 2, 3, 4].map((line) => {
        const y = 20 + line * 40
        const value = max - (line / 4) * span
        return (
          <g key={line}>
            <line className="chart-gridline" x1="48" x2="610" y1={y} y2={y} />
            <text className="chart-axis-label" x="42" y={y + 3} textAnchor="end">{formatValue(value, unit)}</text>
          </g>
        )
      })}
      {series.map((item, seriesIndex) => {
        const color = seriesColor(item, seriesIndex)
        const points = item.values.map((point, index) => `${xFor(index, item.values.length)},${yFor(point.value)}`)
        const linePath = points.join(' ')
        const areaPath = item.values.length > 1
          ? `M ${xFor(0, item.values.length)} ${baseY} L ${points.join(' L ')} L ${xFor(item.values.length - 1, item.values.length)} ${baseY} Z`
          : ''

        return (
          <g key={item.label}>
            {areaPath && <path d={areaPath} fill={color} fillOpacity=".08" />}
            {item.values.length > 1 && <polyline className="chart-line" fill="none" points={linePath} stroke={color} />}
            {item.values.map((point, index) => {
              const activate = () => onSelect?.(point.label)
              return (
                <g
                  key={`${item.label}-${point.label}`}
                  className={onSelect ? 'chart-mark is-interactive' : 'chart-mark'}
                  onClick={onSelect ? activate : undefined}
                  onKeyDown={onSelect ? (event) => activateWithKeyboard(event, activate) : undefined}
                  role={onSelect ? 'button' : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  aria-label={onSelect ? `${point.label}: ${formatValue(point.value, unit)}. Open filtered records.` : undefined}
                >
                  <title>{`${item.label} · ${point.label}: ${formatValue(point.value, unit)}`}</title>
                  <circle cx={xFor(index, item.values.length)} cy={yFor(point.value)} r="5" fill={color} />
                </g>
              )
            })}
          </g>
        )
      })}
      {series[0]?.values.map((point, index, valuesForSeries) => {
        const labelInterval = Math.max(1, Math.ceil((valuesForSeries.length - 1) / 6))
        if (index !== 0 && index !== valuesForSeries.length - 1 && index % labelInterval !== 0) return null
        return (
          <text className="chart-axis-label" key={point.label} x={xFor(index, valuesForSeries.length)} y="204" textAnchor="middle">
            {point.label}
          </text>
        )
      })}
    </svg>
  )
}

function BarChart({
  id,
  series,
  unit,
  onSelect,
}: {
  id: string
  series: ChartSeries[]
  unit: string
  onSelect?: (label: string) => void
}) {
  const points = series.flatMap((item, seriesIndex) =>
    item.values.map((point) => ({ ...point, color: seriesColor(item, seriesIndex), seriesLabel: item.label })),
  )
  const min = Math.min(0, ...points.map((point) => point.value))
  const max = Math.max(0, ...points.map((point) => point.value))
  const span = max - min || 1
  const rowHeight = 38
  const height = Math.max(170, points.length * rowHeight + 24)
  const xFor = (value: number) => 225 + ((value - min) / span) * 355
  const zeroX = xFor(0)

  return (
    <svg className="analytics-svg bar-chart" viewBox={`0 0 640 ${height}`} role="img" aria-labelledby={`${id}-svg-title`}>
      <title id={`${id}-svg-title`}>{series.map((item) => item.label).join(', ')} comparison, measured in {unit || 'values'}</title>
      {points.map((point, index) => {
        const y = 13 + index * rowHeight
        const valueX = xFor(point.value)
        const barX = Math.min(zeroX, valueX)
        const barWidth = Math.abs(valueX - zeroX)
        const activate = () => onSelect?.(point.label)
        return (
          <g key={`${point.seriesLabel}-${point.label}`}>
            <text className="chart-category-label" x="8" y={y + 15}>{point.label}</text>
            <rect className="chart-bar-track" x="225" y={y} width="355" height="22" rx="4" />
            <rect
              className={`chart-bar${onSelect ? ' is-interactive' : ''}`}
              x={barX}
              y={y}
              width={barWidth}
              height="22"
              rx="4"
              fill={point.color}
              onClick={onSelect ? activate : undefined}
              onKeyDown={onSelect ? (event) => activateWithKeyboard(event, activate) : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={onSelect ? `${point.label}: ${formatValue(point.value, unit)}. Open filtered records.` : undefined}
            >
              <title>{`${point.seriesLabel} · ${point.label}: ${formatValue(point.value, unit)}`}</title>
            </rect>
            <text className="chart-value-label" x="590" y={y + 15}>{formatValue(point.value, unit)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({
  id,
  series,
  unit,
  onSelect,
}: {
  id: string
  series: ChartSeries[]
  unit: string
  onSelect?: (label: string) => void
}) {
  const points = series.flatMap((item, seriesIndex) =>
    item.values.map((point) => ({ ...point, color: seriesColor(item, seriesIndex), seriesLabel: item.label })),
  )
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0)
  let angle = -Math.PI / 2
  const center = 105
  const radius = 72
  const pathFor = (start: number, end: number) => {
    const startX = center + radius * Math.cos(start)
    const startY = center + radius * Math.sin(start)
    const endX = center + radius * Math.cos(end)
    const endY = center + radius * Math.sin(end)
    const largeArc = end - start > Math.PI ? 1 : 0
    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
  }

  return (
    <div className="donut-layout">
      <svg className="analytics-svg donut-chart" viewBox="0 0 210 210" role="img" aria-labelledby={`${id}-svg-title`}>
        <title id={`${id}-svg-title`}>{points.map((point) => `${point.label}: ${formatValue(point.value, unit)}`).join('; ')}</title>
        {total > 0 && points.length === 1 ? (
          <circle
            className={`chart-donut-segment${onSelect ? ' is-interactive' : ''}`}
            cx={center}
            cy={center}
            r={radius}
            fill={points[0].color}
            onClick={onSelect ? () => onSelect(points[0].label) : undefined}
            onKeyDown={onSelect ? (event) => activateWithKeyboard(event, () => onSelect(points[0].label)) : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `${points[0].label}: ${formatValue(points[0].value, unit)}. Open filtered records.` : undefined}
          >
            <title>{`${points[0].seriesLabel} · ${points[0].label}: ${formatValue(points[0].value, unit)}`}</title>
          </circle>
        ) : total > 0 ? points.map((point) => {
          const nextAngle = angle + (Math.max(0, point.value) / total) * Math.PI * 2
          const path = pathFor(angle, nextAngle)
          angle = nextAngle
          const activate = () => onSelect?.(point.label)
          return (
            <path
              key={`${point.seriesLabel}-${point.label}`}
              className={`chart-donut-segment${onSelect ? ' is-interactive' : ''}`}
              d={path}
              fill={point.color}
              onClick={onSelect ? activate : undefined}
              onKeyDown={onSelect ? (event) => activateWithKeyboard(event, activate) : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={onSelect ? `${point.label}: ${formatValue(point.value, unit)}. Open filtered records.` : undefined}
            >
              <title>{`${point.seriesLabel} · ${point.label}: ${formatValue(point.value, unit)}`}</title>
            </path>
          )
        }) : <circle cx={center} cy={center} r={radius} fill="none" stroke="#d9e0e7" strokeWidth="24" />}
        <circle cx={center} cy={center} r="47" fill="#ffffff" />
        <text className="donut-total" x={center} y={center - 2} textAnchor="middle">{formatValue(total, unit)}</text>
        <text className="donut-caption" x={center} y={center + 16} textAnchor="middle">TOTAL</text>
      </svg>
      <ul className="chart-legend" aria-label="Chart legend">
        {points.map((point) => (
          <li key={`${point.seriesLabel}-${point.label}`}>
            <span className="chart-legend-swatch" style={{ '--legend-color': point.color } as CSSProperties} />
            <span>{point.label}</span>
            <span className="chart-legend-total">{formatValue(point.value, unit)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartGraphic({
  id,
  kind,
  series,
  unit,
  onSelect,
}: Pick<ChartPanelProps, 'id' | 'kind' | 'series' | 'unit' | 'onSelect'>) {
  if (kind === 'line') return <LineChart id={id} series={series ?? []} unit={unit} onSelect={onSelect} />
  if (kind === 'bar') return <BarChart id={id} series={series ?? []} unit={unit} onSelect={onSelect} />
  return <DonutChart id={id} series={series ?? []} unit={unit} onSelect={onSelect} />
}

function chartTypeLabel(kind: ChartKind) {
  if (kind === 'line') return 'Trend'
  if (kind === 'bar') return 'Comparison'
  return 'Distribution'
}

export function ChartPanel({
  id,
  title,
  description,
  kind,
  unit,
  state,
  message,
  series = [],
  onSelect,
}: ChartPanelProps) {
  const hasValues = series.some((item) => item.values.length > 0)
  const inconsistentLineLabels = kind === 'line' && series.length > 1 && series.some((item) =>
    item.values.length !== series[0].values.length ||
    item.values.some((point, index) => point.label !== series[0].values[index]?.label),
  )
  const invalidValues = series.some((item) =>
    item.values.some((point) => !Number.isFinite(point.value) || (kind === 'donut' && point.value < 0)),
  ) || inconsistentLineLabels
  let content: ReactNode

  if (state === 'loading' || state === 'pending' || state === 'error' || state === 'unavailable') {
    content = <ChartState state={state} message={message} />
  } else if (invalidValues) {
    content = (
      <ChartState
        state="error"
        message={inconsistentLineLabels
          ? 'The data series have mismatched time/category labels. No chart was drawn.'
          : kind === 'donut'
            ? 'The data source returned a non-finite or negative proportion. No chart was drawn.'
            : 'The data source returned an invalid numeric value. No chart was drawn.'}
      />
    )
  } else if (!hasValues) {
    content = <ChartState state="empty" message="A successful response returned no records for the selected period." />
  } else {
    content = (
      <>
        <div className={`analytics-chart-visual is-${kind}`}>
          <ChartGraphic id={id} kind={kind} series={series} unit={unit} onSelect={onSelect} />
        </div>
        {kind !== 'donut' && <ChartLegend series={series} unit={unit} />}
        {kind === 'donut' && series.length > 0 && series.every((item) => item.values.every((point) => point.value === 0)) && (
          <p className="chart-zero-note">All values are zero for this period.</p>
        )}
      </>
    )
  }

  return (
    <section className="analytics-chart-card" aria-labelledby={`${id}-title`}>
      <header className="analytics-chart-heading">
        <div>
          <h3 id={`${id}-title`}>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="chart-type-tag">{chartTypeLabel(kind)}</span>
      </header>
      {content}
    </section>
  )
}
