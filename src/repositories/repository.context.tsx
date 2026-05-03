import React, { createContext, ReactNode, useMemo } from "react";
import { supabaseClient } from "./supabase/supabase.client";
import { SupabaseAuthRepository } from "./supabase/auth.repository";
import { SupabaseProfileRepository } from "./supabase/profile.repository";
import { SupabaseVacationRepository } from "./supabase/vacation.repository";
import { SupabasePackingItemRepository } from "./supabase/packing-item.repository";
import { SupabaseCategoryRepository } from "./supabase/category.repository";
import { SupabaseTemplateRepository } from "./supabase/template.repository";
import { SupabaseOtaRepository } from "./supabase/ota.repository";
import { SupabaseTagRepository } from "./supabase/tag.repository";
import { SupabaseTaskTemplateRepository } from "./supabase/task-template.repository";
import { SupabaseLeftoverRepository } from "./supabase/leftover.repository";
import { SupabaseVacationTemplateRepository } from "./supabase/vacation-template.repository";
import { SupabaseIconRepository } from "./supabase/icon.repository";
import { SupabaseShoppingRepository } from "./supabase/shopping.repository";
import { SupabaseShoppingCategoryRepository } from "./supabase/shopping-category.repository";
import { SupabaseClassificationRepository } from "./supabase/classification.repository";
import { SupabaseBagTemplateRepository } from "./supabase/bag-template.repository";
import { SupabaseMealPlanRepository } from "./supabase/meal-plan.repository";
import { SupabaseRecipeRepository } from "./supabase/recipe.repository";
import { SupabaseRecipeCategoryRepository } from "./supabase/recipe-category.repository";
import { SupabaseRecipeTagRepository } from "./supabase/recipe-tag.repository";
import { SupabaseRecipeImportRepository } from "./supabase/recipe-import.repository";
import { SupabaseRecipeRatingRepository } from "./supabase/recipe-rating.repository";
import { SupabaseRecipeCommentRepository } from "./supabase/recipe-comment.repository";
import { SupabaseSuggestionRepository } from "./supabase/suggestion.repository";
import { SupabaseDishTypeRepository } from "./supabase/dish-type.repository";
import { SessionRepository } from "./supabase/session.repository";

import Constants from "expo-constants";

import type { IAuthRepository } from "./interfaces/auth.repository.interface";
import type { IProfileRepository } from "./interfaces/profile.repository.interface";
import type { IVacationRepository } from "./interfaces/vacation.repository.interface";
import type { IPackingItemRepository } from "./interfaces/packing-item.repository.interface";
import type { ICategoryRepository } from "./interfaces/category.repository.interface";
import type { ITemplateRepository } from "./interfaces/template.repository.interface";
import type { IOtaRepository } from "./interfaces/ota.repository.interface";
import type { ITagRepository } from "./interfaces/tag.repository.interface";
import type { ITaskTemplateRepository } from "./interfaces/task-template.repository.interface";
import type { ILeftoverRepository } from "./interfaces/leftover.repository.interface";
import type { IVacationTemplateRepository } from "./interfaces/vacation-template.repository.interface";
import type { IIconRepository } from "./interfaces/icon.repository.interface";
import type { IShoppingRepository } from "./interfaces/shopping.repository.interface";
import type { IShoppingCategoryRepository } from "./interfaces/shopping-category.repository.interface";
import type { IClassificationRepository } from "./interfaces/classification.repository.interface";
import type { IBagTemplateRepository } from "./interfaces/bag-template.repository.interface";
import type { IMealPlanRepository } from "./interfaces/meal-plan.repository.interface";
import type { IRecipeRepository } from "./interfaces/recipe.repository.interface";
import type { IRecipeCategoryRepository } from "./interfaces/recipe-category.repository.interface";
import type { IRecipeTagRepository } from "./interfaces/recipe-tag.repository.interface";
import type { IRecipeImportRepository } from "./interfaces/recipe-import.repository.interface";
import type { IRecipeRatingRepository } from "./interfaces/recipe-rating.repository.interface";
import type { IRecipeCommentRepository } from "./interfaces/recipe-comment.repository.interface";
import type { ISuggestionRepository } from "./interfaces/suggestion.repository.interface";
import type { IDishTypeRepository } from "./interfaces/dish-type.repository.interface";
import type { ISessionRepository } from "./interfaces/session.repository.interface";

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
  icon: IIconRepository;
  shopping: IShoppingRepository;
  shoppingCategory: IShoppingCategoryRepository;
  classification: IClassificationRepository;
  bagTemplate: IBagTemplateRepository;
  mealPlan: IMealPlanRepository;
  recipe: IRecipeRepository;
  recipeCategory: IRecipeCategoryRepository;
  recipeTag: IRecipeTagRepository;
  recipeImport: IRecipeImportRepository;
  recipeRating: IRecipeRatingRepository;
  recipeComment: IRecipeCommentRepository;
  suggestion: ISuggestionRepository;
  dishType: IDishTypeRepository;
  session: ISessionRepository;
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(
  null,
);

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
      icon: new SupabaseIconRepository(supabaseClient),
      shopping: new SupabaseShoppingRepository(supabaseClient),
      shoppingCategory: new SupabaseShoppingCategoryRepository(supabaseClient),
      classification: new SupabaseClassificationRepository(supabaseClient),
      bagTemplate: new SupabaseBagTemplateRepository(supabaseClient),
      mealPlan: new SupabaseMealPlanRepository(supabaseClient),
      recipe: new SupabaseRecipeRepository(supabaseClient),
      recipeCategory: new SupabaseRecipeCategoryRepository(supabaseClient),
      recipeTag: new SupabaseRecipeTagRepository(supabaseClient),
      recipeImport: new SupabaseRecipeImportRepository(supabaseClient),
      recipeRating: new SupabaseRecipeRatingRepository(supabaseClient),
      recipeComment: new SupabaseRecipeCommentRepository(supabaseClient),
      suggestion: new SupabaseSuggestionRepository(supabaseClient),
      dishType: new SupabaseDishTypeRepository(supabaseClient),
      session: new SessionRepository(
        Constants.expoConfig?.extra?.harnessUrl ?? "",
        () =>
          supabaseClient.auth
            .getSession()
            .then((r) => r.data.session?.access_token ?? null),
      ),
    }),
    [],
  );

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}
