import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Caja } from './caja.entity';

export enum TipoMovimientoCaja {
  INGRESO = 'INGRESO',
  RETIRO = 'RETIRO',
  VENTA = 'VENTA',
  GASTO = 'GASTO',
  AJUSTE = 'AJUSTE',
}

@Entity('movimientos_caja')
export class MovimientoCaja {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: TipoMovimientoCaja,
  })
  tipo!: TipoMovimientoCaja;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  monto!: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  descripcion!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referencia!: string | null;

  @CreateDateColumn()
  fecha!: Date;

  @ManyToOne(
    () => Caja,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'caja_id' })
  caja!: Caja;
}