import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { SearchBar } from "@components/ui/SearchBar";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { usePickerStore } from "@stores/usePickerStore";
import { useTags } from "@services/tags/tags.queries";
import type { Tag } from "@services/tags/tags.api";

const TagPickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  const { selected: selectedParam, fromModal } = useLocalSearchParams<{
    selected?: string;
    fromModal?: string;
  }>();

  const initialIds = selectedParam
    ? selectedParam.split(",").filter(Boolean)
    : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [query, setQuery] = useState("");

  const { data: tags = [] } = useTags(activeWorkspaceId);

  const filtered = query.trim()
    ? tags.filter((t) =>
        t.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : tags;

  const toggle = (tag: Tag) => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(tag.id)
        ? prev.filter((id) => id !== tag.id)
        : [...prev, tag.id],
    );
  };

  const handleDone = () => {
    const picked = tags.filter((t) => selectedIds.includes(t.id));
    usePickerStore.getState().setSelectedTags(picked);
    router.back();
  };

  const renderItem = ({ item }: { item: Tag }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <Pressable
        style={({ pressed }) => [s.tagRow, pressed && s.pressed]}
        onPress={() => toggle(item)}
      >
        <View
          style={[
            s.tagDot,
            { backgroundColor: item.color ?? colors.textTertiary },
          ]}
        />
        <Typography variant="body" style={s.tagName}>
          {item.name}
        </Typography>
        <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          )}
        </View>
      </Pressable>
    );
  };

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
        title={t("tags.pickerTitle")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
        right={
          <Typography variant="label" color="textPrimary">
            {t("common.done")}
          </Typography>
        }
        onRightPress={handleDone}
        rightVariant="pill"
      />

      <View style={s.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t("tags.searchPlaceholder")}
        />
      </View>

      {tags.length === 0 ? (
        <View style={s.empty}>
          <Typography
            variant="body"
            color="textSecondary"
            i18nKey="tags.empty"
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  } as ViewStyle,
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  } as ViewStyle,
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  tagDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  } as ViewStyle,
  tagName: {
    flex: 1,
  } as TextStyle,
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  } as ViewStyle,
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default TagPickerScreen;
