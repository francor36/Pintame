import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cliente } from '../entities/cliente.entity';
import { CreateClienteDto } from '../dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  async listar() {
    return this.clienteRepository.find({
      relations: {
        cuentaCorriente: true,
      },
    });
  }

  async crear(createClienteDto: CreateClienteDto) {
    const clienteExistente =
      await this.clienteRepository.findOne({
        where: {
          dni: createClienteDto.dni,
        },
      });

    if (clienteExistente) {
      throw new ConflictException(
        'Ya existe un cliente registrado con ese DNI',
      );
    }

    if (createClienteDto.email) {
      const emailExistente =
        await this.clienteRepository.findOne({
          where: {
            email: createClienteDto.email,
          },
        });

      if (emailExistente) {
        throw new ConflictException(
          'Ya existe un cliente registrado con ese email',
        );
      }
    }

    const cliente = this.clienteRepository.create({
      dni: createClienteDto.dni,
      nombre: createClienteDto.nombre,
      apellido: createClienteDto.apellido,
      email: createClienteDto.email ?? null,
      telefono: createClienteDto.telefono ?? null,
      direccion: createClienteDto.direccion ?? null,
    });

    return this.clienteRepository.save(cliente);
  }

  async buscarPorId(id: number) {
    const cliente =
      await this.clienteRepository.findOne({
        where: {
          id,
        },
        relations: {
          cuentaCorriente: true,
        },
      });

    if (!cliente) {
      throw new NotFoundException(
        `No existe el cliente con ID ${id}`,
      );
    }

    return cliente;
  }
}