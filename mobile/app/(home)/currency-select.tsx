import { useMemo, useRef } from "react";
import { StyleSheet, View, Pressable, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import {
  ALL_CURRENCIES,
  currencyFlag,
  getCurrencyDisplayName,
} from "@constants/currencies";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { Dropdown } from "@components/ui/Dropdown";
import { CurrencyPickerModal } from "@components/onboarding/currency-picker-modal";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";

const HomeCurrencySelectScreen = () => {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const modalRef = useRef<BottomSheetModal>(null);
  const selectedCode = useOnboardingStore((s) => s.selectedCurrencyCode);
  const setSelectedCode = useOnboardingStore((s) => s.setSelectedCurrencyCode);
  const markStepComplete = useSetupStore((s) => s.markStepComplete);

  const selectedCurrency = ALL_CURRENCIES.find((c) => c.code === selectedCode);

  const selectedLabel = useMemo(
    () => getCurrencyDisplayName(selectedCode, i18n.language),
    [selectedCode, i18n.language],
  );

  const handleOpenPicker = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    modalRef.current?.present();
  };

  const handleCurrencySelect = (code: string) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    setSelectedCode(code);
    modalRef.current?.dismiss();
  };

  const handleSave = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    markStepComplete("currency");
    router.back();
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Pressable
        style={({ pressed }) => [s.backButton, pressed && s.pressed]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        <Typography
          variant="body"
          color="textSecondary"
          i18nKey="common.back"
        />
      </Pressable>

      <View style={s.content}>
        <View style={s.textContent}>
          <Typography variant="h2" i18nKey="onboarding.currencySelect.title" />
          <Typography
            variant="body"
            color="textSecondary"
            i18nKey="onboarding.currencySelect.subtitle"
          />
        </View>

        <Dropdown
          label={selectedLabel}
          sublabel={selectedCode}
          leftIcon={
            selectedCurrency ? (
              <Typography variant="h3">
                {currencyFlag(selectedCurrency.code)}
              </Typography>
            ) : null
          }
          onPress={handleOpenPicker}
        />
      </View>

      <View style={s.footer}>
        <Button variant="primary" i18nKey="common.save" onPress={handleSave} />
      </View>

      <CurrencyPickerModal
        ref={modalRef}
        selectedCode={selectedCode}
        onSelect={handleCurrencySelect}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  } as ViewStyle,
  content: {
    flex: 1,
    gap: 32,
    paddingTop: 24,
  } as ViewStyle,
  textContent: {
    gap: 12,
  } as ViewStyle,
  footer: {
    gap: 12,
  } as ViewStyle,
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
    marginBottom: 4,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default HomeCurrencySelectScreen;
