import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "./Typography";

const KEY_H = 64;
const GAP = 6;

const ALL_ROWS = [
  ["+", "1", "2", "3"],
  ["−", "4", "5", "6"],
  ["×", "7", "8", "9"],
  ["÷", ",", "0", "⌫"],
] as const;

type NumKeyProps = {
  k: string;
  isOperator?: boolean;
  onPress: (k: string) => void;
};

const NumKey = ({ k, isOperator, onPress }: NumKeyProps) => (
  <Pressable
    style={({ pressed }) => [
      ns.key,
      isOperator && ns.keyOperator,
      pressed && ns.keyPressed,
    ]}
    onPress={() => onPress(k)}
  >
    <Typography
      variant="body"
      style={isOperator ? [ns.keyText, ns.keyTextOperator] : ns.keyText}
    >
      {k}
    </Typography>
  </Pressable>
);

export type AmountKeyboardProps = {
  onKey: (key: string) => void;
  /** Whether to show +/- and Done row */
  showSignToggle?: boolean;
  isNegative?: boolean;
  onSetNegative?: (v: boolean) => void;
};

export const AmountKeyboard = ({
  onKey,
  showSignToggle = true,
  isNegative = false,
  onSetNegative,
}: AmountKeyboardProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Positive / Negative / Done — hidden when showSignToggle is false */}
      {showSignToggle && (
        <View style={ns.toggleRow}>
          <Pressable
            style={({ pressed }) => [
              ns.toggleBtn,
              !isNegative && ns.toggleBtnActive,
              pressed && ns.rowPressed,
            ]}
            onPress={() => {
              onSetNegative?.(false);
            }}
          >
            <Typography
              style={ns.toggleLabel}
              color={!isNegative ? "accent" : "textSecondary"}
            >
              {t("balanceInput.positive")}
            </Typography>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              ns.toggleBtn,
              isNegative && ns.toggleBtnActive,
              pressed && ns.rowPressed,
            ]}
            onPress={() => {
              onSetNegative?.(true);
            }}
          >
            <Typography
              style={ns.toggleLabel}
              color={isNegative ? "accent" : "textSecondary"}
            >
              {t("balanceInput.negative")}
            </Typography>
          </Pressable>
          <Pressable
            style={({ pressed }) => [ns.doneBtn, pressed && ns.rowPressed]}
            onPress={() => onKey("done")}
          >
            <Typography style={ns.doneLabel}>
              {t("balanceInput.done")}
            </Typography>
          </Pressable>
        </View>
      )}

      {/* Numpad — full width, = spans all 4 rows */}
      <View style={ns.numpad}>
        <View style={ns.numRow}>
          <View style={ns.numColGroup}>
            {ALL_ROWS.map((row, ri) => (
              <View key={ri} style={ns.numRow}>
                {row.map((k, ki) => (
                  <NumKey
                    key={ki}
                    k={k}
                    isOperator={ki === 0}
                    onPress={onKey}
                  />
                ))}
              </View>
            ))}
          </View>
          {/* = spanning all 4 rows (height = 4 keys + 3 gaps) */}
          <Pressable
            style={({ pressed }) => [
              ns.equalsKey,
              { height: KEY_H * 4 + GAP * 3 },
              pressed && ns.keyPressed,
            ]}
            onPress={() => onKey("=")}
          >
            <Typography variant="body" style={ns.keyTextEquals}>
              =
            </Typography>
          </Pressable>
        </View>
      </View>

      <View style={{ height: insets.bottom || GAP }} />
    </>
  );
};

const ns = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 28,
    marginBottom: 10,
    alignItems: "center",
  } as ViewStyle,
  toggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  } as ViewStyle,
  toggleBtnActive: {
    borderColor: colors.accent,
  } as ViewStyle,
  toggleLabel: {
    fontSize: 14,
    fontWeight: "700",
  } as TextStyle,
  doneBtn: {
    marginLeft: "auto",
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  doneLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,
  numpad: {
    paddingHorizontal: GAP,
    paddingTop: 12,
    paddingBottom: GAP,
  } as ViewStyle,
  numRow: {
    flexDirection: "row",
    gap: GAP,
  } as ViewStyle,
  numColGroup: {
    flex: 1,
    gap: GAP,
  } as ViewStyle,
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: KEY_H,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  keyOperator: {
    backgroundColor: "#5C2410",
  } as ViewStyle,
  equalsKey: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.accent,
  } as ViewStyle,
  keyPressed: {
    opacity: 0.65,
  } as ViewStyle,
  keyText: {
    fontSize: 22,
    fontWeight: "400",
    color: colors.textPrimary,
  } as TextStyle,
  keyTextOperator: {
    fontSize: 22,
    fontWeight: "400",
    color: colors.accent,
  } as TextStyle,
  keyTextEquals: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.textOnAccent,
  } as TextStyle,
  rowPressed: { opacity: 0.6 } as ViewStyle,
});
