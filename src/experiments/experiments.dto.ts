import type { Experiment } from './experiments.types';

export type CreateExperimentRequest = Omit<Experiment, 'experiment_id' | 'created_at' | 'updated_at'> & {
  experiment_id?: string;
};
