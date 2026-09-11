import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Cliente } from './cliente.entity';

export enum TipoMovimientoSaldo {
  NTDC = 'NTDC',
  CONSUMO = 'CONSUMO',
  AJUSTE = 'AJUSTE',
}

export enum EstadoMovimientoSaldo {
  ACTIVO = 'ACTIVO',
  CONSUMIDO = 'CONSUMIDO',
  VENCIDO = 'VENCIDO',
  ANULADO = 'ANULADO',
}

@Entity('movimientos_saldo')
export class MovimientoSaldo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: TipoMovimientoSaldo,
  })
  tipo!: TipoMovimientoSaldo;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  monto!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoDisponible!: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha!: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  fechaVencimiento!: Date | null;

  @Column({
    type: 'enum',
    enum: EstadoMovimientoSaldo,
    default: EstadoMovimientoSaldo.ACTIVO,
  })
  estado!: EstadoMovimientoSaldo;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referencia!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  observacion!: string | null;

  @ManyToOne(
    () => Cliente,
    (cliente) => cliente.movimientosSaldo,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'cliente_id' })
  cliente!: Cliente;
}