import { useMemo, useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
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

const DEFAULT_CURRENCY = "UAH";

const CurrencySelectScreen = () => {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const modalRef = useRef<BottomSheetModal>(null);
  const [selectedCode, setSelectedCode] = useState(DEFAULT_CURRENCY);

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

  const handleContinue = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // TODO: navigate to next onboarding step
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={s.content}
      >
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
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(250).duration(500)}
        style={s.footer}
      >
        <Button
          variant="primary"
          i18nKey="common.continue"
          onPress={handleContinue}
        />
      </Animated.View>

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
});

export default CurrencySelectScreen;
