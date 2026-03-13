import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { env } from "@constants/env";

export const ENTITLEMENT_PRO = "Monohroshi Pro";

export const RevenueCatService = {
  configure() {
    Purchases.configure({ apiKey: env.revenueCatApiKey });

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
  },

  async identifyUser(uid: string): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logIn(uid);
    return customerInfo;
  },

  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch {
      // logOut throws if the user is already anonymous — safe to ignore
    }
  },

  async getOfferings(): Promise<PurchasesOfferings> {
    return await Purchases.getOfferings();
  },

  async getCustomerInfo(): Promise<CustomerInfo> {
    return await Purchases.getCustomerInfo();
  },

  checkEntitlement(customerInfo: CustomerInfo): boolean {
    return !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
  },

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  },

  async restorePurchases(): Promise<CustomerInfo> {
    return await Purchases.restorePurchases();
  },

  async presentCustomerCenter(): Promise<void> {
    await RevenueCatUI.presentCustomerCenter();
  },

  addCustomerInfoListener(
    listener: (customerInfo: CustomerInfo) => void,
  ): () => void {
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  },
};
