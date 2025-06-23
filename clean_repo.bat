@echo off
echo Cleaning repository of large files...

REM Remove large files from current index
git rm --cached -r "Lora Model/" 2>nul
git rm --cached "fine_tuning/scripts/miniconda.exe" 2>nul
git rm --cached "__pycache__/ollama_chatbot_server.cpython-312.pyc" 2>nul

REM Remove from Git history using filter-branch
echo Removing large files from Git history...
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch 'Lora Model/adapter_model.safetensors' 'fine_tuning/scripts/miniconda.exe' '__pycache__/ollama_chatbot_server.cpython-312.pyc'" --prune-empty --tag-name-filter cat -- --all

REM Clean up refs
echo Cleaning up references...
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo Repository cleaned! Now you can try to push again.
echo Run: git push origin main --force
pause 