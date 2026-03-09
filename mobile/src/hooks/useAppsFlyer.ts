import { useEffect } from "react";
import appsFlyer from "react-native-appsflyer";
import Purchases from "react-native-purchases";
import { env } from "@constants/env";

export const useAppsFlyer = () => {
  useEffect(() => {
    appsFlyer.initSdk(
      {
        devKey: env.appsFlyerDevKey,
        isDebug: false,
        appId: "id6760224247",
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
      },
      () => {
        appsFlyer.getAppsFlyerUID((err: unknown, appsFlyerUID: string) => {
          if (err) {
            console.error(err);
          } else {
            Purchases.setAppsflyerID(appsFlyerUID);
          }
        });
      },
      (err: unknown) => {
        console.error("[AppsFlyer] initSdk error:", err);
      },
    );
  }, []);
};
