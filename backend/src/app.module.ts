import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { RequestModule } from './request/request.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DonorModule } from './donor/donor.module';
import { BlogModule } from './blog/blog.module';
import { MasterDataModule } from './master-data/master-data.module';
import { EducationModule } from './education/education.module';
import { MailModule } from './mail/mail.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    InventoryModule,
    RequestModule,
    AuthModule,
    UsersModule,
    DonorModule,
    BlogModule,
    MasterDataModule,
    EducationModule,
    MailModule,
    NotificationsModule,
    SystemSettingsModule,
    SchedulesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}


