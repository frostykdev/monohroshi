import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import {
  CategoryItem,
  getCategoryDisplayName,
} from "@constants/default-categories";
import { Typography } from "@components/ui/Typography";
import { SegmentedControl, Segment } from "@components/ui/SegmentedControl";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";
import {
  CategoryActionsSheet,
  CategoryActionsSheetItem,
} from "@components/categories/CategoryActionsSheet";

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
  const [selectedItem, setSelectedItem] =
    useState<CategoryActionsSheetItem | null>(null);
  const actionsSheetRef = useRef<BottomSheetModal>(null);

  const categories =
    activeTab === "expense" ? expenseCategories : incomeCategories;
  const setCategories =
    activeTab === "expense" ? setExpenseCategories : setIncomeCategories;

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

  const handleDragEnd = ({ data }: { data: CategoryItem[] }) => {
    setCategories(data);
  };

  const handleOpenActions = (item: CategoryItem) => {
    haptic();
    setSelectedItem({
      id: item.id,
      name: item.name,
      icon: item.icon as string,
      type: item.type,
      isSystem: item.isSystem,
      localId: item.id,
      translationKey: item.translationKey,
    });
    actionsSheetRef.current?.present();
  };

  const handleEdit = (item: CategoryActionsSheetItem) => {
    const displayName = getCategoryDisplayName(item, t);
    router.push(
      `/(modals)/add-category?mode=edit-local&localId=${item.id}&initialName=${encodeURIComponent(displayName)}&initialIcon=${encodeURIComponent(item.icon ?? "")}&tab=${activeTab}` as never,
    );
  };

  const handleDelete = (item: CategoryActionsSheetItem) => {
    if (item.isSystem) {
      Alert.alert(t("onboarding.categoriesSetup.systemCategoryNote"));
      return;
    }

    Alert.alert(
      t("onboarding.categoriesSetup.deleteConfirmTitle"),
      t("onboarding.categoriesSetup.deleteConfirmMessage", {
        name: getCategoryDisplayName(item, t),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            haptic();
            const filtered = categories.filter((c) => c.id !== item.id);
            setCategories(filtered);
          },
        },
      ],
    );
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<CategoryItem>) => (
    <ScaleDecorator>
      <Pressable
        style={[s.categoryRow, isActive && s.dragging]}
        onLongPress={drag}
        delayLongPress={200}
      >
        <View style={s.categoryIcon}>
          <Ionicons name={item.icon} size={20} color={colors.textPrimary} />
        </View>
        <Typography variant="body" color="textPrimary" style={s.categoryName}>
          {getCategoryDisplayName(item, t)}
        </Typography>
        {item.isSystem ? (
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={colors.textDisabled}
          />
        ) : (
          <Pressable
            onPress={() => handleOpenActions(item)}
            hitSlop={8}
            style={({ pressed }) => pressed && s.pressed}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </Pressable>
    </ScaleDecorator>
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

      <DraggableFlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        onDragBegin={() => {
          if (process.env.EXPO_OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      <CategoryActionsSheet
        ref={actionsSheetRef}
        item={selectedItem}
        showTransactions={false}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
  dragging: {
    opacity: 0.85,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 8,
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
