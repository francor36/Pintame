-- Add nullable audit fields so existing cash boxes remain unchanged.
ALTER TABLE `cajas`
  ADD COLUMN `usuarioAperturaId` INT NULL,
  ADD COLUMN `usuarioAperturaNombre` VARCHAR(150) NULL,
  ADD COLUMN `usuarioCierreId` INT NULL,
  ADD COLUMN `usuarioCierreNombre` VARCHAR(150) NULL;
