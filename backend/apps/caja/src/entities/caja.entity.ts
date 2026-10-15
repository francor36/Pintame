import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.CERRADA,
  })
  estado!: EstadoCaja;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoInicial!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoFinal!: number;

  @CreateDateColumn()
  fechaApertura!: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  fechaCierre!: Date | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  observacion!: string | null;
}