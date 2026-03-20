import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { getIconColor } from "@constants/icon-list";

interface IconPickerButtonProps {
  icon: string;
  color: string;
  hideColorBar?: boolean;
}

export const IconPickerButton = ({
  icon,
  color,
  hideColorBar = false,
}: IconPickerButtonProps) => {
  const router = useRouter();

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push(
      `/(modals)/icon-picker?selectedIcon=${encodeURIComponent(icon)}&selectedColor=${encodeURIComponent(color)}${hideColorBar ? "&hideColorBar=true" : ""}`,
    );
  };

  return (
    <View style={s.section}>
      <Pressable style={s.wrapper} hitSlop={8} onPress={handlePress}>
        <View style={[s.circle, { backgroundColor: color }]}>
          <Ionicons
            name={icon as React.ComponentProps<typeof Ionicons>["name"]}
            size={32}
            color={getIconColor(color)}
          />
        </View>
        <View style={s.badge}>
          <Ionicons name="pencil" size={13} color={colors.textPrimary} />
        </View>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  section: {
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  wrapper: {
    position: "relative",
    width: 80,
    height: 80,
  } as ViewStyle,
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  badge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  } as ViewStyle,
});
