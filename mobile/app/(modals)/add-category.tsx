import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { CategoryItem, createCategoryId } from "@constants/default-categories";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Button } from "@components/ui/Button";
import { useOnboardingStore } from "@stores/useOnboardingStore";

const CATEGORY_ICONS: React.ComponentProps<typeof Ionicons>["name"][] = [
  "pricetag-outline",
  "basket-outline",
  "car-outline",
  "home-outline",
  "heart-outline",
  "star-outline",
  "flash-outline",
  "fitness-outline",
  "book-outline",
  "musical-notes-outline",
  "cafe-outline",
  "construct-outline",
];

const AddCategoryScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const inputRef = useRef<TextInput>(null);
  const [name, setName] = useState("");

  const expenseCategories = useOnboardingStore((s) => s.expenseCategories);
  const incomeCategories = useOnboardingStore((s) => s.incomeCategories);
  const setExpenseCategories = useOnboardingStore(
    (s) => s.setExpenseCategories,
  );
  const setIncomeCategories = useOnboardingStore((s) => s.setIncomeCategories);

  const isIncome = tab === "income";
  const categories = isIncome ? incomeCategories : expenseCategories;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const iconIndex = categories.length % CATEGORY_ICONS.length;
    const newCategory: CategoryItem = {
      id: createCategoryId(),
      name: trimmed,
      icon: CATEGORY_ICONS[iconIndex],
      type: isIncome ? "income" : "expense",
    };

    if (isIncome) {
      setIncomeCategories([...incomeCategories, newCategory]);
    } else {
      setExpenseCategories([...expenseCategories, newCategory]);
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          s.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <ScreenHeader
          title={t("onboarding.categoriesSetup.addTitle")}
          left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
          onLeftPress={() => router.back()}
        />

        <View style={s.content}>
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder={t("onboarding.categoriesSetup.addPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Button variant="primary" onPress={handleAdd} disabled={!name.trim()}>
            {t("onboarding.categoriesSetup.addButton")}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  flex: {
    flex: 1,
  } as ViewStyle,
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  } as ViewStyle,
  input: {
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as TextStyle,
});

export default AddCategoryScreen;
