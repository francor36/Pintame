import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
} from 'typeorm';

import { CuentaCorriente } from './cuenta-corriente.entity';
import { MovimientoSaldo } from './movimiento-saldo.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
  })
  dni!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nombre!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  apellido!: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: true,
  })
  email!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  telefono!: string | null;

  @Column({
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  direccion!: string | null;

  @OneToOne(
    () => CuentaCorriente,
    (cuentaCorriente) => cuentaCorriente.cliente,
  )
  cuentaCorriente!: CuentaCorriente | null;

  @OneToMany(
    () => MovimientoSaldo,
    (movimientoSaldo) => movimientoSaldo.cliente,
  )
  movimientosSaldo!: MovimientoSaldo[];
}