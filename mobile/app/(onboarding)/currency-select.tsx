import { useCallback } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { colors } from "@constants/colors";
import { currencyFlag, getCurrencyByCode } from "@constants/currencies";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { Dropdown } from "@components/ui/Dropdown";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { usePickerStore } from "@stores/usePickerStore";

const CurrencySelectScreen = () => {
  const insets = useSafeAreaInsets();
  const selectedCode = useOnboardingStore((s) => s.selectedCurrencyCode);
  const setSelectedCode = useOnboardingStore((s) => s.setSelectedCurrencyCode);

  const selectedCurrency = getCurrencyByCode(selectedCode);

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.currency) {
        setSelectedCode(store.currency);
        usePickerStore.setState({ currency: null });
      }
    }, [setSelectedCode]),
  );

  const handleOpenPicker = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    router.push(`/(modals)/currency-picker?selected=${selectedCode}`);
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
          label={selectedCurrency?.name ?? selectedCode}
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
        <Button
          variant="primary"
          i18nKey="common.continue"
          onPress={handleContinue}
        />
      </View>
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
