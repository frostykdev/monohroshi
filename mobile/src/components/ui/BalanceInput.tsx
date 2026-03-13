import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { Typography } from "./Typography";

interface BalanceInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: string;
  label?: string;
}

const KEY_H = 64;
const OPERATOR_KEYS = ["+", "−", "×", "÷"] as const;
const ALL_ROWS = [
  ["+", "1", "2", "3"],
  ["−", "4", "5", "6"],
  ["×", "7", "8", "9"],
  ["÷", ",", "0", "⌫"],
] as const;

const haptic = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const BalanceInput = ({
  value,
  onChange,
  currency,
  label,
}: BalanceInputProps) => {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [input, setInput] = useState("");
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [isNegative, setIsNegative] = useState(false);

  const symbol = getCurrencySymbol(currency);

  const openSheet = () => {
    const num = parseFloat(value) || 0;
    setIsNegative(num < 0);
    setInput(num !== 0 ? String(Math.abs(num)) : "");
    setPendingOp(null);
    setPendingValue("");
    sheetRef.current?.present();
  };

  const evaluate = useCallback((): number => {
    const current = parseFloat(input) || 0;
    if (!pendingOp || !pendingValue) return current;
    const prev = parseFloat(pendingValue) || 0;
    switch (pendingOp) {
      case "+":
        return prev + current;
      case "−":
        return prev - current;
      case "×":
        return prev * current;
      case "÷":
        return current !== 0 ? prev / current : prev;
      default:
        return current;
    }
  }, [input, pendingOp, pendingValue]);

  const handleKey = useCallback(
    (key: string) => {
      haptic();
      if (key === "done") {
        const result = evaluate();
        const final = isNegative ? -Math.abs(result) : Math.abs(result);
        const rounded = parseFloat(final.toFixed(10));
        onChange(String(rounded === 0 ? 0 : rounded));
        sheetRef.current?.dismiss();
        return;
      }
      if (key === "=") {
        const result = evaluate();
        setInput(String(parseFloat(result.toFixed(10))));
        setPendingOp(null);
        setPendingValue("");
        return;
      }
      if (OPERATOR_KEYS.includes(key as (typeof OPERATOR_KEYS)[number])) {
        const currentNum = parseFloat(input) || parseFloat(pendingValue) || 0;
        setPendingValue(String(currentNum));
        setPendingOp(key);
        setInput("");
        return;
      }
      if (key === "⌫") {
        setInput((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
        return;
      }
      if (key === ",") {
        setInput((prev) => {
          if (prev.includes(".")) return prev;
          return (prev || "0") + ".";
        });
        return;
      }
      setInput((prev) => {
        if (prev === "0") return key === "0" ? "0" : key;
        const dotIdx = prev.indexOf(".");
        if (dotIdx !== -1 && prev.length - dotIdx > 2) return prev;
        return prev + key;
      });
    },
    [evaluate, input, pendingValue, isNegative, onChange],
  );

  const displayValue = input || (pendingValue ? "..." : "0");
  const expressionStr = pendingOp ? `${pendingValue} ${pendingOp} ` : "";
  const displayStr = `${expressionStr}${displayValue}`;

  const formattedRow = useMemo(() => {
    const num = parseFloat(value);
    if (!value || isNaN(num) || num === 0) return `0.00 ${symbol}`;
    const abs = Math.abs(num).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${num < 0 ? "−" : ""}${abs} ${symbol}`;
  }, [value, symbol]);

  const rowLabel =
    label ?? `${t("onboarding.accountSetup.balance")} (${currency})`;

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleInfo = () => {
    Alert.alert(t("balanceInput.infoTitle"), t("balanceInput.infoMessage"), [
      { text: t("balanceInput.infoButton"), style: "default" },
    ]);
  };

  const NumKey = ({
    k,
    isOperator,
    isSpecial,
    height,
  }: {
    k: string;
    isOperator?: boolean;
    isSpecial?: boolean;
    height?: number;
  }) => (
    <Pressable
      style={({ pressed }) => [
        ns.key,
        isOperator && ns.keyOperator,
        isSpecial && ns.keySpecial,
        height !== undefined ? { height } : { height: KEY_H },
        pressed && ns.keyPressed,
      ]}
      onPress={() => handleKey(k)}
    >
      <Typography
        variant="body"
        style={[ns.keyText, (isOperator || isSpecial) && ns.keyTextMuted]}
      >
        {k}
      </Typography>
    </Pressable>
  );

  return (
    <>
      {/* Tappable row in the form */}
      <Pressable
        style={({ pressed }) => [ns.row, pressed && ns.rowPressed]}
        onPress={openSheet}
      >
        <Typography variant="body" color="textSecondary">
          {rowLabel}
        </Typography>
        <Typography
          variant="body"
          color={
            parseFloat(value) < 0
              ? "error"
              : parseFloat(value) > 0
                ? "textPrimary"
                : "textTertiary"
          }
          style={ns.rowValue}
        >
          {formattedRow}
        </Typography>
      </Pressable>

      {/* Bottom sheet */}
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={ns.sheetBg}
        handleComponent={() => null}
      >
        <BottomSheetView>
          {/* Header: X | title | ⓘ */}
          <View style={ns.sheetHeader}>
            <Pressable
              style={({ pressed }) => [ns.headerBtn, pressed && ns.rowPressed]}
              onPress={() => sheetRef.current?.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
            <Typography variant="label" style={ns.headerTitle}>
              {t("balanceInput.title")}
            </Typography>
            <Pressable
              style={({ pressed }) => [ns.headerBtn, pressed && ns.rowPressed]}
              onPress={handleInfo}
              hitSlop={8}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.accent}
              />
            </Pressable>
          </View>

          <View style={ns.divider} />

          {/* Amount display — underline only below the number */}
          <View style={ns.amountArea}>
            <View style={ns.amountUnderline}>
              <Typography style={ns.amountText}>
                {symbol}
                {displayStr}
              </Typography>
            </View>
          </View>

          {/* Positive / Negative / Done */}
          <View style={ns.toggleRow}>
            <Pressable
              style={({ pressed }) => [
                ns.toggleBtn,
                !isNegative && ns.toggleBtnActive,
                pressed && ns.rowPressed,
              ]}
              onPress={() => {
                haptic();
                setIsNegative(false);
              }}
            >
              <Typography
                variant="bodySmall"
                color={!isNegative ? "accent" : "textSecondary"}
              >
                {t("balanceInput.positive")}
              </Typography>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                ns.toggleBtn,
                isNegative && ns.toggleBtnActiveNeg,
                pressed && ns.rowPressed,
              ]}
              onPress={() => {
                haptic();
                setIsNegative(true);
              }}
            >
              <Typography
                variant="bodySmall"
                color={isNegative ? "error" : "textSecondary"}
              >
                {t("balanceInput.negative")}
              </Typography>
            </Pressable>
            <Pressable
              style={({ pressed }) => [ns.doneBtn, pressed && ns.rowPressed]}
              onPress={() => handleKey("done")}
            >
              <Typography variant="label" color="textPrimary">
                {t("balanceInput.done")}
              </Typography>
            </Pressable>
          </View>

          {/* Numpad — full width, = spans all 4 rows */}
          <View style={ns.numpad}>
            <View style={ns.numRow}>
              {/* 4 columns × 4 rows */}
              <View style={ns.numColGroup}>
                {ALL_ROWS.map((row, ri) => (
                  <View key={ri} style={ns.numRow}>
                    {row.map((k, ki) => (
                      <NumKey
                        key={ki}
                        k={k}
                        isOperator={ki === 0}
                        isSpecial={k === "⌫"}
                      />
                    ))}
                  </View>
                ))}
              </View>
              {/* = spanning all 4 rows */}
              <Pressable
                style={({ pressed }) => [
                  ns.key,
                  ns.equalsKey,
                  { width: 72, height: KEY_H * 4 },
                  pressed && ns.keyPressed,
                ]}
                onPress={() => handleKey("=")}
              >
                <Typography variant="body" style={ns.keyText}>
                  =
                </Typography>
              </Pressable>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const ns = StyleSheet.create({
  // ── Tappable row ──────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  } as ViewStyle,
  rowPressed: { opacity: 0.6 } as ViewStyle,
  rowValue: { textAlign: "right" } as TextStyle,

  // ── Sheet chrome ─────────────────────────────────────────────────────────
  sheetBg: { backgroundColor: colors.backgroundElevated } as ViewStyle,
  handle: { backgroundColor: colors.border, height: 4 } as ViewStyle,

  // ── Header ───────────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerTitle: {
    flex: 1,
    textAlign: "center",
  } as TextStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  } as ViewStyle,

  // ── Amount display ───────────────────────────────────────────────────────
  amountArea: {
    alignItems: "center",
    paddingVertical: 16,
    overflow: "visible",
  } as ViewStyle,
  amountUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
  } as ViewStyle,
  amountText: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,

  // ── Toggle row ────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
  } as ViewStyle,
  toggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
  } as ViewStyle,
  toggleBtnActive: {
    backgroundColor: `${colors.accent}22`,
  } as ViewStyle,
  toggleBtnActiveNeg: {
    backgroundColor: `${colors.error}22`,
  } as ViewStyle,
  doneBtn: {
    marginLeft: "auto",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  } as ViewStyle,

  // ── Numpad ────────────────────────────────────────────────────────────────
  numpad: {} as ViewStyle,
  numRow: { flexDirection: "row" } as ViewStyle,
  numColGroup: { flex: 1 } as ViewStyle,
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    height: KEY_H,
  } as ViewStyle,
  keyOperator: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  keySpecial: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  equalsKey: {
    flex: 0,
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  keyPressed: {
    opacity: 0.6,
  } as ViewStyle,
  keyText: {
    fontSize: 20,
    fontWeight: "400",
    color: colors.textPrimary,
  } as TextStyle,
  keyTextMuted: {
    color: colors.textSecondary,
  } as TextStyle,
});
