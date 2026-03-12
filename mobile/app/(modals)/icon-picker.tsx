import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { ICON_SECTIONS, ICON_PRESET_COLORS } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { usePickerStore } from "@stores/usePickerStore";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const NUM_COLUMNS = 4;
const ICON_SIZE = 64;
const ICON_GAP = 12;

const IconPickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selectedIcon, selectedColor } = useLocalSearchParams<{
    selectedIcon?: string;
    selectedColor?: string;
  }>();
  const setIcon = usePickerStore((s) => s.setIcon);
  const [activeColor, setActiveColor] = useState(
    selectedColor ?? ICON_PRESET_COLORS[0],
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
        contentContainerStyle={[s.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {ICON_SECTIONS.map((section) => {
          const rows: IoniconsName[][] = [];
          for (let i = 0; i < section.icons.length; i += NUM_COLUMNS) {
            rows.push(section.icons.slice(i, i + NUM_COLUMNS));
          }
          return (
            <View key={section.titleKey}>
              <View style={s.sectionHeader}>
                <Typography variant="caption" color="textSecondary">
                  {t(section.titleKey as never)}
                </Typography>
              </View>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={s.iconRow}>
                  {row.map((icon) => {
                    const isSelected = icon === selectedIcon;
                    return (
                      <Pressable
                        key={icon}
                        style={({ pressed }) => [
                          s.iconCell,
                          pressed && s.pressed,
                        ]}
                        onPress={() => handleIconPress(icon)}
                      >
                        <View
                          style={[
                            s.iconCircle,
                            { backgroundColor: activeColor },
                            isSelected && s.iconCircleSelected,
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={26}
                            color={colors.textOnAccent}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                  {row.length < NUM_COLUMNS &&
                    Array.from({ length: NUM_COLUMNS - row.length }).map(
                      (_, i) => <View key={`spacer-${i}`} style={s.iconCell} />,
                    )}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

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
    paddingHorizontal: 20,
  } as ViewStyle,
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
  } as ViewStyle,
  iconRow: {
    flexDirection: "row",
    gap: ICON_GAP,
    marginBottom: ICON_GAP,
  } as ViewStyle,
  iconCell: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
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
