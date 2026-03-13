import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import type { Category } from "@services/categories/categories.api";
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
} from "@services/categories/categories.queries";
import { Typography } from "@components/ui/Typography";
import { SegmentedControl, Segment } from "@components/ui/SegmentedControl";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import {
  CategoryActionsSheet,
  CategoryActionsSheetItem,
} from "@components/categories/CategoryActionsSheet";

type Tab = "expense" | "income";

const CategoriesScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  const { data: allCategories = [], isLoading } =
    useCategories(activeWorkspaceId);
  const { mutate: deleteCategory } = useDeleteCategory(activeWorkspaceId);
  const { mutate: reorderCategories } = useReorderCategories(activeWorkspaceId);

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "income" ? "income" : "expense",
  );
  const [selectedItem, setSelectedItem] =
    useState<CategoryActionsSheetItem | null>(null);
  const actionsSheetRef = useRef<BottomSheetModal>(null);

  const categories = allCategories.filter((c) => c.type === activeTab);

  const segments: Segment<Tab>[] = [
    { key: "expense", label: t("onboarding.categoriesSetup.expenseTab") },
    { key: "income", label: t("onboarding.categoriesSetup.incomeTab") },
  ];

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
  };

  const handleOpenActions = (item: Category) => {
    haptic();
    setSelectedItem(item);
    actionsSheetRef.current?.present();
  };

  const handleDragEnd = ({ data }: { data: Category[] }) => {
    const orders = data.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    reorderCategories(orders);
  };

  const handleEdit = (item: CategoryActionsSheetItem) => {
    router.push(
      `/(modals)/add-category?mode=edit&categoryId=${item.id}&initialName=${encodeURIComponent(item.name)}&initialIcon=${encodeURIComponent(item.icon ?? "")}&workspaceId=${activeWorkspaceId ?? ""}` as never,
    );
  };

  const handleShowTransactions = (item: CategoryActionsSheetItem) => {
    router.push(`/(home)/index?categoryId=${item.id}` as never);
  };

  const handleDelete = (item: CategoryActionsSheetItem) => {
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
            deleteCategory(item.id, {
              onError: () =>
                Alert.alert(
                  t("onboarding.categoriesSetup.deleteConfirmTitle"),
                  t("onboarding.categoriesSetup.errors.deleteFailed"),
                ),
            });
          },
        },
      ],
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <Pressable
        style={[s.categoryRow, isActive && s.dragging]}
        onLongPress={drag}
        delayLongPress={200}
      >
        <View style={s.categoryIcon}>
          <Ionicons
            name={
              (item.icon as React.ComponentProps<typeof Ionicons>["name"]) ??
              "pricetag-outline"
            }
            size={20}
            color={colors.textPrimary}
          />
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
        onLeftPress={() => router.back()}
        right={<Ionicons name="add" size={26} color={colors.textPrimary} />}
        onRightPress={() => {
          haptic();
          router.push(
            `/(modals)/add-category?tab=${activeTab}&workspaceId=${activeWorkspaceId ?? ""}` as never,
          );
        }}
      />

      <SegmentedControl
        segments={segments}
        activeKey={activeTab}
        onPress={(tab) => {
          haptic();
          setActiveTab(tab);
        }}
        style={s.tabs}
      />

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
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
      )}

      <CategoryActionsSheet
        ref={actionsSheetRef}
        item={selectedItem}
        workspaceId={activeWorkspaceId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShowTransactions={handleShowTransactions}
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

export default CategoriesScreen;
