import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  UIManager,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import {
  ICON_SECTIONS,
  ICON_PRESET_COLORS,
  ICON_EXTRA_COLORS,
  DEFAULT_ICON_COLOR,
  getIconColor,
} from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { usePickerStore } from "@stores/usePickerStore";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const NUM_COLUMNS = 5;
const ICON_GAP = 12;
const H_PADDING = 20;

const EXPAND_ANIMATION = {
  duration: 260,
  create: { type: "easeInEaseOut" as const, property: "opacity" as const },
  update: { type: "easeInEaseOut" as const, property: "scaleXY" as const },
  delete: { type: "easeInEaseOut" as const, property: "opacity" as const },
};

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
  const [activeIcon, setActiveIcon] = useState<IoniconsName | null>(
    (selectedIcon as IoniconsName) ?? null,
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const chevronAngle = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronAngle.value}deg` }],
  }));

  const allColors = [...ICON_PRESET_COLORS, ...ICON_EXTRA_COLORS];
  const visibleColors = isExpanded ? allColors : ICON_PRESET_COLORS;

  const animateCollapse = () => {
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    chevronAngle.value = withTiming(0, {
      duration: 260,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    setIsExpanded(false);
  };

  const toggleExpanded = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    const next = !isExpanded;
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    chevronAngle.value = withTiming(next ? 180 : 0, {
      duration: 260,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    setIsExpanded(next);
  };

  const handleColorPress = (color: string) => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    setActiveColor(color);
    if (activeIcon) setIcon(activeIcon, color);
  };

  const handleIconPress = (icon: IoniconsName) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    setActiveIcon(icon);
    setIcon(icon, activeColor);
    router.back();
  };

  return (
    <View style={[s.container, { paddingTop: 10 }]}>
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
                const isSelected = icon === activeIcon;
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
                        isSelected && { borderColor: "#FFFFFF" },
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={cellSize * 0.4}
                        color={getIconColor(activeColor)}
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
          style={[
            s.colorBar,
            isExpanded && s.colorBarExpanded,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {visibleColors.map((color) => {
            const isActive = color === activeColor;
            return (
              <Pressable
                key={color}
                onPress={() => handleColorPress(color)}
                style={[s.colorDot, isActive && s.colorDotActive]}
              >
                <View style={[s.colorDotInner, { backgroundColor: color }]} />
              </Pressable>
            );
          })}

          <Pressable onPress={toggleExpanded} style={s.expandBtn}>
            <Animated.View style={chevronStyle}>
              <View style={s.doubleChevron}>
                <Ionicons
                  name="chevron-up"
                  size={11}
                  color={colors.textSecondary}
                  style={s.chevronTop}
                />
                <Ionicons
                  name="chevron-down"
                  size={11}
                  color={colors.textSecondary}
                  style={s.chevronBottom}
                />
              </View>
            </Animated.View>
          </Pressable>
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
  pressed: {
    opacity: 0.7,
  } as ViewStyle,
  colorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  colorBarExpanded: {
    flexWrap: "wrap",
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
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  doubleChevron: {
    alignItems: "center",
  } as ViewStyle,
  chevronTop: {
    marginBottom: -3,
  } as TextStyle,
  chevronBottom: {
    marginTop: -3,
  } as TextStyle,
});

export default IconPickerScreen;
