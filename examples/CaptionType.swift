struct LanguageIdResult {
    var top_language: String
    var language_confidences: [LanguageConfidence]
}

struct LanguageConfidence {
    var language: String
    var confidence: Double
}

