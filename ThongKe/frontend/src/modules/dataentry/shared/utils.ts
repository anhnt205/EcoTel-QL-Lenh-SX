interface FuelFields {
  initialFuel: number | "";
  receivedFuel: number | "";
  finalFuel: number | "";
}

export const computeFuelUsed = (s: FuelFields): number =>
  Math.max(
    0,
    (Number(s.initialFuel) || 0) +
      (Number(s.receivedFuel) || 0) -
      (Number(s.finalFuel) || 0),
  );
