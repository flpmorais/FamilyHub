import { IconEntry } from '../../types/packing.types';

export interface IIconRepository {
  getIcons(): Promise<IconEntry[]>;
}
