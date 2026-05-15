import IMask from "imask";

const russianPhoneMask = {
  mask: "+{7} (000) 000-00-00",
};

export const formatRussianPhone = IMask.createPipe(russianPhoneMask, IMask.PIPE_TYPE.UNMASKED, IMask.PIPE_TYPE.MASKED);

export function getRussianPhoneMask() {
  return russianPhoneMask;
}

export function normalizeSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }

  const withoutProtocol = raw.replace(/^https?:\/\//i, "").replace(/^@/, "");
  const withoutWww = withoutProtocol.replace(/^www\./i, "");
  const hostPattern = type === "telegram" ? /^(?:t\.me|telegram\.me)\//i : /^(?:vk\.com|vk\.ru)\//i;
  const path = withoutWww.replace(hostPattern, "").split(/[?#]/)[0].replace(/^@/, "");
  const handle = path.split("/")[0]?.trim();

  if (!handle || !isValidSocialHandle(handle, type)) {
    return undefined;
  }

  return type === "telegram" ? `https://t.me/${handle}` : `https://vk.com/${handle}`;
}

export function normalizeRussianPhone(value?: string | null) {
  const digits = getRussianPhoneDigits(value);
  return digits.length > 0 ? `+7${digits}` : undefined;
}

export function hasRussianPhoneDigits(value?: string | null) {
  return getRussianPhoneDigits(value).length > 0;
}

export function getRussianPhoneDigits(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const withoutCountryCode = digits.startsWith("8") || digits.startsWith("7") ? digits.slice(1) : digits;
  return withoutCountryCode.slice(0, 10);
}

function isValidSocialHandle(handle: string, type: "telegram" | "vk") {
  return type === "telegram" ? /^[a-zA-Z0-9_]{5,32}$/.test(handle) : /^[a-zA-Z0-9_.]{3,64}$/.test(handle);
}
