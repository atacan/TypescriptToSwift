struct LanguageIdResult {
    var top_language: String
    var language_confidences: [LanguageConfidence]
}

struct LanguageConfidence {
    var language: String
    var confidence: Double
}

enum TranslationModel: String {
    case standard = "standard"
    case premium = "premium"
}

struct TranslationLanguageOptions {
    var language: String
    var model: TranslationModel?
}

