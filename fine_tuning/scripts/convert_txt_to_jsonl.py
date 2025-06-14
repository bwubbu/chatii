import os
import json
import re

DATA_DIR = "Case Study Data"
OUTPUT_FILE = "case_study_data.jsonl"

def parse_scenarios_from_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by 'Scenario' (handles both Windows and Unix newlines)
    scenarios = re.split(r"\n\s*Scenario \d+: ", content)
    results = []
    for scenario in scenarios:
        if not scenario.strip():
            continue
        # Extract fields
        title_match = re.match(r"([^\n]+)", scenario)
        title = title_match.group(1).strip() if title_match else ""
        robot_type = re.search(r"Robot Type:\s*(.+)", scenario)
        interaction = re.search(r"Interaction Situation:\s*(.+)", scenario)
        behavior = re.search(r"Behavior:\s*(.+)", scenario)
        outcome = re.search(r"Outcome:\s*(.+)", scenario)

        # Compose instruction and output
        instruction = ""
        if robot_type:
            instruction += f"Robot Type: {robot_type.group(1).strip()}\n"
        if interaction:
            instruction += f"Interaction Situation: {interaction.group(1).strip()}\n"
        if behavior:
            instruction += f"Behavior: {behavior.group(1).strip()}"

        output = outcome.group(1).strip() if outcome else ""

        if instruction and output:
            results.append({"input": instruction, "output": output})
    return results

def main():
    all_examples = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".txt"):
            filepath = os.path.join(DATA_DIR, filename)
            examples = parse_scenarios_from_file(filepath)
            all_examples.extend(examples)
            print(f"Parsed {len(examples)} examples from {filename}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out_f:
        for ex in all_examples:
            json.dump(ex, out_f)
            out_f.write("\n")
    print(f"Saved {len(all_examples)} examples to {OUTPUT_FILE}")

if __name__ == "__main__":
    main() 