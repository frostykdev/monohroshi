import { useCallback, useMemo, useRef } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
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
import { bnParse } from "@utils/bn";
import { Typography } from "./Typography";
import { AmountKeyboard } from "./AmountKeyboard";
import { useAmountKeyboard } from "@hooks/useAmountKeyboard";

interface BalanceInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: string;
  label?: string;
  title?: string;
  showSignToggle?: boolean;
  showInfo?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}

export const BalanceInput = ({
  value,
  onChange,
  currency,
  label,
  title,
  showSignToggle = true,
  showInfo = true,
  positiveLabel,
  negativeLabel,
}: BalanceInputProps) => {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);

  const symbol = getCurrencySymbol(currency);

  const keyboard = useAmountKeyboard({
    showSignToggle,
    onChange,
    onDone: () => sheetRef.current?.dismiss(),
  });

  const openSheet = () => {
    Keyboard.dismiss();
    const num = bnParse(value);
    keyboard.reset(value, showSignToggle && num.isNegative());
    sheetRef.current?.present();
  };

  const formattedRow = useMemo(() => {
    const num = bnParse(value);
    if (!value || num.isZero()) return `0.00 ${symbol}`;
    return `${num.isNegative() ? "−" : ""}${num.abs().toFormat(2)} ${symbol}`;
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
            bnParse(value).isNegative()
              ? "error"
              : bnParse(value).isGreaterThan(0)
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
          {/* Header */}
          <View style={ns.sheetHeader}>
            {/* Left: X */}
            <Pressable
              style={({ pressed }) => [ns.headerBtn, pressed && ns.rowPressed]}
              onPress={() => sheetRef.current?.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>

            {/* Title — absolutely centered */}
            <View style={ns.headerTitleAbsolute} pointerEvents="none">
              <Typography variant="label" style={ns.headerTitle}>
                {title ?? t("balanceInput.title")}
              </Typography>
            </View>

            {/* Right: Done / info / invisible placeholder */}
            {!showSignToggle ? (
              <Pressable
                style={({ pressed }) => [
                  ns.headerDoneBtn,
                  pressed && ns.rowPressed,
                ]}
                onPress={() => keyboard.handleKey("done")}
                hitSlop={8}
              >
                <Typography style={ns.headerDoneLabel}>
                  {t("balanceInput.done")}
                </Typography>
              </Pressable>
            ) : showInfo ? (
              <Pressable
                style={({ pressed }) => [
                  ns.headerBtn,
                  pressed && ns.rowPressed,
                ]}
                onPress={handleInfo}
                hitSlop={8}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.accent}
                />
              </Pressable>
            ) : (
              <View style={[ns.headerBtn, ns.invisible]} pointerEvents="none" />
            )}
          </View>

          <View style={ns.divider} />

          {/* Amount display — underline only below the number */}
          <View style={ns.amountArea}>
            <View style={ns.amountUnderline}>
              <Typography style={ns.amountText}>
                {symbol}
                {keyboard.displayStr}
              </Typography>
            </View>
          </View>

          <AmountKeyboard
            onKey={keyboard.handleKey}
            showSignToggle={showSignToggle}
            isNegative={keyboard.isNegative}
            onSetNegative={keyboard.setIsNegative}
            positiveLabel={positiveLabel}
            negativeLabel={negativeLabel}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const ns = StyleSheet.create({
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

  sheetBg: { backgroundColor: colors.backgroundElevated } as ViewStyle,

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  invisible: {
    opacity: 0,
  } as ViewStyle,
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerTitleAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  } as ViewStyle,
  headerTitle: {
    textAlign: "center",
    fontWeight: "700",
  } as TextStyle,
  headerDoneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  headerDoneLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  } as ViewStyle,

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
});
