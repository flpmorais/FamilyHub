import { useEffect } from "react";
import { useDishTypeStore } from "../stores/dish-type.store";
import { useRepository } from "./use-repository";
import { useAuthStore } from "../stores/auth.store";
import type { DishType, DishTypeKey } from "../types/dish-type.types";
import { FALLBACK_DISH_CATEGORY_STYLES } from "../constants/dish-category-styles";

export function useDishTypes(): {
  dishTypes: DishType[];
  byKey: Partial<Record<DishTypeKey, DishType>>;
  resolve: (key: DishTypeKey) => { name: string; color: string; icon: string };
} {
  const dishTypeRepo = useRepository("dishType");
  const { userAccount } = useAuthStore();
  const familyId = userAccount?.familyId ?? null;

  const { dishTypes, byKey, load } = useDishTypeStore();

  useEffect(() => {
    if (familyId) void load(dishTypeRepo, familyId);
  }, [familyId, dishTypeRepo, load]);

  const resolve = (key: DishTypeKey) => {
    const dt = byKey[key];
    if (dt) return { name: dt.name, color: dt.color, icon: dt.icon };
    const fallback =
      FALLBACK_DISH_CATEGORY_STYLES[key] ?? FALLBACK_DISH_CATEGORY_STYLES.other;
    return { name: fallback.label, color: fallback.color, icon: fallback.icon };
  };

  return { dishTypes, byKey, resolve };
}
