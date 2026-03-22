import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import { getCategoryDisplayName } from "@constants/default-categories";
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
import { usePickerStore } from "@stores/usePickerStore";
import {
  CategoryActionsSheet,
  CategoryActionsSheetItem,
} from "@components/categories/CategoryActionsSheet";

type Tab = "expense" | "income";

const CategoriesScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    tab: initialTab,
    pickerMode,
    gridMode,
    refundMode,
    fromModal,
    excludedCategoryIds,
  } = useLocalSearchParams<{
    tab?: string;
    pickerMode?: string;
    gridMode?: string;
    refundMode?: string;
    fromModal?: string;
    excludedCategoryIds?: string;
  }>();
  const isPickerMode = pickerMode === "true";
  const isGridMode = gridMode === "true";
  const isRefundMode = refundMode === "true";
  const excludedIds = excludedCategoryIds
    ? excludedCategoryIds.split(",").filter(Boolean)
    : [];
  const setCategory = usePickerStore((s) => s.setCategory);

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
  const flatListRef = useRef<FlatList<Category>>(null);
  const gridScrollRef = useRef<ScrollView>(null);

  // When returning from add-category in picker mode, if a category was already
  // set in the picker store, navigate straight back to the transaction modal.
  useFocusEffect(
    useCallback(() => {
      if (!isPickerMode) return;
      const store = usePickerStore.getState();
      if (store.categoryId) {
        router.back();
      }
    }, [isPickerMode]),
  );

  const categories = allCategories.filter(
    (c) =>
      c.type === activeTab && !(isPickerMode && excludedIds.includes(c.id)),
  );

  const prevCategoriesLengthRef = useRef(categories.length);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    if (categories.length > prevCategoriesLengthRef.current) {
      pendingScrollRef.current = true;
    }
    prevCategoriesLengthRef.current = categories.length;
  }, [categories.length]);

  const handleContentSizeChange = useCallback(() => {
    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      flatListRef.current?.scrollToOffset({ offset: 999999, animated: true });
      gridScrollRef.current?.scrollTo({ y: 999999, animated: true });
    }
  }, []);

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
    const displayName = getCategoryDisplayName(item, t);
    router.push(
      `/(modals)/add-category?mode=edit&categoryId=${item.id}&initialName=${encodeURIComponent(displayName)}&initialIcon=${encodeURIComponent(item.icon ?? "")}&workspaceId=${activeWorkspaceId ?? ""}` as never,
    );
  };

  const handleShowTransactions = (item: CategoryActionsSheetItem) => {
    router.push(`/(tabs)/index?categoryId=${item.id}` as never);
  };

  const handleDelete = (item: CategoryActionsSheetItem) => {
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

  const handlePickCategory = (item: Category) => {
    haptic();
    setCategory(
      item.id,
      getCategoryDisplayName(item, t),
      item.icon,
      item.color,
      isRefundMode,
    );
    router.back();
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <Pressable
        style={[s.categoryRow, isActive && s.dragging]}
        onLongPress={isPickerMode ? undefined : drag}
        delayLongPress={200}
        onPress={isPickerMode ? () => handlePickCategory(item) : undefined}
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
          {getCategoryDisplayName(item, t)}
        </Typography>
        {isPickerMode ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
          />
        ) : item.isSystem ? (
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

  const renderGridCell = (item: Category) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [s.gridCell, pressed && s.pressed]}
      onPress={() => handlePickCategory(item)}
    >
      <View style={s.gridIcon}>
        <Ionicons
          name={
            (item.icon as React.ComponentProps<typeof Ionicons>["name"]) ??
            "pricetag-outline"
          }
          size={26}
          color={colors.textPrimary}
        />
      </View>
      <Typography
        variant="caption"
        color="textSecondary"
        style={s.gridLabel}
        numberOfLines={2}
      >
        {getCategoryDisplayName(item, t)}
      </Typography>
    </Pressable>
  );

  return (
    <View
      style={[
        s.container,
        {
          paddingTop: fromModal === "1" ? 10 : insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScreenHeader
        title={t("onboarding.categoriesSetup.title")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => router.back()}
        right={
          <Ionicons
            name="add"
            size={26}
            color={isPickerMode ? colors.accent : colors.textPrimary}
          />
        }
        onRightPress={() => {
          haptic();
          router.push(
            `/(modals)/add-category?tab=${activeTab}&workspaceId=${activeWorkspaceId ?? ""}${isPickerMode ? "&pickerMode=true" : ""}` as never,
          );
        }}
      />

      {!isRefundMode && (
        <SegmentedControl
          segments={segments}
          activeKey={activeTab}
          onPress={(tab) => {
            haptic();
            setActiveTab(tab);
          }}
          style={s.tabs}
        />
      )}

      {isRefundMode && (
        <View style={s.refundBanner}>
          <Typography variant="h3" color="textPrimary" align="center">
            {t("defaultCategories.refundBannerTitle")}
          </Typography>
          <Typography
            variant="bodySmall"
            color="textSecondary"
            align="center"
            style={s.refundBannerSubtitle}
          >
            {t("defaultCategories.refundBannerSubtitle")}
          </Typography>
        </View>
      )}

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : isGridMode ? (
        <ScrollView
          ref={gridScrollRef}
          contentContainerStyle={s.gridContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
        >
          <View style={s.gridWrap}>{categories.map(renderGridCell)}</View>
        </ScrollView>
      ) : (
        <DraggableFlatList
          ref={flatListRef}
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
          onContentSizeChange={handleContentSizeChange}
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
    paddingBottom: 140,
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

  // Refund banner
  refundBanner: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
    alignItems: "center",
  } as ViewStyle,
  refundBannerSubtitle: {
    textAlign: "center",
  } as TextStyle,

  // Grid mode
  gridContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 140,
  } as ViewStyle,
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  } as ViewStyle,
  gridCell: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 6,
  } as ViewStyle,
  gridIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  gridLabel: {
    textAlign: "center",
    lineHeight: 15,
  } as TextStyle,
});

export default CategoriesScreen;
