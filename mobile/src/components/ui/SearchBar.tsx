import {
  Pressable,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Pass `BottomSheetTextInput` when used inside a bottom sheet */
  InputComponent?: React.ComponentType<React.ComponentProps<typeof TextInput>>;
  /** Show a "Cancel" text button outside the input; called when tapped */
  onCancel?: () => void;
};

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  InputComponent = TextInput,
  onCancel,
}: Props) => {
  const { t } = useTranslation();

  return (
    <View style={s.row}>
      <View style={s.container}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <InputComponent
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {onCancel && value.length > 0 && (
        <Pressable onPress={onCancel} hitSlop={8}>
          <Typography variant="label" color="accent">
            {t("common.cancel")}
          </Typography>
        </Pressable>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as ViewStyle,
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  } as ViewStyle,
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
});
