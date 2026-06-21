import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DonorModule } from './donor/donor.module';
import { BlogModule } from './blog/blog.module';
import { MailModule } from './mail/mail.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { EducationModule } from './education/education.module';
import { SchedulesModule } from './schedules/schedules.module';
import { MasterDataModule } from './master-data/master-data.module';
import { RequestModule } from './request/request.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    InventoryModule,
    AuthModule,
    UsersModule,
    DonorModule,
    BlogModule,
    MailModule,
    NotificationsModule,
    DonorModule,
    EducationModule,
    SchedulesModule,
    MasterDataModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }


