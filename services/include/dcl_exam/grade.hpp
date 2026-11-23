#pragma once

#include <cmath>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace dcl::exam {

struct QuestionKey {
  std::string id;
  std::vector<std::string> correct_choice_ids;
};

struct GradeResult {
  int score{};
  int correct_count{};
  int total{};
  bool passed{};
};

inline GradeResult grade(
    const std::vector<QuestionKey>& questions,
    const std::unordered_map<std::string, std::string>& answers,
    int pass_percent) {
  if (questions.empty()) {
    throw std::invalid_argument("Exam must contain at least one question");
  }

  if (pass_percent < 0 || pass_percent > 100) {
    throw std::invalid_argument("Pass percentage must be between 0 and 100");
  }

  std::unordered_set<std::string> question_ids;
  int correct_count = 0;

  for (const auto& question : questions) {
    if (question.id.empty() || !question_ids.insert(question.id).second) {
      throw std::invalid_argument("Question IDs must be non-empty and unique");
    }

    std::unordered_set<std::string> correct_ids;
    for (const auto& id : question.correct_choice_ids) {
      if (id.empty()) {
        throw std::invalid_argument("Correct choice IDs must be non-empty");
      }
      correct_ids.insert(id);
    }

    if (correct_ids.empty()) {
      throw std::invalid_argument("Every question must have at least one correct choice");
    }

    const auto answer = answers.find(question.id);
    if (answer != answers.end() && correct_ids.contains(answer->second)) {
      ++correct_count;
    }
  }

  for (const auto& [question_id, unused] : answers) {
    (void)unused;
    if (!question_ids.contains(question_id)) {
      throw std::invalid_argument("Answer references an unknown question");
    }
  }

  const int total = static_cast<int>(questions.size());
  const int score = static_cast<int>(
      std::lround((static_cast<double>(correct_count) * 100.0) / total));

  return GradeResult{score, correct_count, total, score >= pass_percent};
}

}  // namespace dcl::exam