import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createPool } from 'mariadb';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [UsersController],
  providers: [
    {
      provide: 'USERS_DB',
      useFactory: () => createPool({
        host: process.env.MYSQL_HOST ?? 'localhost',
        port: Number(process.env.MYSQL_PORT ?? 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB,
        connectionLimit: 5,
      }),
    },
    UsersService,
  ],
})
export class UsersModule {}
