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
    title: "Acceptance of Terms",
    body:
      "By creating an account or using Chyta, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.",
  },
  {
    title: "Using the Service",
    body:
      "You must provide accurate account details, keep your login credentials and OTPs secure, and use the app only for lawful purchases, deliveries, and account management.",
  },
  {
    title: "Orders and Payments",
    body:
      "Product availability, pricing, delivery windows, and order confirmation are subject to change. Orders may be declined, delayed, or cancelled where stock, payment, or delivery issues occur.",
  },
  {
    title: "Account Responsibilities",
    body:
      "You are responsible for activity carried out through your account. Chyta may suspend or close accounts involved in fraud, abuse, security risks, or violations of these terms.",
  },
  {
    title: "Content and Intellectual Property",
    body:
      "All app branding, logos, product data, images, and software remain the property of Chyta or its licensors unless otherwise stated. You may not copy or reuse them without permission.",
  },
  {
    title: "Limitation of Liability",
    body:
      "Chyta is provided on an as-available basis. To the extent permitted by law, we are not liable for indirect, incidental, or consequential losses arising from use of the service.",
  },
  {
    title: "Updates to These Terms",
    body:
      "We may update these terms from time to time. Continued use of the app after changes take effect means you accept the revised terms.",
  },
];

export const TermsOfServiceScreen: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => navigateTo("register")}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>
          These terms explain how you may use the Chyta platform and your
          responsibilities as a customer.
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
