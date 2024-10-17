/**
 * Language id result model.
 * See https://docs.rev.ai/api/language-identification/reference/#operation/GetLanguageIdentificationResultById for more details.
 */
export interface LanguageIdResult {
  top_language: string;
  language_confidences: LanguageConfidence[];
}

/** Language id language confidence */
export interface LanguageConfidence {
  language: string;
  confidence: number;
}

/* eslint-disable no-shadow */
/** Supported model types for translation. */
export enum TranslationModel {
  STANDARD = "standard",
  PREMIUM = "premium",
}

import { TranslationModel } from "./TranslationModel";

export interface TranslationLanguageOptions {
  language: string;
  model?: TranslationModel;
}
