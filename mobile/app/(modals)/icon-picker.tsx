import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import {
  ICON_SECTIONS,
  ICON_PRESET_COLORS,
  DEFAULT_ICON_COLOR,
} from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { usePickerStore } from "@stores/usePickerStore";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const NUM_COLUMNS = 5;
const ICON_GAP = 12;
const H_PADDING = 20;

const IconPickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cellSize = Math.floor(
    (width - H_PADDING * 2 - ICON_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
  );
  const { selectedIcon, selectedColor, hideColorBar } = useLocalSearchParams<{
    selectedIcon?: string;
    selectedColor?: string;
    hideColorBar?: string;
  }>();
  const colorBarHidden = hideColorBar === "true";
  const setIcon = usePickerStore((s) => s.setIcon);
  const [activeColor, setActiveColor] = useState(
    selectedColor ?? DEFAULT_ICON_COLOR,
  );

  const handleIconPress = (icon: IoniconsName) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    setIcon(icon, activeColor);
    router.back();
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t("onboarding.accountSetup.chooseIcon")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: colorBarHidden ? Math.max(insets.bottom, 24) : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ICON_SECTIONS.map((section) => (
          <View key={section.titleKey}>
            <View style={s.sectionHeader}>
              <Typography variant="caption" color="textSecondary">
                {t(section.titleKey as never)}
              </Typography>
            </View>
            <View style={s.iconsGrid}>
              {section.icons.map((icon) => {
                const isSelected = icon === selectedIcon;
                return (
                  <Pressable
                    key={icon}
                    style={({ pressed }) => [pressed && s.pressed]}
                    onPress={() => handleIconPress(icon)}
                  >
                    <View
                      style={[
                        s.iconCircle,
                        {
                          backgroundColor: activeColor,
                          width: cellSize,
                          height: cellSize,
                          borderRadius: cellSize / 2,
                        },
                        isSelected && s.iconCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={cellSize * 0.4}
                        color={colors.textOnAccent}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {!colorBarHidden && (
        <View
          style={[s.colorBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {ICON_PRESET_COLORS.map((color) => {
            const isActive = color === activeColor;
            return (
              <Pressable
                key={color}
                onPress={() => {
                  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
                  setActiveColor(color);
                }}
                style={[s.colorDot, isActive && s.colorDotActive]}
              >
                <View style={[s.colorDotInner, { backgroundColor: color }]} />
              </Pressable>
            );
          })}
        </View>
      )}
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
    paddingHorizontal: H_PADDING,
  } as ViewStyle,
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
  } as ViewStyle,
  iconsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ICON_GAP,
    marginBottom: ICON_GAP,
  } as ViewStyle,
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "transparent",
  } as ViewStyle,
  iconCircleSelected: {
    borderColor: colors.textOnAccent,
  } as ViewStyle,
  pressed: {
    opacity: 0.7,
  } as ViewStyle,
  colorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 14,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "transparent",
  } as ViewStyle,
  colorDotActive: {
    borderColor: colors.textPrimary,
  } as ViewStyle,
  colorDotInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
  } as ViewStyle,
});

export default IconPickerScreen;
