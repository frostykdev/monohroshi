import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

type ScreenHeaderProps = {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  /** "icon" renders a circle (default). "pill" renders a rounded capsule for text labels. */
  rightVariant?: "icon" | "pill";
  rightDisabled?: boolean;
};

export const ScreenHeader = ({
  title,
  left,
  right,
  onLeftPress,
  onRightPress,
  rightVariant = "icon",
  rightDisabled,
}: ScreenHeaderProps) => {
  return (
    <View style={s.container}>
      {onLeftPress ? (
        <Pressable
          style={({ pressed }) => [s.circleButton, pressed && s.pressed]}
          onPress={onLeftPress}
          hitSlop={8}
        >
          {left}
        </Pressable>
      ) : (
        <View style={s.placeholder} />
      )}

      <Typography variant="label">{title}</Typography>

      {onRightPress ? (
        <Pressable
          style={({ pressed }) => [
            rightVariant === "pill" ? s.pillButton : s.circleButton,
            pressed && s.pressed,
            rightDisabled && s.disabledButton,
          ]}
          onPress={onRightPress}
          hitSlop={8}
          disabled={rightDisabled}
        >
          {right}
        </Pressable>
      ) : right ? (
        <View style={s.placeholder}>{right}</View>
      ) : (
        <View style={s.placeholder} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  } as ViewStyle,
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pillButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  placeholder: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  disabledButton: {
    opacity: 0.4,
  } as ViewStyle,
});
