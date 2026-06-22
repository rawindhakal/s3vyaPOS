import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { VendorService } from './vendor.service';
import { CustomerService } from './customer.service';
import { SettlementService } from './settlement.service';
import { CreatePartyDto, SettlementDto, UpdatePartyDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class PartiesController {
  constructor(
    private vendors: VendorService,
    private customers: CustomerService,
    private settlements: SettlementService,
  ) {}

  // ── Vendors ──
  @Get('vendors')
  listVendors(@CurrentUser('shopId') shopId: string) {
    return this.vendors.list(shopId);
  }

  @Post('vendors')
  createVendor(@CurrentUser('shopId') shopId: string, @Body() dto: CreatePartyDto) {
    return this.vendors.create(shopId, dto);
  }

  @Patch('vendors/:id')
  updateVendor(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.vendors.update(shopId, id, dto);
  }

  @Get('vendors/:id/statement')
  vendorStatement(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.vendors.statement(shopId, id);
  }

  @Post('vendors/:id/pay')
  payVendor(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: SettlementDto,
  ) {
    return this.settlements.payVendor(shopId, id, dto);
  }

  // ── Customers ──
  @Get('customers')
  listCustomers(@CurrentUser('shopId') shopId: string) {
    return this.customers.list(shopId);
  }

  @Post('customers')
  createCustomer(@CurrentUser('shopId') shopId: string, @Body() dto: CreatePartyDto) {
    return this.customers.create(shopId, dto);
  }

  @Patch('customers/:id')
  updateCustomer(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.customers.update(shopId, id, dto);
  }

  @Get('customers/:id/statement')
  customerStatement(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.customers.statement(shopId, id);
  }

  @Post('customers/:id/receive')
  receiveFromCustomer(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: SettlementDto,
  ) {
    return this.settlements.receiveFromCustomer(shopId, id, dto);
  }
}
