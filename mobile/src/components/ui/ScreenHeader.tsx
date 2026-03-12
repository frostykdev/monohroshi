import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Typography } from "@components/ui/Typography";

type ScreenHeaderProps = {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
};

export const ScreenHeader = ({
  title,
  left,
  right,
  onLeftPress,
  onRightPress,
}: ScreenHeaderProps) => {
  return (
    <View style={s.container}>
      {onLeftPress ? (
        <Pressable
          style={({ pressed }) => [s.slot, pressed && s.pressed]}
          onPress={onLeftPress}
          hitSlop={8}
        >
          {left}
        </Pressable>
      ) : (
        <View style={s.slot}>{left}</View>
      )}

      <Typography variant="label">{title}</Typography>

      {onRightPress ? (
        <Pressable
          style={({ pressed }) => [s.slot, pressed && s.pressed]}
          onPress={onRightPress}
          hitSlop={8}
        >
          {right}
        </Pressable>
      ) : (
        <View style={s.slot}>{right}</View>
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
    height: 52,
  } as ViewStyle,
  slot: {
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});
