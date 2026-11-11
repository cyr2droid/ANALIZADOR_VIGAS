import { useMemo, useState } from 'react';
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
} from '@/lib/beam-calculations';

const initialInput: BeamInput = {
  type: 'simply-supported',
  length: 6,
  load: 12,
  position: 3,
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
  const loadX = left + (input.position / input.length) * (right - left);
  const isCantilever = input.type === 'cantilever';
  return (
    <svg className="beam-svg" viewBox="0 0 740 112" role="img" aria-label="Esquema de viga y carga puntual">
      <defs>
        <marker id="load-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#d39335" />
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
      <line x1={loadX} y1="15" x2={loadX} y2="48" stroke="#d39335" strokeWidth="2" markerEnd="url(#load-arrow)" />
      <text x={loadX} y="10" textAnchor="middle" fill="#a16c22" fontFamily="DM Mono" fontSize="11" fontWeight="500">
        P = {format(input.load, 1)} kN
      </text>
      <line x1={left} y1="104" x2={right} y2="104" stroke="#bcc7be" strokeWidth="1" />
      <path d={`M${left} 100 v8 M${right} 100 v8`} stroke="#a3afa7" />
      <line x1={loadX} y1="77" x2={loadX} y2="101" stroke="#93a39a" strokeDasharray="3 3" />
      <text x={left} y="111" textAnchor="middle" fill="#7a8a83" fontFamily="DM Mono" fontSize="9">0</text>
      <text x={right} y="111" textAnchor="middle" fill="#7a8a83" fontFamily="DM Mono" fontSize="9">{format(input.length, 1)} m</text>
      <text x={loadX} y="98" textAnchor="middle" fill="#52665e" fontFamily="DM Mono" fontSize="9">a = {format(input.position, 2)} m</text>
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
              reversed={isMoment && type === 'simply-supported'}
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
  const analysis = useMemo(() => calculateBeam(input), [input]);

  const update = (key: keyof BeamInput, value: number | BeamType) => {
    setInput((current) => {
      if (key === 'length') {
        const length = Math.max(1, Math.min(50, Number(value)));
        return { ...current, length, position: Math.min(current.position, length) };
      }
      if (key === 'position') {
        return { ...current, position: Math.max(0, Math.min(current.length, Number(value))) };
      }
      if (key === 'load') return { ...current, load: Math.max(0.1, Math.min(1000, Number(value))) };
      if (key === 'type') return { ...current, type: value as BeamType };
      return current;
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
            <div className="eyebrow">Mecánica estructural <span style={{ color: '#9aa9a0' }}>/</span> Carga puntual</div>
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
              <FieldNumber
                label="Carga puntual · P"
                unit="kN"
                value={input.load}
                min={0.1}
                max={1000}
                step={0.5}
                testId="input-load"
                onChange={(value) => update('load', value)}
              />
              <div className="field" style={{ marginBottom: 0 }}>
                <FieldNumber
                  label="Posición de carga · a"
                  unit="m"
                  value={input.position}
                  min={0}
                  max={input.length}
                  step={0.05}
                  testId="input-position"
                  onChange={(value) => update('position', value)}
                />
                <input
                  className="range"
                  data-testid="range-position"
                  type="range"
                  min={0}
                  max={input.length}
                  step={Math.max(0.01, input.length / 200)}
                  value={input.position}
                  onChange={(event) => update('position', Number(event.target.value))}
                  aria-label="Desplazar carga a lo largo de la viga"
                />
                <div className="range-labels mono"><span>0,00 m</span><span>{format(input.length, 2)} m</span></div>
              </div>
              <div className="formula-note">
                <strong><Ruler size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />Convención del modelo</strong>
                Carga vertical descendente. V positiva hacia arriba en la cara izquierda; momento positivo sagante.
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
              <div><strong>Alcance del modelo.</strong> Resultados para una viga ideal con una carga puntual. Úselos para aprendizaje o análisis preliminar; no sustituyen un diseño estructural profesional.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
