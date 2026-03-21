import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@constants/colors";

type FabAddButtonProps = {
  onPress: () => void;
  bottom?: number;
  right?: number;
};

export const FabAddButton = ({
  onPress,
  bottom = 20,
  right = 24,
}: FabAddButtonProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        s.fab,
        { bottom, right },
        pressed && s.fabPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name="add" size={28} color={colors.textOnAccent} />
    </Pressable>
  );
};

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  } as ViewStyle,
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  } as ViewStyle,
});
