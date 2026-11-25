-- Additive attribution for new sales. Existing sales remain unassigned.
ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "usuarioId" INTEGER,
  ADD COLUMN IF NOT EXISTS "usuarioNombre" VARCHAR(150);
