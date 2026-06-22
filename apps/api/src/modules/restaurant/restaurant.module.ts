import { Module } from '@nestjs/common';
import { PosModule } from '../pos/pos.module';
import { TableService } from './table.service';
import { OrderService } from './order.service';
import { TableController, OrderController } from './restaurant.controller';

@Module({
  imports: [PosModule],
  controllers: [TableController, OrderController],
  providers: [TableService, OrderService],
})
export class RestaurantModule {}
