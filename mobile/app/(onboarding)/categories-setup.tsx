import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { CategoryItem } from "@constants/default-categories";
import { Typography } from "@components/ui/Typography";
import { SegmentedControl, Segment } from "@components/ui/SegmentedControl";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";

type Tab = "expense" | "income";

const CategoriesSetupScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const markStepComplete = useSetupStore((s) => s.markStepComplete);

  const expenseCategories = useOnboardingStore((s) => s.expenseCategories);
  const incomeCategories = useOnboardingStore((s) => s.incomeCategories);
  const setExpenseCategories = useOnboardingStore(
    (s) => s.setExpenseCategories,
  );
  const setIncomeCategories = useOnboardingStore((s) => s.setIncomeCategories);

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "income" ? "income" : "expense",
  );

  const categories =
    activeTab === "expense" ? expenseCategories : incomeCategories;

  const segments: Segment<Tab>[] = [
    { key: "expense", label: t("onboarding.categoriesSetup.expenseTab") },
    { key: "income", label: t("onboarding.categoriesSetup.incomeTab") },
  ];

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  };

  const handleTabChange = (tab: Tab) => {
    haptic();
    setActiveTab(tab);
  };

  const handleBack = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    markStepComplete("categories");
    router.back();
  };

  const handleDelete = (item: CategoryItem) => {
    if (item.isSystem) {
      Alert.alert(t("onboarding.categoriesSetup.systemCategoryNote"));
      return;
    }

    Alert.alert(
      t("onboarding.categoriesSetup.deleteConfirmTitle"),
      t("onboarding.categoriesSetup.deleteConfirmMessage", {
        name: item.name,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            haptic();
            const filtered = categories.filter((c) => c.id !== item.id);
            if (activeTab === "expense") {
              setExpenseCategories(filtered);
            } else {
              setIncomeCategories(filtered);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: CategoryItem }) => (
    <Pressable
      style={({ pressed }) => [s.categoryRow, pressed && s.pressed]}
      onLongPress={() => handleDelete(item)}
    >
      <View style={s.categoryIcon}>
        <Ionicons name={item.icon} size={20} color={colors.textPrimary} />
      </View>
      <Typography variant="body" color="textPrimary" style={s.categoryName}>
        {item.name}
      </Typography>
      {item.isSystem ? (
        <Ionicons
          name="lock-closed-outline"
          size={16}
          color={colors.textDisabled}
        />
      ) : (
        <Ionicons name="menu" size={20} color={colors.textTertiary} />
      )}
    </Pressable>
  );

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("onboarding.categoriesSetup.title")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={handleBack}
        right={<Ionicons name="add" size={26} color={colors.textPrimary} />}
        onRightPress={() => {
          haptic();
          router.push(`/(modals)/add-category?tab=${activeTab}`);
        }}
      />

      <SegmentedControl
        segments={segments}
        activeKey={activeTab}
        onPress={handleTabChange}
        style={s.tabs}
      />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  tabs: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
  } as ViewStyle,
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  } as ViewStyle,
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  categoryName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default CategoriesSetupScreen;
