import React, { createContext, ReactNode, useMemo } from 'react';
import { supabaseClient } from './supabase/supabase.client';
import { SupabaseAuthRepository } from './supabase/auth.repository';
import { SupabaseProfileRepository } from './supabase/profile.repository';
import { SupabaseVacationRepository } from './supabase/vacation.repository';
import { SupabasePackingItemRepository } from './supabase/packing-item.repository';
import { SupabaseCategoryRepository } from './supabase/category.repository';
import { SupabaseTemplateRepository } from './supabase/template.repository';
import { SupabaseOtaRepository } from './supabase/ota.repository';
import { SupabaseTagRepository } from './supabase/tag.repository';
import { SupabaseTaskTemplateRepository } from './supabase/task-template.repository';
import { SupabaseLeftoverRepository } from './supabase/leftover.repository';
import { SupabaseVacationTemplateRepository } from './supabase/vacation-template.repository';

import type { IAuthRepository } from './interfaces/auth.repository.interface';
import type { IProfileRepository } from './interfaces/profile.repository.interface';
import type { IVacationRepository } from './interfaces/vacation.repository.interface';
import type { IPackingItemRepository } from './interfaces/packing-item.repository.interface';
import type { ICategoryRepository } from './interfaces/category.repository.interface';
import type { ITemplateRepository } from './interfaces/template.repository.interface';
import type { IOtaRepository } from './interfaces/ota.repository.interface';
import type { ITagRepository } from './interfaces/tag.repository.interface';
import type { ITaskTemplateRepository } from './interfaces/task-template.repository.interface';
import type { ILeftoverRepository } from './interfaces/leftover.repository.interface';
import type { IVacationTemplateRepository } from './interfaces/vacation-template.repository.interface';

export interface RepositoryContextValue {
  auth: IAuthRepository;
  profile: IProfileRepository;
  vacation: IVacationRepository;
  packingItem: IPackingItemRepository;
  category: ICategoryRepository;
  template: ITemplateRepository;
  tag: ITagRepository;
  taskTemplate: ITaskTemplateRepository;
  ota: IOtaRepository;
  leftover: ILeftoverRepository;
  vacationTemplate: IVacationTemplateRepository;
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo<RepositoryContextValue>(
    () => ({
      auth: new SupabaseAuthRepository(supabaseClient),
      profile: new SupabaseProfileRepository(supabaseClient),
      vacation: new SupabaseVacationRepository(supabaseClient),
      packingItem: new SupabasePackingItemRepository(supabaseClient),
      category: new SupabaseCategoryRepository(supabaseClient),
      tag: new SupabaseTagRepository(supabaseClient),
      template: new SupabaseTemplateRepository(supabaseClient),
      taskTemplate: new SupabaseTaskTemplateRepository(supabaseClient),
      ota: new SupabaseOtaRepository(supabaseClient),
      leftover: new SupabaseLeftoverRepository(supabaseClient),
      vacationTemplate: new SupabaseVacationTemplateRepository(supabaseClient),
    }),
    []
  );

  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}
