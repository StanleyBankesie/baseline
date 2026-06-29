import { useEffect, useState } from "react";

import {
  COUNTRY_CODE_API_URL,
  COUNTRY_CODE_FALLBACKS,
  type CountryCodeOption,
} from "@/data/countryCodes";

let countryCodeCache: CountryCodeOption[] | null = null;
let inFlightRequest: Promise<CountryCodeOption[]> | null = null;

function sortCountryCodes(items: CountryCodeOption[]): CountryCodeOption[] {
  return [...items].sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.dialCode.localeCompare(right.dialCode),
  );
}

function normalizeCountryCode(item: any): CountryCodeOption | null {
  const name = String(item?.name || "").trim();
  const dialCode = String(item?.code || item?.dialCode || "").trim();
  const iso2 = String(item?.iso || item?.iso2 || "").trim().toUpperCase();

  if (!name || !dialCode) {
    return null;
  }

  return {
    name,
    dialCode,
    iso2,
  };
}

async function fetchCountryCodes(): Promise<CountryCodeOption[]> {
  if (countryCodeCache?.length) {
    return countryCodeCache;
  }

  if (!inFlightRequest) {
    inFlightRequest = fetch(COUNTRY_CODE_API_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Country code API failed with ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error("Country code API returned an invalid payload");
        }

        const uniqueItems = Array.from(
          new Map(
            payload
              .map(normalizeCountryCode)
              .filter(Boolean)
              .map((item) => [`${item.iso2}:${item.dialCode}`, item]),
          ).values(),
        );

        if (!uniqueItems.length) {
          throw new Error("Country code API returned no country codes");
        }

        countryCodeCache = sortCountryCodes(uniqueItems);
        return countryCodeCache;
      })
      .catch(() => {
        countryCodeCache = sortCountryCodes(COUNTRY_CODE_FALLBACKS);
        return countryCodeCache;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

export function useCountryCodes() {
  const [countryCodes, setCountryCodes] = useState<CountryCodeOption[]>(
    countryCodeCache || sortCountryCodes(COUNTRY_CODE_FALLBACKS),
  );
  const [loading, setLoading] = useState(!countryCodeCache);

  useEffect(() => {
    let active = true;

    fetchCountryCodes()
      .then((items) => {
        if (!active) {
          return;
        }
        setCountryCodes(items);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { countryCodes, loading };
}
