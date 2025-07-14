import { Injectable, Logger } from '@nestjs/common';
import { Express, Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowExecutorService } from './flow-executor.service';
import { FlowExecution } from './entities/flow-execution.entity';
import { rateLimit } from 'express-rate-limit';

@Injectable()
export class DynamicRouteService {
  private readonly logger = new Logger(DynamicRouteService.name);
  private registeredRoutes = new Map<string, string>(); // route -> flowId
  
  constructor(
    @InjectRepository(Flow)
    private readonly flowRepository: Repository<Flow>,
    @InjectRepository(FlowExecution)
    private readonly executionRepository: Repository<FlowExecution>,
    private readonly flowExecutorService: FlowExecutorService,
  ) {}

  async registerFlowRoutes(app: Express) {
    const flows = await this.flowRepository.find({ where: { isActive: true } });
    
    for (const flow of flows) {
      if (flow.apiConfig && flow.apiConfig.route) {
        this.registerRoute(app, flow);
      }
    }
  }

  registerRoute(app: Express, flow: Flow) {
    const { route, method, requiresAuth, rateLimit: rateLimitConfig } = flow.apiConfig;
    const fullRoute = route;

    // Remove existing route if it exists
    if (this.registeredRoutes.has(fullRoute)) {
      this.logger.log(`Updating route: ${method} ${fullRoute}`);
    }

    // Create middleware array
    const middlewares: any[] = [];

    // Add authentication middleware if required
    if (requiresAuth) {
      middlewares.push(this.authMiddleware);
    }

    // Add rate limiting if configured
    if (rateLimitConfig) {
      const limiter = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.maxRequests,
        message: 'Too many requests from this IP, please try again later.',
      });
      middlewares.push(limiter);
    }

    // Add the main handler
    const handler = async (req: Request, res: Response) => {
      try {
        // Extract parameters based on configuration
        const variables: Record<string, any> = {};
        
        if (flow.apiConfig.parameters) {
          for (const param of flow.apiConfig.parameters) {
            let value;
            
            switch (param.type) {
              case 'query':
                value = req.query[param.name];
                break;
              case 'body':
                value = req.body[param.name];
                break;
              case 'param':
                value = req.params[param.name];
                break;
            }

            if (param.required && !value) {
              return res.status(400).json({
                error: `Missing required parameter: ${param.name}`,
              });
            }

            variables[param.name] = value || param.defaultValue;
          }
        }

        // Create execution record
        const execution = this.executionRepository.create({
          flow,
          status: 'pending',
          results: {},
          startedAt: new Date(),
        });
        await this.executionRepository.save(execution);

        // Execute the flow
        const result = await this.flowExecutorService.executeFlow(flow, execution, variables);

        // Format response based on configuration
        const responseType = flow.apiConfig.response?.type || 'json';
        
        switch (responseType) {
          case 'json':
            res.json({
              success: true,
              data: result.results,
              executionId: result.id,
            });
            break;
          case 'text':
            res.type('text/plain').send(String(result.results));
            break;
          case 'html':
            res.type('text/html').send(String(result.results));
            break;
          case 'binary':
            // Assume the result contains a base64 encoded file
            const buffer = Buffer.from(result.results.data || '', 'base64');
            res.type(result.results.mimeType || 'application/octet-stream').send(buffer);
            break;
        }
      } catch (error) {
        this.logger.error(`Error executing flow ${flow.id}:`, error);
        res.status(500).json({
          error: 'Flow execution failed',
          message: error.message,
        });
      }
    };

    // Register the route with the appropriate method
    switch (method.toLowerCase()) {
      case 'get':
        app.get(fullRoute, ...middlewares, handler);
        break;
      case 'post':
        app.post(fullRoute, ...middlewares, handler);
        break;
      case 'put':
        app.put(fullRoute, ...middlewares, handler);
        break;
      case 'delete':
        app.delete(fullRoute, ...middlewares, handler);
        break;
      case 'patch':
        app.patch(fullRoute, ...middlewares, handler);
        break;
    }

    this.registeredRoutes.set(fullRoute, flow.id);
    this.logger.log(`Registered flow route: ${method} ${fullRoute} -> Flow ${flow.id}`);
  }

  private authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key is required',
      });
    }

    // TODO: Validate API key against your auth service
    // For now, we'll accept any non-empty key
    if (apiKey) {
      next();
    } else {
      res.status(403).json({
        error: 'Invalid API key',
      });
    }
  };

  async updateFlowRoute(flow: Flow, app: Express) {
    if (flow.apiConfig && flow.apiConfig.route) {
      this.registerRoute(app, flow);
    }
  }

  getRegisteredRoutes() {
    return Array.from(this.registeredRoutes.entries()).map(([route, flowId]) => ({
      route,
      flowId,
    }));
  }
}