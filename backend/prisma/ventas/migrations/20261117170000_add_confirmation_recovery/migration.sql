-- Additive recovery state for interrupted cross-service sale confirmations.
ALTER TYPE "EstadoVenta" ADD VALUE IF NOT EXISTS 'PROCESANDO';

ALTER TABLE "ventas"
  ADD COLUMN "confirmacionToken" VARCHAR(36),
  ADD COLUMN "confirmacionLeaseHasta" TIMESTAMP(3);
