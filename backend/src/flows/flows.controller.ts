import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, Inject } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { DynamicRouteService } from './dynamic-route.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { ExecuteFlowDto } from './dto/execute-flow.dto';
import { REQUEST } from '@nestjs/core';

@Controller('flows')
export class FlowsController {
  private readonly logger = new Logger(FlowsController.name);

  constructor(
    private readonly flowsService: FlowsService,
    private readonly dynamicRouteService: DynamicRouteService,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  @Post()
  async create(@Body() createFlowDto: CreateFlowDto) {
    this.logger.log('Creating flow:', createFlowDto);
    const flow = await this.flowsService.create(createFlowDto);
    
    // Register dynamic route if API config is provided
    if (flow.apiConfig && flow.apiConfig.route) {
      const app = this.request.app;
      await this.dynamicRouteService.registerRoute(app, flow);
    }
    
    return flow;
  }

  @Get()
  findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFlowDto: Partial<CreateFlowDto>) {
    const flow = await this.flowsService.update(id, updateFlowDto);
    
    // Update dynamic route if API config is provided
    if (flow.apiConfig && flow.apiConfig.route) {
      const app = this.request.app;
      await this.dynamicRouteService.updateFlowRoute(flow, app);
    }
    
    return flow;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flowsService.remove(id);
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Body() executeFlowDto: ExecuteFlowDto) {
    return this.flowsService.execute(id, executeFlowDto);
  }

  @Get(':id/executions')
  getFlowExecutions(@Param('id') id: string) {
    return this.flowsService.getFlowExecutions(id);
  }

  @Get('executions/:executionId')
  getExecution(@Param('executionId') executionId: string) {
    return this.flowsService.getExecution(executionId);
  }

  @Get('registered-routes')
  getRegisteredRoutes() {
    return this.dynamicRouteService.getRegisteredRoutes();
  }
}