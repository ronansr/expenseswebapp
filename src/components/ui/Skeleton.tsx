export const Skeleton = ({height = 16, width = '100%', radius}: {height?: number; width?: number | string; radius?: number}) => (
  <span
    className="skeleton"
    style={{display: 'block', height, width, borderRadius: radius}}
    aria-hidden="true"
  />
);

/** Esqueletos com a forma do conteúdo final, não um spinner genérico. */
export const KpiSkeleton = () => (
  <div className="grid grid-kpi">
    {[0, 1, 2, 3].map(index => (
      <div className="card kpi" key={index}>
        <div className="kpi-text" style={{gap: 8, width: '100%'}}>
          <Skeleton height={12} width="55%" />
          <Skeleton height={24} width="78%" />
          <Skeleton height={11} width="42%" />
        </div>
      </div>
    ))}
  </div>
);

export const RowsSkeleton = ({rows = 5}: {rows?: number}) => (
  <div className="rows">
    {Array.from({length: rows}, (_, index) => (
      <div className="row-item" key={index}>
        <Skeleton height={34} width={34} radius={10} />
        <div style={{display: 'grid', gap: 6}}>
          <Skeleton height={12} width="46%" />
          <Skeleton height={10} width="28%" />
        </div>
        <Skeleton height={12} width={72} />
      </div>
    ))}
  </div>
);
