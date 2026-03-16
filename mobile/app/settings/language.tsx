import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@i18n";
import { useLanguageStore } from "@stores/useLanguageStore";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  uk: "Українська",
};

const LANGUAGE_NATIVE_FLAGS: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  uk: "🇺🇦",
};

const LanguageScreen = () => {
  const { t, i18n: reactiveI18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const currentLang = reactiveI18n.language as SupportedLanguage;

  const handleSelect = (lang: SupportedLanguage) => {
    if (lang === currentLang) return;
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("home.settings.language")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {SUPPORTED_LANGUAGES.map((lang, index) => {
            const isSelected = lang === currentLang;
            const isLast = index === SUPPORTED_LANGUAGES.length - 1;

            return (
              <Pressable
                key={lang}
                style={({ pressed }) => [
                  s.row,
                  !isLast && s.rowDivider,
                  pressed && s.pressed,
                ]}
                onPress={() => handleSelect(lang)}
              >
                <Typography variant="body" style={s.flag}>
                  {LANGUAGE_NATIVE_FLAGS[lang]}
                </Typography>

                <Typography variant="label" style={s.label}>
                  {LANGUAGE_LABELS[lang]}
                </Typography>

                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  } as ViewStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 52,
  } as ViewStyle,
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  flag: {
    fontSize: 22,
  },
  label: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default LanguageScreen;
