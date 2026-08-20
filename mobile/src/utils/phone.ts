export function sanitizeLocalPhoneNumber(value: string): string {
  return String(value || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
}

export function joinDialCodeAndPhone(
  dialCode: string,
  localPhoneNumber: string,
): string {
  const cleanDialCode = String(dialCode || "").trim();
  const cleanLocalPhoneNumber = sanitizeLocalPhoneNumber(localPhoneNumber);

  if (!cleanDialCode || !cleanLocalPhoneNumber) {
    return "";
  }

  return `${cleanDialCode}${cleanLocalPhoneNumber}`;
}
