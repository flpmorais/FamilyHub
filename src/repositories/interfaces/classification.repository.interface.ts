export interface ClassificationResult {
  category: string;
  parsedName: string;
  quantityNote: string | null;
  isUrgent: boolean;
}

export interface IClassificationRepository {
  classifyItem(itemName: string, categories: string[]): Promise<ClassificationResult>;
}
