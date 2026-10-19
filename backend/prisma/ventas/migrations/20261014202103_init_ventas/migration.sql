-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('PENDIENTE', 'PAGADA', 'ANULADA');

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "observacion" VARCHAR(500),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" SERIAL NOT NULL,
    "productoId" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "ventaId" INTEGER NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numero_key" ON "ventas"("numero");

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
