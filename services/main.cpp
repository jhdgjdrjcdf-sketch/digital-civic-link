#include <httplib.h>
#include <nlohmann/json.hpp>

#include <cstdlib>
#include <iostream>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>
#include <vector>

#include "dcl_exam/grade.hpp"

namespace {

using json = nlohmann::json;

std::string get_env(const char* name) {
  const char* value = std::getenv(name);
  return value == nullptr ? "" : std::string(value);
}

bool constant_time_equal(std::string_view left, std::string_view right) {
  if (left.size() != right.size()) {
    return false;
  }

  unsigned char difference = 0;
  for (std::size_t i = 0; i < left.size(); ++i) {
    difference |= static_cast<unsigned char>(left[i] ^ right[i]);
  }
  return difference == 0;
}

void respond_json(httplib::Response& response, int status, const json& body) {
  response.status = status;
  response.set_content(body.dump(), "application/json; charset=utf-8");
  response.set_header("Cache-Control", "no-store");
  response.set_header("X-Content-Type-Options", "nosniff");
}

}  // namespace

int main() {
  const std::string engine_secret = get_env("DCL_EXAM_ENGINE_SECRET");
  if (engine_secret.size() < 32) {
    std::cerr << "DCL_EXAM_ENGINE_SECRET must contain at least 32 characters.\n";
    return 1;
  }

  int port = 8080;
  const std::string port_value = get_env("PORT");
  if (!port_value.empty()) {
    try {
      port = std::stoi(port_value);
    } catch (const std::exception&) {
      std::cerr << "PORT must be a valid integer.\n";
      return 1;
    }
  }

  if (port < 1 || port > 65535) {
    std::cerr << "PORT must be between 1 and 65535.\n";
    return 1;
  }

  httplib::Server server;
  server.set_payload_max_length(64 * 1024);
  server.set_read_timeout(10, 0);
  server.set_write_timeout(10, 0);

  server.Get("/healthz", [](const httplib::Request&, httplib::Response& response) {
    respond_json(response, 200, {{"status", "ok"}, {"service", "dcl-exam-engine"}});
  });

  server.Post("/v1/grade", [&](const httplib::Request& request, httplib::Response& response) {
    const std::string supplied_secret = request.get_header_value("X-Engine-Secret");
    if (!constant_time_equal(supplied_secret, engine_secret)) {
      respond_json(response, 401, {{"error", "Unauthorized"}});
      return;
    }

    try {
      const json body = json::parse(request.body);

      if (!body.is_object() ||
          !body.contains("questions") ||
          !body.contains("answers") ||
          !body.contains("pass_percent") ||
          !body.at("questions").is_array() ||
          !body.at("answers").is_object() ||
          !body.at("pass_percent").is_number_integer()) {
        respond_json(response, 400, {{"error", "Invalid request shape"}});
        return;
      }

      std::vector<dcl::exam::QuestionKey> questions;
      questions.reserve(body.at("questions").size());

      for (const auto& item : body.at("questions")) {
        if (!item.is_object() ||
            !item.contains("id") ||
            !item.at("id").is_string() ||
            !item.contains("correct_choice_ids") ||
            !item.at("correct_choice_ids").is_array()) {
          respond_json(response, 400, {{"error", "Invalid question data"}});
          return;
        }

        dcl::exam::QuestionKey question;
        question.id = item.at("id").get<std::string>();

        for (const auto& choice_id : item.at("correct_choice_ids")) {
          if (!choice_id.is_string()) {
            respond_json(response, 400, {{"error", "Invalid correct choice"}});
            return;
          }
          question.correct_choice_ids.push_back(choice_id.get<std::string>());
        }

        questions.push_back(std::move(question));
      }

      std::unordered_map<std::string, std::string> answers;
      for (auto iterator = body.at("answers").begin();
           iterator != body.at("answers").end();
           ++iterator) {
        if (!iterator.value().is_string()) {
          respond_json(response, 400, {{"error", "Invalid answer value"}});
          return;
        }
        answers.emplace(iterator.key(), iterator.value().get<std::string>());
      }

      const int pass_percent = body.at("pass_percent").get<int>();
      const auto result = dcl::exam::grade(questions, answers, pass_percent);

      respond_json(response, 200, {
          {"score", result.score},
          {"correct_count", result.correct_count},
          {"total", result.total},
          {"passed", result.passed}
      });
    } catch (const json::parse_error&) {
      respond_json(response, 400, {{"error", "Request body must be valid JSON"}});
    } catch (const json::exception&) {
      respond_json(response, 400, {{"error", "Invalid request data"}});
    } catch (const std::invalid_argument& error) {
      respond_json(response, 422, {{"error", error.what()}});
    } catch (const std::exception&) {
      respond_json(response, 500, {{"error", "Internal grading error"}});
    }
  });

  std::cout << "DCL Exam Engine listening on port " << port << '\n';
  if (!server.listen("0.0.0.0", port)) {
    std::cerr << "Could not start the DCL Exam Engine listener.\n";
    return 1;
  }

  return 0;
}