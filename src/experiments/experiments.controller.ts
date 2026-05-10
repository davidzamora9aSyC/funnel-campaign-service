import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import type { CreateExperimentRequest } from './experiments.dto';

@Controller('v1/experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Post()
  createExperiment(@Body() body: CreateExperimentRequest): { experiment: unknown } {
    return { experiment: this.experimentsService.createExperiment(body) };
  }

  @Get(':experimentId')
  getExperiment(@Param('experimentId') experimentId: string): { experiment: unknown } {
    return { experiment: this.experimentsService.getExperiment(experimentId) };
  }

  @Post(':experimentId/start')
  startExperiment(@Param('experimentId') experimentId: string): { experiment: unknown } {
    return { experiment: this.experimentsService.setStatus(experimentId, 'RUNNING') };
  }

  @Post(':experimentId/pause')
  pauseExperiment(@Param('experimentId') experimentId: string): { experiment: unknown } {
    return { experiment: this.experimentsService.setStatus(experimentId, 'PAUSED') };
  }

  @Get(':experimentId/assignments/:leadId')
  getAssignment(
    @Param('experimentId') experimentId: string,
    @Param('leadId') leadId: string,
  ): { assignment: unknown } {
    return { assignment: this.experimentsService.getOrCreateAssignment(experimentId, leadId) };
  }
}

