import { Tag } from '../../types/packing.types';

export interface ITagRepository {
  getTags(familyId: string): Promise<Tag[]>;
  createTag(familyId: string, name: string, color?: string): Promise<Tag>;
  updateTag(id: string, name: string, color?: string): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  countItemsUsingTag(tagId: string): Promise<number>;
  setActive(id: string, active: boolean): Promise<Tag>;
}
