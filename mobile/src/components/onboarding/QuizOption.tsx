import {
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

type Props = {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  type: "radio" | "checkbox";
};

export const QuizOption = ({
  emoji,
  label,
  selected,
  onPress,
  type,
}: Props) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.container,
        selected && s.selected,
        pressed && s.pressed,
      ]}
    >
      <Typography variant="body">{emoji}</Typography>
      <Typography variant="label" color="textPrimary" style={s.label}>
        {label}
      </Typography>
      {type === "radio" ? (
        <View style={[s.radio, selected && s.radioSelected]}>
          {selected && <View style={s.radioDot} />}
        </View>
      ) : (
        <View style={[s.checkbox, selected && s.checkboxSelected]}>
          {selected && (
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          )}
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  } as ViewStyle,
  selected: {
    backgroundColor: `${colors.accent}18`,
  } as ViewStyle,
  pressed: {
    opacity: 0.7,
  } as ViewStyle,
  label: {
    flex: 1,
  } as TextStyle,
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  radioSelected: {
    borderColor: colors.accent,
  } as ViewStyle,
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  } as ViewStyle,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  } as ViewStyle,
});
