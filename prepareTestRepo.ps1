npm run build

Copy-Item ".\dist\main.js" -Destination ".\\test-vault-area-progress-tracker\\.obsidian\\plugins\\area-progress-tracker\\" -Force
Copy-Item ".\manifest.json" -Destination ".\\test-vault-area-progress-tracker\\.obsidian\\plugins\\area-progress-tracker\\" -Force

Copy-Item ".\\test-vault-area-progress-tracker\\ProgressTrackerSource\\*.json" -Destination ".\\test-vault-area-progress-tracker\\ProgressTracker\\" -Force
Copy-Item ".\\test-vault-area-progress-tracker\\ProgressTrackerSource\\logs\\*.json" -Destination ".\\test-vault-area-progress-tracker\\ProgressTracker\\logs" -Force