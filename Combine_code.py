import os

output_filename = "combined_project_code.txt"
project_root = "." # Or specify your project's root directory

with open(output_filename, "w") as outfile:
    for root, dirs, files in os.walk(project_root):
        # Exclude directories if necessary (e.g., .git, node_modules)
        dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules']]

        for file in files:
            # Only include relevant code files
            if file.endswith(('.html', '.js', '.css', '.py', '.txt', '.md')) or file == 'LICENSE':
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as infile:
                        outfile.write(f"--- File: {filepath} ---\n")
                        outfile.write(infile.read())
                        outfile.write("\n\n") # Add some separation
                except Exception as e:
                    outfile.write(f"--- Could not read file: {filepath} - Error: {e} ---\n\n")

print(f"All code combined into {output_filename}")
