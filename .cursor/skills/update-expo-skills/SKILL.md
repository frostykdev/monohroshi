---
name: update-expo-skills
description: Fetch and update official Expo AI agent skills from https://github.com/expo/skills into ~/.cursor/skills/. Use when the user asks to update, refresh, or reinstall Expo skills, or when Expo skills may be outdated.
---

# Update Expo Skills

Pulls the latest skills from [expo/skills](https://github.com/expo/skills) and installs them into `~/.cursor/skills/`.

## Installed Skills

| Skill | Purpose |
|-------|---------|
| `building-native-ui` | Expo Router UI, navigation, animations, native components |
| `native-data-fetching` | Data fetching patterns with Expo Router loaders |
| `expo-api-routes` | API routes in Expo Router |
| `expo-dev-client` | Custom dev client builds |
| `expo-tailwind-setup` | NativeWind / Tailwind setup |
| `expo-ui-swift-ui` | SwiftUI native modules |
| `expo-ui-jetpack-compose` | Jetpack Compose native modules |
| `use-dom` | Expo DOM components |
| `expo-deployment` | EAS Build & Submit, App Store / Play Store deployment |
| `expo-cicd-workflows` | EAS CI/CD workflow configuration |
| `upgrading-expo` | Expo SDK upgrade guidance |

## Update Command

Run this to pull the latest version of all skills:

```bash
git clone --depth=1 https://github.com/expo/skills.git /tmp/expo-skills-clone && \
for skill_dir in $(find /tmp/expo-skills-clone/plugins -mindepth 4 -maxdepth 4 -name "SKILL.md" -exec dirname {} \;); do
  skill_name=$(basename "$skill_dir")
  rm -rf ~/.cursor/skills/"$skill_name"
  cp -r "$skill_dir" ~/.cursor/skills/"$skill_name"
  echo "Updated: $skill_name"
done && \
rm -rf /tmp/expo-skills-clone && \
echo "All Expo skills updated."
```

## Notes

- Skills auto-apply based on context — no slash commands needed.
- The `building-native-ui` skill includes rich `references/` sub-docs consulted on demand.
- To add the skills as a Cursor Remote Rule instead, go to **Settings → Rules & Commands → Project Rules → Add Rule → Remote Rule (GitHub)** and enter `https://github.com/expo/skills.git`.
