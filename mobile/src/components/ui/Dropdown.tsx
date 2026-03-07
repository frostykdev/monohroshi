import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

type DropdownProps = {
  label: string;
  sublabel?: string;
  leftIcon?: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
};

export const Dropdown = ({
  label,
  sublabel,
  leftIcon,
  onPress,
  style,
}: DropdownProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.container, pressed && s.pressed, style]}
    >
      {leftIcon && <View style={s.iconSlot}>{leftIcon}</View>}

      <View style={s.labelGroup}>
        <Typography variant="label" color="textPrimary">
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color="textSecondary">
            {sublabel}
          </Typography>
        )}
      </View>

      <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,
  pressed: {
    opacity: 0.7,
  } as ViewStyle,
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  labelGroup: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
});
