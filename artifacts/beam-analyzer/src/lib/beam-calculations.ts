export type BeamType = 'simply-supported' | 'cantilever';

export interface PointLoad {
  id: string;
  magnitude: number;
  position: number;
}

export interface UniformLoad {
  intensity: number;
  start: number;
  end: number;
}

export interface BeamInput {
  type: BeamType;
  length: number;
  pointLoads: PointLoad[];
  distributedLoad: UniformLoad | null;
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
  const samples = Array.from(
    { length: SAMPLE_INTERVALS + 1 },
    (_, index) => (length * index) / SAMPLE_INTERVALS,
  );

  return [...new Set([...samples, ...breakpoints])]
    .filter((position) => position >= 0 && position <= length)
    .sort((a, b) => a - b);
}

/**
 * Calculates reactions and internal force diagrams for up to three downward
 * point loads and one downward, uniform load over a selected interval.
 * Units are kN, m, and kN·m.
 */
export function calculateBeam(input: BeamInput): BeamAnalysis {
  const { type, length, pointLoads, distributedLoad } = input;

  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError('Beam length must be greater than zero.');
  }
  if (pointLoads.length > 3) {
    throw new RangeError('A maximum of three point loads is supported.');
  }

  for (const pointLoad of pointLoads) {
    if (!Number.isFinite(pointLoad.magnitude) || pointLoad.magnitude < 0) {
      throw new RangeError('Point-load magnitude must be zero or greater.');
    }
    if (
      !Number.isFinite(pointLoad.position) ||
      pointLoad.position < 0 ||
      pointLoad.position > length
    ) {
      throw new RangeError('Point-load position must be within the beam.');
    }
  }

  if (distributedLoad) {
    if (!Number.isFinite(distributedLoad.intensity) || distributedLoad.intensity < 0) {
      throw new RangeError('Distributed-load intensity must be zero or greater.');
    }
    if (
      !Number.isFinite(distributedLoad.start) ||
      !Number.isFinite(distributedLoad.end) ||
      distributedLoad.start < 0 ||
      distributedLoad.end < distributedLoad.start ||
      distributedLoad.end > length
    ) {
      throw new RangeError('Distributed-load limits must be within the beam.');
    }
  }

  const distributedLength = distributedLoad
    ? distributedLoad.end - distributedLoad.start
    : 0;
  const distributedResultant = distributedLoad
    ? distributedLoad.intensity * distributedLength
    : 0;
  const totalLoad =
    pointLoads.reduce((total, load) => total + load.magnitude, 0) +
    distributedResultant;
  const totalMomentAboutLeft =
    pointLoads.reduce(
      (total, load) => total + load.magnitude * load.position,
      0,
    ) +
    (distributedLoad
      ? distributedResultant *
        ((distributedLoad.start + distributedLoad.end) / 2)
      : 0);

  const reactionRight =
    type === 'simply-supported' ? totalMomentAboutLeft / length : 0;
  const reactionLeft =
    type === 'simply-supported' ? totalLoad - reactionRight : totalLoad;
  const fixedMoment =
    type === 'cantilever' ? -totalMomentAboutLeft : 0;
  const breakpoints = [
    ...pointLoads.map((load) => load.position),
    ...(distributedLoad ? [distributedLoad.start, distributedLoad.end] : []),
  ];
  const positions = samplePositions(length, breakpoints);

  const distributedLengthTo = (x: number) => {
    if (!distributedLoad) return 0;
    return Math.max(
      0,
      Math.min(x, distributedLoad.end) - distributedLoad.start,
    );
  };

  const shearAt = (x: number, side: 'left' | 'right') => {
    const pointLoadToLeft = pointLoads.reduce((total, load) => {
      const isLeft = side === 'left'
        ? load.position < x
        : load.position <= x;
      return isLeft ? total + load.magnitude : total;
    }, 0);
    const distributedForceToLeft =
      (distributedLoad?.intensity ?? 0) * distributedLengthTo(x);

    return (
      (type === 'simply-supported' ? reactionLeft : totalLoad) -
      pointLoadToLeft -
      distributedForceToLeft
    );
  };

  const momentAt = (x: number) => {
    if (type === 'simply-supported') {
      const pointMoment = pointLoads.reduce(
        (total, load) =>
          total + load.magnitude * Math.max(0, x - load.position),
        0,
      );
      let distributedMoment = 0;
      if (distributedLoad && x > distributedLoad.start) {
        if (x <= distributedLoad.end) {
          distributedMoment =
            (distributedLoad.intensity *
              (x - distributedLoad.start) ** 2) /
            2;
        } else {
          distributedMoment =
            distributedResultant *
            (x - (distributedLoad.start + distributedLoad.end) / 2);
        }
      }
      return reactionLeft * x - pointMoment - distributedMoment;
    }

    const pointMoment = pointLoads.reduce(
      (total, load) =>
        total + load.magnitude * Math.max(0, load.position - x),
      0,
    );
    let distributedMoment = 0;
    if (distributedLoad) {
      if (x <= distributedLoad.start) {
        distributedMoment =
          distributedResultant *
          ((distributedLoad.start + distributedLoad.end) / 2 - x);
      } else if (x < distributedLoad.end) {
        distributedMoment =
          (distributedLoad.intensity * (distributedLoad.end - x) ** 2) / 2;
      }
    }
    return -pointMoment - distributedMoment;
  };

  const shear: DiagramPoint[] = [];
  for (const x of positions) {
    if (x === 0) {
      // The left reaction and any coincident point loads act at the boundary.
      shear.push({ x, value: 0 });
      shear.push({ x, value: shearAt(x, 'right') });
    } else if (x === length) {
      // The right support or free end returns the diagram to zero.
      shear.push({ x, value: shearAt(x, 'left') });
      shear.push({ x, value: 0 });
    } else if (pointLoads.some((load) => load.position === x)) {
      // Duplicate x positions preserve the shear jump at point loads.
      shear.push({ x, value: shearAt(x, 'left') });
      shear.push({ x, value: shearAt(x, 'right') });
    } else {
      shear.push({ x, value: shearAt(x, 'right') });
    }
  }

  let maxShear = 0;
  const momentCandidates = new Set(positions);
  for (let index = 0; index < positions.length - 1; index += 1) {
    const start = positions[index];
    const end = positions[index + 1];
    const shearStart = shearAt(start, 'right');
    const shearEnd = shearAt(end, 'left');
    maxShear = Math.max(
      maxShear,
      Math.abs(shearStart),
      Math.abs(shearEnd),
    );

    // Between load breakpoints, shear is linear and M is quadratic. Include
    // the exact zero-shear point so the reported maximum moment is not sampled.
    if (shearStart * shearEnd < 0) {
      const zeroShearPosition =
        start +
        ((-shearStart) / (shearEnd - shearStart)) * (end - start);
      momentCandidates.add(zeroShearPosition);
    }
  }

  let maxMoment = 0;
  let maxMomentPosition = 0;
  for (const x of momentCandidates) {
    const magnitude = Math.abs(momentAt(x));
    if (magnitude > maxMoment) {
      maxMoment = magnitude;
      maxMomentPosition = x;
    }
  }

  const moment = positions.map((x) => ({ x, value: momentAt(x) }));

  return {
    reactionLeft,
    reactionRight,
    fixedMoment,
    maxShear,
    maxMoment,
    maxMomentPosition,
    shear,
    moment,
  };
}
