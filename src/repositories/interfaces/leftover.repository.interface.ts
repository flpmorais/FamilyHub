import {
  Leftover,
  CreateLeftoverInput,
  UpdateLeftoverInput,
} from "../../types/leftover.types";

export interface ILeftoverRepository {
  create(data: CreateLeftoverInput): Promise<Leftover>;
  update(id: string, data: UpdateLeftoverInput): Promise<Leftover>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Leftover>;
  getActive(familyId: string): Promise<Leftover[]>;
  getClosedPaginated(
    familyId: string,
    limit: number,
    offset: number,
  ): Promise<Leftover[]>;
  incrementEaten(id: string): Promise<Leftover>;
  throwOutRemaining(id: string): Promise<Leftover>;
}
