import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { TableService } from './table.service';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  CreateTableDto,
  SetOrderItemsDto,
  SettleOrderDto,
  UpdateTableDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TableController {
  constructor(private tables: TableService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.tables.listWithOrders(shopId);
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateTableDto) {
    return this.tables.create(shopId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tables.update(shopId, id, dto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private orders: OrderService) {}

  @Get('open')
  listOpen(@CurrentUser('shopId') shopId: string) {
    return this.orders.listOpen(shopId);
  }

  @Get('pending-kot')
  pendingKot(@CurrentUser('shopId') shopId: string) {
    return this.orders.listPendingKot(shopId);
  }

  @Post()
  create(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(shopId, dto, userId);
  }

  @Get('by-table/:tableId')
  byTable(@CurrentUser('shopId') shopId: string, @Param('tableId') tableId: string) {
    return this.orders.getOpenForTable(shopId, tableId);
  }

  @Get(':id')
  get(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.orders.get(shopId, id);
  }

  @Get(':id/logs')
  logs(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.orders.listLogs(shopId, id);
  }

  @Put(':id/items')
  setItems(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SetOrderItemsDto,
  ) {
    return this.orders.setItems(shopId, id, dto, userId);
  }

  @Post(':id/send-kot')
  sendKot(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.orders.sendToKitchen(shopId, id, userId);
  }

  @Post(':id/kot-printed')
  kotPrinted(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.orders.markKotPrinted(shopId, id);
  }

  @Post(':id/settle')
  settle(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SettleOrderDto,
  ) {
    return this.orders.settle(shopId, id, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.orders.cancel(shopId, id, userId);
  }
}
