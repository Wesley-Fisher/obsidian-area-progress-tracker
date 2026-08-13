npm run build

Copy-Item ".\dist\main.js" -Destination ".\\test-vault-area-progress-tracker\\.obsidian\\plugins\\area-progress-tracker\\" -Force
Copy-Item ".\manifest.json" -Destination ".\\test-vault-area-progress-tracker\\.obsidian\\plugins\\area-progress-tracker\\" -Force

Copy-Item ".\\test-vault-area-progress-tracker\\ProgressTrackerSource\\*.json" -Destination ".\\test-vault-area-progress-tracker\\ProgressTracker\\" -Force
Copy-Item ".\\test-vault-area-progress-tracker\\ProgressTrackerSource\\logs\\2026" -Destination ".\\test-vault-area-progress-tracker\\ProgressTracker\\logs" -Recurse -Force


$mar04 = ".\test-vault-area-progress-tracker\\ProgressTracker\\logs\\2026\\03\\apt.2026-03-04.json"
if (Test-Path $mar04) {
    Remove-Item $mar04
}