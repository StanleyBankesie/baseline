import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We collect details you provide during account creation and checkout, including your name, email address, phone number, shop selection, delivery activity, and support communications.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your information to create and secure your account, send OTPs and service messages, process orders, support deliveries, improve the app, and comply with legal obligations.",
  },
  {
    title: "OTP and Security",
    body:
      "Email OTPs are used to verify registration and login requests. You should not share OTPs with anyone. We may keep limited authentication logs to detect abuse and protect accounts.",
  },
  {
    title: "Sharing of Data",
    body:
      "We share information only when needed to operate the service, such as with payment, infrastructure, delivery, or messaging providers, or where required by law.",
  },
  {
    title: "Retention",
    body:
      "We retain account and transaction information for as long as necessary to provide the service, resolve disputes, enforce our terms, and satisfy legal or tax requirements.",
  },
  {
    title: "Your Choices",
    body:
      "You may request updates to inaccurate account details and may stop using the service at any time. Some records may still be retained where required for security, finance, or compliance reasons.",
  },
  {
    title: "Policy Changes",
    body:
      "We may revise this Privacy Policy when our product, legal obligations, or data practices change. Continued use of the app after an update means you accept the revised policy.",
  },
];

export const PrivacyPolicyScreen: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => navigateTo("register")}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          This policy explains what customer information Chyta collects and how
          it is used to operate and secure the service.
        </Text>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F3E7",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F3E7",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 16 : 22,
    paddingBottom: 20,
  },
  backLink: {
    fontSize: 16,
    fontWeight: "700",
    color: "#365C1E",
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E1D1A",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#57534C",
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 24,
    gap: 18,
  },
  section: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DED6C4",
    backgroundColor: "#FCF9F0",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2E2A25",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#57534C",
  },
});
