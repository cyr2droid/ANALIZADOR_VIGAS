import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, CircleHelp, Ruler, Waves } from 'lucide-react';
import {
  calculateBeam,
  type BeamAnalysis,
  type BeamInput,
  type BeamType,
  type PointLoad,
  type UniformLoad,
} from '@/lib/beam-calculations';

const initialInput: BeamInput = {
  type: 'simply-supported',
  length: 6,
  pointLoads: [{ id: 'load-1', magnitude: 12, position: 3 }],
  distributedLoad: null,
};

function format(value: number, digits = 2) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value)
    : '—';
}

function FieldNumber({
  label,
  unit,
  value,
  min,
  max,
  step,
  testId,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  testId: string;
  onChange: (value: number) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) onChange(next);
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={testId}>
        <span>{label}</span>
        <small>min. {format(min, 0)}</small>
      </label>
      <div className="number-wrap">
        <input
          id={testId}
          data-testid={testId}
          className="number-input mono"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          aria-label={`${label} (${unit})`}
        />
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}

function BeamDiagram({ input }: { input: BeamInput }) {
  const left = 54;
  const right = 686;
  const beamY = 66;
  const isCantilever = input.type === 'cantilever';
  const positionX = (position: number) => left + (position / input.length) * (right - left);
  const distributed = input.distributedLoad;
  const distributedStartX = distributed ? positionX(distributed.start) : 0;
  const distributedEndX = distributed ? positionX(distributed.end) : 0;
  const distributedArrowCount = distributed
    ? Math.max(2, Math.min(9, Math.round((distributed.end - distributed.start) / input.length * 8) + 1))
    : 0;
  return (
    <svg className="beam-svg" viewBox="0 0 740 124" role="img" aria-label="Esquema de viga con cargas">
      <defs>
        <marker id="load-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#d39335" />
        </marker>
        <marker id="load-arrow-up" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#438e78" />
        </marker>
      </defs>
      {isCantilever && (
        <>
          <path d={`M${left} 27 V91`} stroke="#52655f" strokeWidth="5" />
          {Array.from({ length: 7 }, (_, index) => (
            <path key={index} d={`M${left - 14} ${31 + index * 9} l14 -8`} stroke="#a7b2aa" strokeWidth="1.4" />
          ))}
        </>
      )}
      <line x1={left} y1={beamY} x2={right} y2={beamY} stroke="#283e47" strokeWidth="5" strokeLinecap="round" />
      {!isCantilever && (
        <>
          <path d={`M${left - 11} 89 L${left} 70 L${left + 11} 89 Z`} fill="#dfe8df" stroke="#60736b" strokeWidth="1.5" />
          <path d={`M${right - 11} 89 L${right} 70 L${right + 11} 89 Z`} fill="#dfe8df" stroke="#60736b" strokeWidth="1.5" />
          <line x1={right - 17} y1="92" x2={right + 17} y2="92" stroke="#aab5ab" strokeWidth="1.3" />
          <line x1={left - 17} y1="92" x2={left + 17} y2="92" stroke="#aab5ab" strokeWidth="1.3" />
        </>
      )}
      {distributed && distributed.end > distributed.start && (
        <>
          <rect
            x={distributedStartX}
            y="15"
            width={Math.max(2, distributedEndX - distributedStartX)}
            height="34"
            fill="#d39335"
            fillOpacity=".08"
            stroke="#d39335"
            strokeOpacity=".35"
            strokeDasharray="3 3"
          />
          {Array.from({ length: distributedArrowCount }, (_, index) => {
            const x = distributedStartX + ((distributedEndX - distributedStartX) * index) / (distributedArrowCount - 1);
            return <line key={`udl-arrow-${index}`} x1={x} y1="23" x2={x} y2="46" stroke="#d39335" strokeWidth="1.4" markerEnd="url(#load-arrow)" />;
          })}
          <text x={(distributedStartX + distributedEndX) / 2} y="12" textAnchor="middle" fill="#a16c22" fontFamily="DM Mono" fontSize="10" fontWeight="500">
            q = {format(distributed.intensity, 2)} kN/m
          </text>
        </>
      )}
      {input.pointLoads.map((load, index) => {
        const x = positionX(load.position);
        const labelY = distributed ? (index % 2 === 0 ? 7 : 18) : (index % 2 === 0 ? 12 : 24);
        const isUpward = load.magnitude < 0;
        const loadColor = isUpward ? '#438e78' : '#a16c22';
        return (
          <g key={load.id}>
            <title>{isUpward ? 'Carga puntual hacia arriba' : 'Carga puntual hacia abajo'}</title>
            <line
              x1={x}
              y1={isUpward ? 48 : labelY + 7}
              x2={x}
              y2={isUpward ? labelY + 12 : 48}
              stroke={isUpward ? '#438e78' : '#d39335'}
              strokeWidth="1.8"
              markerEnd={`url(#${isUpward ? 'load-arrow-up' : 'load-arrow'})`}
            />
            <text x={x} y={labelY} textAnchor="middle" fill={loadColor} fontFamily="DM Mono" fontSize="9" fontWeight="500">
              P{index + 1} {format(load.magnitude, 1)}
            </text>
            <line x1={x} y1="77" x2={x} y2="101" stroke="#93a39a" strokeDasharray="3 3" />
            <text x={x} y={104 + (index % 2) * 10} textAnchor="middle" fill="#52665e" fontFamily="DM Mono" fontSize="8">
              {format(load.position, 2)} m
            </text>
          </g>
        );
      })}
      {distributed && (
        <>
          <line x1={distributedStartX} y1="78" x2={distributedStartX} y2="101" stroke="#c89a57" strokeDasharray="3 3" />
          <line x1={distributedEndX} y1="78" x2={distributedEndX} y2="101" stroke="#c89a57" strokeDasharray="3 3" />
        </>
      )}
      <line x1={left} y1="104" x2={right} y2="104" stroke="#bcc7be" strokeWidth="1" />
      <path d={`M${left} 100 v8 M${right} 100 v8`} stroke="#a3afa7" />
      <text x={left} y="121" textAnchor="middle" fill="#7a8a83" fontFamily="DM Mono" fontSize="9">0</text>
      <text x={right} y="121" textAnchor="middle" fill="#7a8a83" fontFamily="DM Mono" fontSize="9">{format(input.length, 1)} m</text>
      {isCantilever && <text x={left - 21} y="23" textAnchor="middle" fill="#667770" fontFamily="DM Mono" fontSize="9">empotramiento</text>}
    </svg>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  name,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  unit: string;
  name: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div><span>x</span> = {format(Number(label), 2)} m</div>
      <div><span>{name}</span> = {format(payload[0].value, 2)} {unit}</div>
    </div>
  );
}

function ForceChart({
  analysis,
  type,
  kind,
}: {
  analysis: BeamAnalysis;
  type: BeamType;
  kind: 'shear' | 'moment';
}) {
  const data = kind === 'shear' ? analysis.shear : analysis.moment;
  const isMoment = kind === 'moment';
  const unit = isMoment ? 'kN·m' : 'kN';
  const maxAbs = Math.max(1, ...data.map((point) => Math.abs(point.value)));
  const domain: [number, number] = isMoment && type === 'simply-supported'
    ? [0, maxAbs * 1.14]
    : [-maxAbs * 1.14, maxAbs * 1.14];
  const zeroOffset = domain[0] < 0
    ? (domain[1] / (domain[1] - domain[0])) * 100
    : 0;
  const color = isMoment ? '#498d76' : '#d09035';
  const id = `fill-${kind}-${type}`;
  return (
    <section className="panel chart-panel" aria-label={isMoment ? 'Diagrama de momento flector' : 'Diagrama de fuerza cortante'}>
      <div className="chart-top">
        <div className="chart-title">
          <span className="chart-index">0{isMoment ? 3 : 2}</span>
          <h2>{isMoment ? 'Momento flector' : 'Fuerza cortante'}</h2>
        </div>
        <div className="chart-legend">
          <span><i className="legend-key" style={{ background: color }} />{isMoment ? 'M(x)' : 'V(x)'}</span>
          <span className="chart-unit">{unit}</span>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 14, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                {isMoment && type === 'simply-supported' ? (
                  <>
                    <stop offset="0%" stopColor="#4b9b80" stopOpacity={0.23} />
                    <stop offset="100%" stopColor="#4b9b80" stopOpacity={0.23} />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#4b9b80" stopOpacity={0.23} />
                    <stop offset={`${zeroOffset}%`} stopColor="#4b9b80" stopOpacity={0.23} />
                    <stop offset={`${zeroOffset}%`} stopColor="#d17a68" stopOpacity={0.19} />
                    <stop offset="100%" stopColor="#d17a68" stopOpacity={0.19} />
                  </>
                )}
              </linearGradient>
            </defs>
            <CartesianGrid vertical horizontal />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 'dataMax']}
              tickCount={6}
              tickFormatter={(value: number) => format(value, 1)}
              label={{ value: 'Posición x (m)', position: 'insideBottom', offset: -1, fill: '#74837e', fontSize: 10 }}
              allowDuplicatedCategory
            />
            <YAxis
              type="number"
              domain={domain}
              tickCount={5}
              tickFormatter={(value: number) => format(value, 1)}
              width={48}
              label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#74837e', fontSize: 10, offset: 4 }}
            />
            <ReferenceLine y={0} stroke="#7e8c85" strokeWidth={1.2} />
            <Tooltip content={<ChartTooltip unit={unit} name={isMoment ? 'M' : 'V'} />} />
            <Area
              type="linear"
              dataKey="value"
              stroke="none"
              fill={`url(#${id})`}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function App() {
  const [input, setInput] = useState<BeamInput>(initialInput);
  const nextLoadId = useRef(1);
  const analysis = useMemo(() => calculateBeam(input), [input]);

  const update = (key: keyof BeamInput, value: number | BeamType) => {
    setInput((current) => {
      if (key === 'length') {
        const length = Math.max(1, Math.min(50, Number(value)));
        const pointLoads = current.pointLoads.map((load) => ({
          ...load,
          position: Math.min(length, load.position),
        }));
        const distributedLoad = current.distributedLoad
          ? {
              ...current.distributedLoad,
              start: Math.min(length, current.distributedLoad.start),
              end: Math.min(length, current.distributedLoad.end),
            }
          : null;
        return { ...current, length, pointLoads, distributedLoad };
      }
      if (key === 'type') return { ...current, type: value as BeamType };
      return current;
    });
  };

  const updatePointLoad = (id: string, changes: Partial<Omit<PointLoad, 'id'>>) => {
    setInput((current) => ({
      ...current,
      pointLoads: current.pointLoads.map((load) => load.id === id
        ? {
            ...load,
            ...changes,
            magnitude: changes.magnitude === undefined
              ? load.magnitude
              : Math.max(-1000, Math.min(1000, changes.magnitude)),
            position: changes.position === undefined
              ? load.position
              : Math.max(0, Math.min(current.length, changes.position)),
          }
        : load),
    }));
  };

  const addPointLoad = () => {
    if (input.pointLoads.length >= 3) return;
    const id = `load-${nextLoadId.current + 1}`;
    nextLoadId.current += 1;
    setInput((current) => current.pointLoads.length >= 3
      ? current
      : {
          ...current,
          pointLoads: [
            ...current.pointLoads,
            { id, magnitude: 5, position: Number((current.length / 2).toFixed(2)) },
          ],
        });
  };

  const removePointLoad = (id: string) => {
    setInput((current) => ({
      ...current,
      pointLoads: current.pointLoads.filter((load) => load.id !== id),
    }));
  };

  const toggleDistributedLoad = () => {
    setInput((current) => ({
      ...current,
      distributedLoad: current.distributedLoad
        ? null
        : { intensity: 2.5, start: 0, end: current.length },
    }));
  };

  const updateDistributedLoad = (changes: Partial<UniformLoad>) => {
    setInput((current) => {
      if (!current.distributedLoad) return current;
      const next = { ...current.distributedLoad, ...changes };
      next.intensity = Math.max(0, Math.min(1000, next.intensity));
      next.start = Math.max(0, Math.min(current.length, next.start));
      next.end = Math.max(next.start, Math.min(current.length, next.end));
      if (changes.start !== undefined) next.start = Math.min(next.start, next.end);
      if (changes.end !== undefined) next.end = Math.max(next.start, next.end);
      return { ...current, distributedLoad: next };
    });
  };

  const lengthStep = input.length < 2 ? 0.05 : 0.1;
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Activity size={18} strokeWidth={1.8} /></span>
          <span>VIGA<span style={{ color: '#76c3a4' }}> / </span>LAB</span>
        </div>
        <div className="top-meta">
          <span><i className="status-dot" />ANÁLISIS EN VIVO</span>
          <span>HERRAMIENTA 01 / 01</span>
        </div>
      </header>

      <main className="page-wrap">
        <div className="page-head">
          <div>
            <div className="eyebrow">Mecánica estructural <span style={{ color: '#9aa9a0' }}>/</span> Cargas combinadas</div>
            <h1>Calculadora de vigas</h1>
            <p>Reacciones y diagramas internos, al instante.</p>
          </div>
          <div className="session-chip"><Waves size={14} /> Modelo estático · unidades SI</div>
        </div>

        <div className="workspace">
          <aside className="panel">
            <div className="panel-heading">
              <h2>Parámetros del modelo</h2>
              <span className="step-no">01 — 03</span>
            </div>
            <div className="form-body">
              <div className="field">
                <div className="field-label"><span>Condición de apoyo</span><small>seleccione el esquema</small></div>
                <div className="segmented" role="group" aria-label="Tipo de viga">
                  <button
                    type="button"
                    data-testid="button-simply-supported"
                    className={`segment ${input.type === 'simply-supported' ? 'active' : ''}`}
                    aria-pressed={input.type === 'simply-supported'}
                    onClick={() => update('type', 'simply-supported')}
                  >Biapoyada</button>
                  <button
                    type="button"
                    data-testid="button-cantilever"
                    className={`segment ${input.type === 'cantilever' ? 'active' : ''}`}
                    aria-pressed={input.type === 'cantilever'}
                    onClick={() => update('type', 'cantilever')}
                  >Voladizo</button>
                </div>
              </div>
              <FieldNumber
                label="Longitud de viga · L"
                unit="m"
                value={input.length}
                min={1}
                max={50}
                step={lengthStep}
                testId="input-length"
                onChange={(value) => update('length', value)}
              />
              <div className="load-section">
                <div className="load-section-head">
                  <div>
                    <div className="field-label load-heading"><span>Cargas puntuales</span><small>{input.pointLoads.length} de 3</small></div>
                    <p className="control-hint">P positiva ↓ · P negativa ↑</p>
                  </div>
                  <button
                    type="button"
                    className="add-load-button"
                    data-testid="button-add-point-load"
                    onClick={addPointLoad}
                    disabled={input.pointLoads.length >= 3}
                    aria-label="Añadir carga puntual"
                  >+ Añadir</button>
                </div>
                {input.pointLoads.map((load, index) => (
                  <div className="point-load-row" key={load.id} data-testid={`point-load-row-${load.id}`}>
                    <div className="point-load-top">
                      <span className="load-index">P{index + 1}</span>
                      <button
                        type="button"
                        className="remove-load-button"
                        data-testid={`button-remove-${load.id}`}
                        onClick={() => removePointLoad(load.id)}
                        aria-label={`Eliminar carga puntual ${index + 1}`}
                        title="Eliminar carga"
                      >×</button>
                    </div>
                    <div className="load-input-grid">
                      <FieldNumber
                         label="Fuerza"
                        unit="kN"
                        value={load.magnitude}
                         min={-1000}
                        max={1000}
                        step={0.5}
                        testId={`input-magnitude-${load.id}`}
                        onChange={(value) => updatePointLoad(load.id, { magnitude: value })}
                      />
                      <FieldNumber
                        label="Posición"
                        unit="m"
                        value={load.position}
                        min={0}
                        max={input.length}
                        step={0.05}
                        testId={`input-position-${load.id}`}
                        onChange={(value) => updatePointLoad(load.id, { position: value })}
                      />
                    </div>
                    <input
                      className="range"
                      data-testid={`range-position-${load.id}`}
                      type="range"
                      min={0}
                      max={input.length}
                      step={Math.max(0.01, input.length / 200)}
                      value={load.position}
                      onChange={(event) => updatePointLoad(load.id, { position: Number(event.target.value) })}
                      aria-label={`Desplazar carga puntual ${index + 1}`}
                    />
                    <div className="range-labels mono"><span>0,00 m</span><span>{format(input.length, 2)} m</span></div>
                  </div>
                ))}
                {input.pointLoads.length === 0 && (
                  <div className="loads-empty">Sin cargas puntuales. Añada una carga para incluirla en el análisis.</div>
                )}
              </div>

              <section className="distributed-section" aria-labelledby="distributed-heading">
                <div className="distributed-heading-row">
                  <div>
                    <div className="field-label load-heading" id="distributed-heading">Carga distribuida</div>
                    <p className="control-hint">Uniforme y descendente</p>
                  </div>
                  <button
                    type="button"
                    className={`switch-button ${input.distributedLoad ? 'on' : ''}`}
                    role="switch"
                    aria-checked={Boolean(input.distributedLoad)}
                    data-testid="switch-distributed-load"
                    onClick={toggleDistributedLoad}
                  ><span />{input.distributedLoad ? 'Activa' : 'Desactivada'}</button>
                </div>
                {input.distributedLoad && (
                  <div className="distributed-fields">
                    <FieldNumber
                      label="Intensidad · q"
                      unit="kN/m"
                      value={input.distributedLoad.intensity}
                      min={0}
                      max={1000}
                      step={0.1}
                      testId="input-distributed-intensity"
                      onChange={(value) => updateDistributedLoad({ intensity: value })}
                    />
                    <div className="load-input-grid">
                      <FieldNumber
                        label="Inicio"
                        unit="m"
                        value={input.distributedLoad.start}
                        min={0}
                        max={input.length}
                        step={0.05}
                        testId="input-distributed-start"
                        onChange={(value) => updateDistributedLoad({ start: value })}
                      />
                      <FieldNumber
                        label="Fin"
                        unit="m"
                        value={input.distributedLoad.end}
                        min={0}
                        max={input.length}
                        step={0.05}
                        testId="input-distributed-end"
                        onChange={(value) => updateDistributedLoad({ end: value })}
                      />
                    </div>
                    <div className="distributed-range-labels mono">
                      <span>Segmento activo</span>
                      <span>{format(input.distributedLoad.start, 2)} — {format(input.distributedLoad.end, 2)} m</span>
                    </div>
                  </div>
                )}
              </section>
              <div className="formula-note">
                <strong><Ruler size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />Convención del modelo</strong>
                P &gt; 0 actúa hacia abajo; P &lt; 0, hacia arriba. V &gt; 0 apunta hacia arriba en la cara izquierda del corte. M &gt; 0 es sagante: comprime arriba y tracciona abajo. La carga distribuida q actúa hacia abajo.
              </div>
            </div>
          </aside>

          <div className="results-column">
            <div className="metric-grid" aria-live="polite">
              <div className="panel metric" data-testid="metric-left-reaction">
                <div className="metric-label">Reacción izquierda</div>
                <div className="metric-value">{format(analysis.reactionLeft)}<span className="metric-unit">kN</span></div>
                <div className="metric-foot">{input.type === 'cantilever' ? 'empotramiento' : 'apoyo A'}</div>
              </div>
              <div className="panel metric" data-testid="metric-right-reaction">
                <div className="metric-label">Reacción derecha</div>
                <div className="metric-value">{format(analysis.reactionRight)}<span className="metric-unit">kN</span></div>
                <div className="metric-foot">{input.type === 'cantilever' ? 'sin apoyo' : 'apoyo B'}</div>
              </div>
              <div className="panel metric" data-testid="metric-max-shear">
                <div className="metric-label">Cortante máximo</div>
                <div className="metric-value">{format(analysis.maxShear)}<span className="metric-unit">kN</span></div>
                <div className="metric-foot">valor absoluto · |V| máx.</div>
              </div>
              <div className="panel metric" data-testid="metric-max-moment">
                <div className="metric-label">Momento máximo</div>
                <div className="metric-value">{format(analysis.maxMoment)}<span className="metric-unit">kN·m</span></div>
                <div className="metric-foot">en x = {format(analysis.maxMomentPosition, 2)} m</div>
              </div>
            </div>

            <section className="panel beam-panel">
              <div className="section-title">
                <h2>Esquema estructural</h2>
                <span className="section-kicker">
                  {input.type === 'cantilever'
                    ? `Mₐ = ${format(analysis.fixedMoment, 2)} kN·m`
                    : `L = ${format(input.length, 2)} m`}
                </span>
              </div>
              <div className="beam-stage">
                <BeamDiagram input={input} />
                <div className="axis-caption">
                  <span>{input.type === 'cantilever' ? 'A · empotramiento' : 'A · articulación'}</span>
                  <span>{input.type === 'cantilever' ? 'extremo libre' : 'B · rodillo'}</span>
                </div>
              </div>
            </section>

            <ForceChart analysis={analysis} type={input.type} kind="shear" />
            <ForceChart analysis={analysis} type={input.type} kind="moment" />

            <div className="limitation" data-testid="text-limitation">
              <span className="limitation-mark"><CircleHelp size={12} /></span>
              <div><strong>Alcance del modelo.</strong> Resultados para una viga ideal con una a tres cargas puntuales y una carga uniformemente distribuida. Úselos para aprendizaje o análisis preliminar; no sustituyen un diseño estructural profesional.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
