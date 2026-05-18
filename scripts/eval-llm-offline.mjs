process.env.PRODUCTIZE_LLM_EVAL_COMMAND = `${process.execPath} test/fixtures/fake-llm-eval.mjs {prompt}`;
process.env.PRODUCTIZE_LLM_INPUT_COST_PER_1K = "0";
process.env.PRODUCTIZE_LLM_OUTPUT_COST_PER_1K = "0";
process.argv = [process.argv[0], process.argv[1], "--llm-only", "--llm-required", ...process.argv.slice(2)];

await import("./eval-productize.mjs");
