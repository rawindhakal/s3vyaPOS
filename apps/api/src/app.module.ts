import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PosModule } from './modules/pos/pos.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PartiesModule } from './modules/parties/parties.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { ShopModule } from './modules/shop/shop.module';
import { StaffModule } from './modules/staff/staff.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PublicModule } from './modules/public/public.module';
import { GiftCardsModule } from './modules/giftcards/giftcards.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AccountingModule,
    InventoryModule,
    PosModule,
    PaymentsModule,
    PartiesModule,
    PurchasingModule,
    RestaurantModule,
    ShopModule,
    StaffModule,
    ReservationsModule,
    PublicModule,
    GiftCardsModule,
    NotificationsModule,
    FeedbackModule,
    RecommendationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
