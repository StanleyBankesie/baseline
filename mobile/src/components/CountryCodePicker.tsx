import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import type { CountryCodeOption } from "@/data/countryCodes";

interface CountryCodePickerProps {
  countries: CountryCodeOption[];
  loading: boolean;
  selectedDialCode: string;
  onSelect: (country: CountryCodeOption) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  countries,
  loading,
  selectedDialCode,
  onSelect,
  containerStyle,
}) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  const selectedCountry =
    countries.find((country) => country.dialCode === selectedDialCode) ||
    countries.find((country) => country.dialCode === "+233") ||
    countries[0] ||
    null;

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return countries;
    }

    return countries.filter((country) => {
      const haystack = [
        country.name.toLowerCase(),
        country.dialCode.toLowerCase(),
        country.iso2.toLowerCase(),
      ];
      return haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [countries, query]);

  return (
    <>
      <Pressable
        style={containerStyle}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
      >
        <Text style={styles.triggerValue}>
          {selectedCountry?.dialCode || selectedDialCode || "+233"}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Country Code</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Text style={styles.sheetAction}>Close</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code"
              placeholderTextColor="#9F9AA8"
              autoCapitalize="none"
              value={query}
              onChangeText={setQuery}
            />

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color="#365C1E" />
                <Text style={styles.loadingText}>Loading country codes...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => `${item.iso2}-${item.dialCode}`}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected =
                    item.iso2 === selectedCountry?.iso2 &&
                    item.dialCode === selectedCountry?.dialCode;

                  return (
                    <Pressable
                      style={[styles.row, isSelected && styles.rowSelected]}
                      onPress={() => {
                        onSelect(item);
                        setQuery("");
                        setVisible(false);
                      }}
                    >
                      <View>
                        <Text style={styles.countryName}>{item.name}</Text>
                        <Text style={styles.countryMeta}>
                          {item.iso2} {item.dialCode}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={styles.selectedBadge}>Selected</Text>
                      ) : null}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No country codes found.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#221F1C",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFF8EA",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1D1A",
  },
  sheetAction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#365C1E",
  },
  searchInput: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8D1C7",
    backgroundColor: "#FFFCF4",
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#1E1D1A",
    marginBottom: 14,
  },
  list: {
    minHeight: 200,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 8,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#EFE4C2",
  },
  rowSelected: {
    borderColor: "#F4BE00",
    backgroundColor: "#FFF2BA",
  },
  countryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1D1A",
  },
  countryMeta: {
    fontSize: 13,
    color: "#6A645D",
    marginTop: 4,
  },
  selectedBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#365C1E",
  },
  loadingState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6A645D",
  },
  emptyState: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6A645D",
  },
});
