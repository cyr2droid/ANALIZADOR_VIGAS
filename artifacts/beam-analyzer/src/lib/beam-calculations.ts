export type BeamType = 'simply-supported' | 'cantilever';

export interface BeamInput {
  type: BeamType;
  length: number;
  load: number;
  position: number;
}

export interface DiagramPoint {
  x: number;
  value: number;
}

export interface BeamAnalysis {
  reactionLeft: number;
  reactionRight: number;
  fixedMoment: number;
  maxShear: number;
  maxMoment: number;
  maxMomentPosition: number;
  shear: DiagramPoint[];
  moment: DiagramPoint[];
}

const SAMPLE_INTERVALS = 100;

function samplePositions(length: number, breakpoints: number[]): number[] {
  const positions = Array.from(
    { length: SAMPLE_INTERVALS + 1 },
    (_, index) => (length * index) / SAMPLE_INTERVALS,
  );

  return [...new Set([...positions, ...breakpoints])]
    .filter((position) => position >= 0 && position <= length)
    .sort((a, b) => a - b);
}

function makePoints(
  positions: number[],
  valueAt: (x: number) => number,
): DiagramPoint[] {
  return positions.map((x) => ({ x, value: valueAt(x) }));
}

/**
 * Calculates reactions and internal force diagrams for a beam with one point
 * load. Units are kN, m, and kN·m.
 */
export function calculateBeam(input: BeamInput): BeamAnalysis {
  const { type, length, load, position } = input;

  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError('Beam length must be greater than zero.');
  }
  if (!Number.isFinite(load) || load < 0) {
    throw new RangeError('Load must be zero or greater.');
  }
  if (!Number.isFinite(position) || position < 0 || position > length) {
    throw new RangeError('Load position must be within the beam.');
  }

  const positions = samplePositions(length, [position]);

  if (type === 'simply-supported') {
    const reactionLeft = (load * (length - position)) / length;
    const reactionRight = (load * position) / length;
    const shear: DiagramPoint[] = [];

    for (const x of positions) {
      if (x === position && position > 0 && position < length) {
        // Duplicate x positions draw the vertical shear jump at the point load.
        shear.push({ x, value: reactionLeft });
        shear.push({ x, value: reactionLeft - load });
      } else if (x === length && position === length) {
        // The load and right support reaction coincide at the beam endpoint.
        shear.push({ x, value: 0 });
      } else if (x === length && position < length) {
        // The right support reaction returns the shear diagram to zero.
        shear.push({ x, value: reactionLeft - load });
        shear.push({ x, value: 0 });
      } else {
        shear.push({
          x,
          value: x < position ? reactionLeft : reactionLeft - load,
        });
      }
    }

    const moment = makePoints(positions, (x) =>
      x < position
        ? reactionLeft * x
        : reactionLeft * x - load * (x - position),
    );
    const maxMoment = (load * position * (length - position)) / length;

    return {
      reactionLeft,
      reactionRight,
      fixedMoment: 0,
      maxShear:
        position > 0 && position < length
          ? Math.max(Math.abs(reactionLeft), Math.abs(reactionLeft - load))
          : 0,
      maxMoment,
      maxMomentPosition: position,
      shear,
      moment,
    };
  }

  const reactionLeft = load;
  const fixedMoment = -load * position;
  const shear: DiagramPoint[] = [];

  for (const x of positions) {
    if (x === position && position > 0 && position < length) {
      // Duplicate x positions draw the vertical shear jump at the point load.
      shear.push({ x, value: load });
      shear.push({ x, value: 0 });
    } else {
      shear.push({ x, value: x < position ? load : 0 });
    }
  }

  const moment = makePoints(positions, (x) =>
    x < position ? -load * (position - x) : 0,
  );

  return {
    reactionLeft,
    reactionRight: 0,
    fixedMoment,
    maxShear: position > 0 ? load : 0,
    maxMoment: Math.abs(fixedMoment),
    maxMomentPosition: 0,
    shear,
    moment,
  };
}
