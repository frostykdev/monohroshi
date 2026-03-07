import { forwardRef, useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { env } from "@constants/env";
import { Typography } from "@components/ui/Typography";

type AuthMode = "signup" | "signin";

type Props = {
  mode: AuthMode;
  onApplePress: () => void;
  onGooglePress: () => void;
};

export const AuthBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ mode, onApplePress, onGooglePress }, ref) => {
    const { t } = useTranslation();
    const { bottom } = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      [],
    );

    const handleTermsPress = useCallback(() => {
      WebBrowser.openBrowserAsync(env.termsUrl);
    }, []);

    const handlePrivacyPress = useCallback(() => {
      WebBrowser.openBrowserAsync(env.privacyUrl);
    }, []);

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        <BottomSheetView
          style={[s.content, { paddingBottom: Math.max(bottom, 24) + 8 }]}
        >
          <View style={s.heading}>
            <Typography variant="h2" align="center">
              {t(`onboarding.auth.${mode}.title`)}
            </Typography>
            <Typography variant="body" color="textSecondary" align="center">
              {t(`onboarding.auth.${mode}.subtitle`)}
            </Typography>
          </View>

          <View style={s.buttons}>
            {/* Apple */}
            <Pressable
              style={({ pressed }) => [
                s.authButton,
                s.appleButton,
                pressed && s.pressed,
              ]}
              onPress={onApplePress}
            >
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              <Typography variant="button" color="textPrimary">
                {t(`onboarding.auth.${mode}.withApple`)}
              </Typography>
            </Pressable>

            {/* Google */}
            <Pressable
              style={({ pressed }) => [
                s.authButton,
                s.googleButton,
                pressed && s.pressed,
              ]}
              onPress={onGooglePress}
            >
              <Ionicons
                name="logo-google"
                size={20}
                color={colors.textPrimary}
              />
              <Typography variant="button" color="textPrimary">
                {t(`onboarding.auth.${mode}.withGoogle`)}
              </Typography>
            </Pressable>
          </View>

          <View style={s.divider} />

          {/* Raw Text required here for inline pressable link spans */}
          <Text style={s.agreementText}>
            {t("onboarding.auth.agreementPrefix")}{" "}
            <Text style={s.agreementLink} onPress={handleTermsPress}>
              {t("onboarding.auth.termsOfUse")}
            </Text>
            {` ${t("onboarding.auth.agreementAnd")} `}
            <Text style={s.agreementLink} onPress={handlePrivacyPress}>
              {t("onboarding.auth.privacyPolicy")}
            </Text>
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

AuthBottomSheet.displayName = "AuthBottomSheet";

const s = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  handle: {
    backgroundColor: colors.border,
    width: 36,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 20,
  } as ViewStyle,
  heading: {
    gap: 8,
  } as ViewStyle,
  buttons: {
    gap: 12,
  } as ViewStyle,
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 58,
    borderRadius: 16,
    borderCurve: "continuous",
    gap: 10,
  } as ViewStyle,
  appleButton: {
    backgroundColor: "#000000",
  } as ViewStyle,
  googleButton: {
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  } as ViewStyle,
  pressed: {
    opacity: 0.75,
  } as ViewStyle,
  divider: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
  agreementText: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
    letterSpacing: 0.1,
    color: colors.textTertiary,
    textAlign: "center",
    includeFontPadding: false,
  } as TextStyle,
  agreementLink: {
    color: colors.textSecondary,
    textDecorationLine: "underline",
  } as TextStyle,
});
