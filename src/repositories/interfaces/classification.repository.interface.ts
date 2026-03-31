export interface ClassificationResult {
  category: string;
  parsedName: string;
  quantityNote: string | null;
}

export interface IClassificationRepository {
  classifyItem(itemName: string, categories: string[]): Promise<ClassificationResult>;
}
