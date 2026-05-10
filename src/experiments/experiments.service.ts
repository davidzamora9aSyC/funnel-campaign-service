import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { CreateExperimentRequest } from './experiments.dto';
import type { Experiment, ExperimentAssignment, ExperimentStatus } from './experiments.types';

function normalizeWeights(variants: Array<{ key: string; weight: number }>): void {
  const sum = variants.reduce((acc, v) => acc + (Number.isFinite(v.weight) ? v.weight : 0), 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new BadRequestException('variants weights must be positive');
  }
  const rounded = Math.round(sum * 1_000_000) / 1_000_000;
  if (Math.abs(rounded - 1) > 1e-6) {
    throw new BadRequestException('variants weights must sum to 1.0');
  }
}

function deterministicBucket(seed: string): number {
  const digest = createHash('sha256').update(seed).digest();
  const num = digest.readUInt32BE(0);
  return num / 0xffffffff;
}

function chooseVariantKey(seed: string, variants: Array<{ key: string; weight: number }>): string {
  const r = deterministicBucket(seed);
  let acc = 0;
  for (const v of variants) {
    acc += v.weight;
    if (r <= acc) {
      return v.key;
    }
  }
  return variants[variants.length - 1]?.key ?? 'A';
}

@Injectable()
export class ExperimentsService {
  private readonly experimentsById = new Map<string, Experiment>();
  private readonly assignmentsByKey = new Map<string, ExperimentAssignment>();

  createExperiment(input: CreateExperimentRequest): Experiment {
    const name = input?.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const variants = Array.isArray(input?.variants) ? input.variants : [];
    if (!variants.length) {
      throw new BadRequestException('variants is required');
    }

    for (const v of variants) {
      if (!v?.key || !['A', 'B', 'C'].includes(v.key)) {
        throw new BadRequestException('variant key must be A|B|C');
      }
      if (!Number.isFinite(v.weight) || v.weight <= 0) {
        throw new BadRequestException('variant weight must be > 0');
      }
    }

    normalizeWeights(variants);

    const status: ExperimentStatus = input?.status ?? 'DRAFT';
    if (!['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'].includes(status)) {
      throw new BadRequestException('invalid status');
    }

    const now = new Date().toISOString();
    const experiment: Experiment = {
      experiment_id: randomUUID(),
      name,
      status,
      targeting: input?.targeting ?? undefined,
      variants: variants.map((v) => ({
        key: v.key,
        weight: v.weight,
        template_id: v.template_id,
        policy_flags: v.policy_flags,
      })),
      created_at: now,
      updated_at: now,
    };

    this.experimentsById.set(experiment.experiment_id, experiment);
    return experiment;
  }

  getExperiment(experimentId: string): Experiment {
    const experiment = this.experimentsById.get(experimentId);
    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }
    return experiment;
  }

  setStatus(experimentId: string, status: ExperimentStatus): Experiment {
    const experiment = this.getExperiment(experimentId);
    experiment.status = status;
    experiment.updated_at = new Date().toISOString();
    this.experimentsById.set(experiment.experiment_id, experiment);
    return experiment;
  }

  getOrCreateAssignment(experimentId: string, leadId: string): ExperimentAssignment {
    const cleanExperimentId = experimentId?.trim();
    const cleanLeadId = leadId?.trim();
    if (!cleanExperimentId) {
      throw new BadRequestException('experimentId is required');
    }
    if (!cleanLeadId) {
      throw new BadRequestException('leadId is required');
    }

    const experiment = this.getExperiment(cleanExperimentId);
    const key = `${cleanExperimentId}:${cleanLeadId}`;
    const existing = this.assignmentsByKey.get(key);
    if (existing) {
      return existing;
    }

    const variantKey = chooseVariantKey(key, experiment.variants);
    const assignment: ExperimentAssignment = {
      experiment_id: cleanExperimentId,
      lead_id: cleanLeadId,
      variant_key: variantKey,
      assigned_at: new Date().toISOString(),
    };
    this.assignmentsByKey.set(key, assignment);
    return assignment;
  }
}

