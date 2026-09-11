import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cliente } from '../entities/cliente.entity';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';

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
      activo: true,
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

  async actualizar(
    id: number,
    updateClienteDto: UpdateClienteDto,
  ) {
    const cliente = await this.buscarPorId(id);

    if (
      updateClienteDto.email &&
      updateClienteDto.email !== cliente.email
    ) {
      const emailExistente =
        await this.clienteRepository.findOne({
          where: {
            email: updateClienteDto.email,
          },
        });

      if (
        emailExistente &&
        emailExistente.id !== cliente.id
      ) {
        throw new ConflictException(
          'Ya existe un cliente registrado con ese email',
        );
      }
    }

    Object.assign(cliente, updateClienteDto);

    return this.clienteRepository.save(cliente);
  }

  async desactivar(id: number) {
    const cliente = await this.buscarPorId(id);

    if (!cliente.activo) {
      throw new ConflictException(
        'El cliente ya se encuentra desactivado',
      );
    }

    cliente.activo = false;

    return this.clienteRepository.save(cliente);
  }

  async activar(id: number) {
    const cliente = await this.buscarPorId(id);

    if (cliente.activo) {
      throw new ConflictException(
        'El cliente ya se encuentra activo',
      );
    }

    cliente.activo = true;

    return this.clienteRepository.save(cliente);
  }
}