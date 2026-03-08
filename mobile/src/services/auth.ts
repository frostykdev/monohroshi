import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from "@react-native-firebase/auth";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export const signInWithApple = async () => {
  const result = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = result;
  if (!identityToken) {
    throw new Error("Apple Sign-In failed: no identity token received");
  }

  const appleProvider = new OAuthProvider("apple.com");
  const credential = appleProvider.credential({ idToken: identityToken });
  return signInWithCredential(getAuth(), credential);
};

export const signInWithGoogle = async () => {
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();

  if (response.type === "cancelled") return null;

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In failed: no ID token received");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(getAuth(), credential);
};

export { isErrorWithCode, statusCodes };
