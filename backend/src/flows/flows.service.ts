import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowExecution } from './entities/flow-execution.entity';
import { CreateFlowDto } from './dto/create-flow.dto';
import { ExecuteFlowDto } from './dto/execute-flow.dto';
import { FlowExecutorService } from './flow-executor.service';

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    @InjectRepository(Flow)
    private readonly flowRepository: Repository<Flow>,
    @InjectRepository(FlowExecution)
    private readonly executionRepository: Repository<FlowExecution>,
    private readonly flowExecutorService: FlowExecutorService,
  ) {}

  async create(createFlowDto: CreateFlowDto): Promise<Flow> {
    try {
      this.logger.log('Creating flow with data:', createFlowDto);
      const flow = this.flowRepository.create(createFlowDto);
      const savedFlow = await this.flowRepository.save(flow);
      this.logger.log('Flow created successfully:', savedFlow.id);
      
      // Dynamic route registration will be handled by the controller
      
      return savedFlow;
    } catch (error) {
      this.logger.error('Error creating flow:', error);
      throw error;
    }
  }

  async findAll(): Promise<Flow[]> {
    return await this.flowRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Flow> {
    const flow = await this.flowRepository.findOne({ where: { id } });
    if (!flow) {
      throw new NotFoundException(`Flow with ID ${id} not found`);
    }
    return flow;
  }

  async update(id: string, updateFlowDto: Partial<CreateFlowDto>): Promise<Flow> {
    const flow = await this.findOne(id);
    Object.assign(flow, updateFlowDto);
    const updatedFlow = await this.flowRepository.save(flow);
    
    // Dynamic route registration will be handled by the controller
    
    return updatedFlow;
  }

  async remove(id: string): Promise<void> {
    const flow = await this.findOne(id);
    
    // Delete all executions first to avoid foreign key constraint issues
    await this.executionRepository.delete({ flow: { id } });
    
    // Then delete the flow
    await this.flowRepository.remove(flow);
  }

  async execute(id: string, executeFlowDto: ExecuteFlowDto): Promise<FlowExecution> {
    const flow = await this.findOne(id);
    
    const execution = this.executionRepository.create({
      flow,
      variables: executeFlowDto.variables || {},
      status: 'pending',
    });
    
    const savedExecution = await this.executionRepository.save(execution);
    
    // Execute asynchronously
    this.flowExecutorService.executeFlow(flow, savedExecution, executeFlowDto.variables).catch(error => {
      console.error(`Flow execution error: ${error.message}`);
    });
    
    return savedExecution;
  }

  async getExecution(executionId: string): Promise<FlowExecution> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
      relations: ['flow'],
    });
    
    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`);
    }
    
    return execution;
  }

  async getFlowExecutions(flowId: string): Promise<FlowExecution[]> {
    const flow = await this.findOne(flowId);
    return await this.executionRepository.find({
      where: { flow: { id: flow.id } },
      order: { startedAt: 'DESC' },
      relations: ['flow'],
    });
  }

  async stopExecution(executionId: string): Promise<FlowExecution> {
    const execution = await this.getExecution(executionId);
    
    if (execution.status === 'running' || execution.status === 'pending') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      execution.error = 'Execution cancelled by user';
      
      const savedExecution = await this.executionRepository.save(execution);
      
      // Notify executor service to stop execution
      this.flowExecutorService.stopExecution(executionId);
      
      return savedExecution;
    }
    
    return execution;
  }
}