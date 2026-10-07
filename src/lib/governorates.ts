/** Iraq's governorates with an approximate centre used to frame the map. */
export const IRAQ_GOVERNORATES = [
  { value: "Baghdad", label: "Baghdad — بغداد", lat: 33.31, lng: 44.36 },
  { value: "Basra", label: "Basra — البصرة", lat: 30.51, lng: 47.78 },
  { value: "Nineveh", label: "Nineveh — نينوى", lat: 36.34, lng: 43.13 },
  { value: "Erbil", label: "Erbil — أربيل", lat: 36.19, lng: 44.01 },
  { value: "Duhok", label: "Duhok — دهوك", lat: 36.87, lng: 42.99 },
  { value: "Sulaymaniyah", label: "Sulaymaniyah — السليمانية", lat: 35.56, lng: 45.43 },
  { value: "Halabja", label: "Halabja — حلبجة", lat: 35.18, lng: 45.99 },
  { value: "Kirkuk", label: "Kirkuk — كركوك", lat: 35.47, lng: 44.39 },
  { value: "Saladin", label: "Saladin — صلاح الدين", lat: 34.6, lng: 43.68 },
  { value: "Diyala", label: "Diyala — ديالى", lat: 33.75, lng: 44.61 },
  { value: "Anbar", label: "Anbar — الأنبار", lat: 33.42, lng: 43.3 },
  { value: "Babil", label: "Babil — بابل", lat: 32.47, lng: 44.42 },
  { value: "Karbala", label: "Karbala — كربلاء", lat: 32.61, lng: 44.02 },
  { value: "Najaf", label: "Najaf — النجف", lat: 32.0, lng: 44.33 },
  { value: "Qadisiyyah", label: "Al-Qadisiyyah — الديوانية", lat: 31.99, lng: 44.92 },
  { value: "Wasit", label: "Wasit — واسط", lat: 32.51, lng: 45.82 },
  { value: "Maysan", label: "Maysan — ميسان", lat: 31.84, lng: 47.14 },
  { value: "DhiQar", label: "Dhi Qar — ذي قار", lat: 31.05, lng: 46.26 },
  { value: "Muthanna", label: "Muthanna — المثنى", lat: 31.31, lng: 45.28 },
] as const;

export const governorateLabel = (v: string) =>
  IRAQ_GOVERNORATES.find((g) => g.value === v)?.label ?? (v || "Unassigned");
