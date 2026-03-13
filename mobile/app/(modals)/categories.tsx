import { useState } from "react";
import {
  ActivityIndicator,
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
import type { Category } from "@services/categories/categories.api";
import {
  useCategories,
  useDeleteCategory,
} from "@services/categories/categories.queries";
import { Typography } from "@components/ui/Typography";
import { SegmentedControl, Segment } from "@components/ui/SegmentedControl";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";

type Tab = "expense" | "income";

const CategoriesScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  const { data: allCategories = [], isLoading } =
    useCategories(activeWorkspaceId);
  const { mutate: deleteCategory } = useDeleteCategory(activeWorkspaceId);

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "income" ? "income" : "expense",
  );

  const categories = allCategories.filter((c) => c.type === activeTab);

  const segments: Segment<Tab>[] = [
    { key: "expense", label: t("onboarding.categoriesSetup.expenseTab") },
    { key: "income", label: t("onboarding.categoriesSetup.incomeTab") },
  ];

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
  };

  const handleDelete = (item: Category) => {
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

  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      style={({ pressed }) => [s.categoryRow, pressed && s.pressed]}
      onLongPress={() => handleDelete(item)}
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
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
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
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
