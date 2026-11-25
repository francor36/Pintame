-- Optional coordinates captured in the foreground when the cashier chooses to attach location.
ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "ubicacionLatitud" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ubicacionLongitud" DOUBLE PRECISION;
