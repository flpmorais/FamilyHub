// Interfaces (type-only exports — no runtime overhead)
export type { IAuthRepository } from './interfaces/auth.repository.interface';
export type { IProfileRepository } from './interfaces/profile.repository.interface';
export type { IVacationRepository } from './interfaces/vacation.repository.interface';
export type { IPackingItemRepository } from './interfaces/packing-item.repository.interface';
export type { ICategoryRepository } from './interfaces/category.repository.interface';
export type { ITemplateRepository } from './interfaces/template.repository.interface';
export type { IOtaRepository } from './interfaces/ota.repository.interface';
export type { ILeftoverRepository } from './interfaces/leftover.repository.interface';
export type { IShoppingRepository } from './interfaces/shopping.repository.interface';
export type { IShoppingCategoryRepository } from './interfaces/shopping-category.repository.interface';
export type { IClassificationRepository } from './interfaces/classification.repository.interface';
export type { IMealPlanRepository } from './interfaces/meal-plan.repository.interface';
// Context provider and hook
export { RepositoryProvider, RepositoryContext } from './repository.context';
export type { RepositoryContextValue } from './repository.context';
