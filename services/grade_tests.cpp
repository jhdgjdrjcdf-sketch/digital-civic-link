#include "dcl_exam/grade.hpp"

#include <cassert>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
  using dcl::exam::QuestionKey;

  const std::vector<QuestionKey> questions{
      {"q1", {"a"}},
      {"q2", {"c"}},
      {"q3", {"d"}},
  };

  const std::unordered_map<std::string, std::string> answers{
      {"q1", "a"},
      {"q2", "wrong"},
      {"q3", "d"},
  };

  const auto result = dcl::exam::grade(questions, answers, 60);
  assert(result.correct_count == 2);
  assert(result.total == 3);
  assert(result.score == 67);
  assert(result.passed);

  const auto partial = dcl::exam::grade(questions, {{"q1", "a"}}, 60);
  assert(partial.correct_count == 1);
  assert(partial.score == 33);
  assert(!partial.passed);

  bool rejected = false;
  try {
    (void)dcl::exam::grade({}, {}, 50);
  } catch (const std::invalid_argument&) {
    rejected = true;
  }
  assert(rejected);

  rejected = false;
  try {
    (void)dcl::exam::grade({{"q1", {"a"}}, {"q1", {"b"}}}, {}, 50);
  } catch (const std::invalid_argument&) {
    rejected = true;
  }
  assert(rejected);

  rejected = false;
  try {
    (void)dcl::exam::grade(questions, {{"unknown", "a"}}, 50);
  } catch (const std::invalid_argument&) {
    rejected = true;
  }
  assert(rejected);

  return 0;
}