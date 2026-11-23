# DCL Exam Engine (C++)

Private grading service for Digital Civic Link. It accepts grading payloads only from the Supabase Edge Function, protected by `X-Engine-Secret`.

## Local build and tests

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure