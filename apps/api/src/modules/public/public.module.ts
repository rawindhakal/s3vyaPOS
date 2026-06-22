import { Module } from '@nestjs/common';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { PublicController } from './public.controller';

@Module({
  imports: [RestaurantModule],
  controllers: [PublicController],
})
export class PublicModule {}
