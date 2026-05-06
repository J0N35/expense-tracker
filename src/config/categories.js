export const CATEGORY_CONFIG = [
  { id: "food", labels: { zh: "餐飲", en: "Food" } },
  { id: "transport", labels: { zh: "交通", en: "Transport" } },
  { id: "shopping", labels: { zh: "購物", en: "Shopping" } },
  { id: "entertainment", labels: { zh: "娛樂", en: "Entertainment" } },
  { id: "rent", labels: { zh: "房租", en: "Rent" } },
  { id: "other", labels: { zh: "其他", en: "Other" } },
];

const categoryById = CATEGORY_CONFIG.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {});

const aliasToId = CATEGORY_CONFIG.reduce((acc, category) => {
  acc[category.id] = category.id;
  acc[category.labels.zh] = category.id;
  acc[category.labels.en] = category.id;
  return acc;
}, {});

export const getDefaultCategoryValue = () => CATEGORY_CONFIG[0]?.id || "other";

export const getCanonicalCategoryValue = (value) => {
  if (!value) return value;
  return aliasToId[value] || value;
};

export const isKnownCategoryValue = (value) =>
  !!categoryById[getCanonicalCategoryValue(value)];

export const getCategoryLabel = (value, lang = "en") => {
  if (!value) return "";
  const canonical = getCanonicalCategoryValue(value);
  const category = categoryById[canonical];
  if (!category) return value;
  return category.labels[lang] || category.labels.en || canonical;
};

export const getCategoryOptions = (lang = "en", currentValue = "") => {
  const options = CATEGORY_CONFIG.map((category) => ({
    value: category.id,
    label: category.labels[lang] || category.labels.en || category.id,
  }));

  if (currentValue && !isKnownCategoryValue(currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
};
