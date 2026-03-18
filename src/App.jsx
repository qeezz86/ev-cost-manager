import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "ev-cost-manager-data-v2";
const APP_VERSION = "Version 1.3";

const initialData = {
  charging: [
    {
      id: 1,
      date: "2026-03-01",
      cost: 48.41,
      kwh: 29.1,
      brand: "CAAS",
      speed: "고속",
      note: "출장 중 고속도로 충전",
      createdAt: 1,
    },
    {
      id: 2,
      date: "2026-03-02",
      cost: 21.6,
      kwh: 11.62,
      brand: "CNE",
      speed: "저속",
      note: "숙소 근처 완속 충전",
      createdAt: 2,
    },
  ],
  wash: [{ id: 1, date: "2026-03-03", cost: 20, createdAt: 1 }],
  consumables: [
    { id: 1, date: "2026-03-04", cost: 85, item: "와이퍼 교체", createdAt: 1 },
  ],
  maintenance: [
    {
      id: 1,
      date: "2026-03-05",
      cost: 180,
      item: "타이어 점검 및 공기압 보충",
      createdAt: 1,
    },
  ],
};

const createInitialNumericPadState = () => ({
  open: false,
  section: "",
  field: "",
  title: "",
  value: "",
  allowDecimal: true,
});

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)}元`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getYear(dateString) {
  return (dateString || "").slice(0, 4);
}

function getMonthKey(dateString) {
  return (dateString || "").slice(0, 7);
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;

    const orderA = Number(a.createdAt || 0);
    const orderB = Number(b.createdAt || 0);
    return orderB - orderA;
  });
}

function getUniqueBrands(items) {
  return [...new Set(
    (items || [])
      .map((item) => String(item.brand || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "ko"));
}

function createEmptyStatsBucket(label) {
  return {
    label,
    chargingCost: 0,
    chargingKwh: 0,
    washCost: 0,
    consumablesCost: 0,
    maintenanceCost: 0,
    totalCost: 0,
    count: 0,
  };
}

function normalizeData(raw) {
  return {
    charging: Array.isArray(raw?.charging)
      ? sortByDateDesc(
          raw.charging.map((item, index) => ({
            ...item,
            speed: item.speed || "",
            note: item.note || "",
            createdAt: item.createdAt || Date.now() - index,
          }))
        )
      : [],
    wash: Array.isArray(raw?.wash)
      ? sortByDateDesc(
          raw.wash.map((item, index) => ({
            ...item,
            createdAt: item.createdAt || Date.now() - index - 100000,
          }))
        )
      : [],
    consumables: Array.isArray(raw?.consumables)
      ? sortByDateDesc(
          raw.consumables.map((item, index) => ({
            ...item,
            createdAt: item.createdAt || Date.now() - index - 200000,
          }))
        )
      : [],
    maintenance: Array.isArray(raw?.maintenance)
      ? sortByDateDesc(
          raw.maintenance.map((item, index) => ({
            ...item,
            createdAt: item.createdAt || Date.now() - index - 300000,
          }))
        )
      : [],
  };
}

function StatCard({ title, value, sub }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className="muted">{sub}</div> : null}
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 6px 0" }}>{title}</h2>
      <div className="muted">{description}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty">{text}</div>;
}

function NumericField({ label, value, placeholder, onOpen }) {
  return (
    <button type="button" className="numeric-trigger" onClick={onOpen}>
      <span className="numeric-trigger-label">{label}</span>
      <span className={value ? "numeric-trigger-value" : "numeric-trigger-placeholder"}>
        {value || placeholder}
      </span>
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("charging");
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedStatsYear, setSelectedStatsYear] = useState("all");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedChargingIds, setExpandedChargingIds] = useState(() => new Set());
  const [numericPad, setNumericPad] = useState(createInitialNumericPadState);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const fileInputRef = useRef(null);

  const [chargingForm, setChargingForm] = useState({
    date: "",
    cost: "",
    kwh: "",
    brand: "",
    speed: "",
    note: "",
  });

  const [washForm, setWashForm] = useState({
    date: "",
    cost: "",
  });

  const [consumableForm, setConsumableForm] = useState({
    date: "",
    cost: "",
    item: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    date: "",
    cost: "",
    item: "",
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(normalizeData(JSON.parse(saved)));
      } catch (e) {
        console.error("저장 데이터 파싱 실패", e);
      }
    }

    const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const navigatorStandalone = window.navigator?.standalone === true;
    setIsStandalone(Boolean(standaloneMatch || navigatorStandalone));

    document.title = "전기차 소모 비용 정리";
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isLoaded]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const totals = useMemo(() => {
    const chargingCost = data.charging.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const chargingKwh = data.charging.reduce((sum, item) => sum + Number(item.kwh || 0), 0);
    const washCost = data.wash.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const consumablesCost = data.consumables.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const maintenanceCost = data.maintenance.reduce((sum, item) => sum + Number(item.cost || 0), 0);

    return {
      chargingCost,
      chargingKwh,
      washCost,
      consumablesCost,
      maintenanceCost,
      grandTotal: chargingCost + washCost + consumablesCost + maintenanceCost,
    };
  }, [data]);

  const yearlyStats = useMemo(() => {
    const buckets = {};

    const ensureBucket = (label) => {
      if (!label) return null;
      if (!buckets[label]) buckets[label] = createEmptyStatsBucket(label);
      return buckets[label];
    };

    data.charging.forEach((item) => {
      const bucket = ensureBucket(getYear(item.date));
      if (!bucket) return;
      bucket.chargingCost += Number(item.cost || 0);
      bucket.chargingKwh += Number(item.kwh || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.wash.forEach((item) => {
      const bucket = ensureBucket(getYear(item.date));
      if (!bucket) return;
      bucket.washCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.consumables.forEach((item) => {
      const bucket = ensureBucket(getYear(item.date));
      if (!bucket) return;
      bucket.consumablesCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.maintenance.forEach((item) => {
      const bucket = ensureBucket(getYear(item.date));
      if (!bucket) return;
      bucket.maintenanceCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    return Object.values(buckets).sort((a, b) => b.label.localeCompare(a.label));
  }, [data]);

  const yearOptions = useMemo(() => yearlyStats.map((item) => item.label), [yearlyStats]);

  const monthlyStats = useMemo(() => {
    const buckets = {};

    const ensureBucket = (label) => {
      if (!label) return null;
      if (!buckets[label]) buckets[label] = createEmptyStatsBucket(label);
      return buckets[label];
    };

    data.charging.forEach((item) => {
      const monthKey = getMonthKey(item.date);
      if (selectedStatsYear !== "all" && getYear(item.date) !== selectedStatsYear) return;
      const bucket = ensureBucket(monthKey);
      if (!bucket) return;
      bucket.chargingCost += Number(item.cost || 0);
      bucket.chargingKwh += Number(item.kwh || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.wash.forEach((item) => {
      const monthKey = getMonthKey(item.date);
      if (selectedStatsYear !== "all" && getYear(item.date) !== selectedStatsYear) return;
      const bucket = ensureBucket(monthKey);
      if (!bucket) return;
      bucket.washCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.consumables.forEach((item) => {
      const monthKey = getMonthKey(item.date);
      if (selectedStatsYear !== "all" && getYear(item.date) !== selectedStatsYear) return;
      const bucket = ensureBucket(monthKey);
      if (!bucket) return;
      bucket.consumablesCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    data.maintenance.forEach((item) => {
      const monthKey = getMonthKey(item.date);
      if (selectedStatsYear !== "all" && getYear(item.date) !== selectedStatsYear) return;
      const bucket = ensureBucket(monthKey);
      if (!bucket) return;
      bucket.maintenanceCost += Number(item.cost || 0);
      bucket.totalCost += Number(item.cost || 0);
      bucket.count += 1;
    });

    return Object.values(buckets).sort((a, b) => b.label.localeCompare(a.label));
  }, [data, selectedStatsYear]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentYearKey = new Date().toISOString().slice(0, 4);

  const currentMonthStats = useMemo(() => {
    return monthlyStats.find((item) => item.label === currentMonthKey) || createEmptyStatsBucket(currentMonthKey);
  }, [monthlyStats, currentMonthKey]);

  const currentYearStats = useMemo(() => {
    return yearlyStats.find((item) => item.label === currentYearKey) || createEmptyStatsBucket(currentYearKey);
  }, [yearlyStats, currentYearKey]);

  const sortedCharging = useMemo(() => sortByDateDesc(data.charging), [data.charging]);
  const chargingBrandOptions = useMemo(() => getUniqueBrands(data.charging), [data.charging]);
  const sortedWash = useMemo(() => sortByDateDesc(data.wash), [data.wash]);
  const sortedConsumables = useMemo(() => sortByDateDesc(data.consumables), [data.consumables]);
  const sortedMaintenance = useMemo(() => sortByDateDesc(data.maintenance), [data.maintenance]);

  const chargingBrandStats = useMemo(() => {
    const buckets = {};

    data.charging.forEach((item) => {
      if (selectedStatsYear !== "all" && getYear(item.date) !== selectedStatsYear) return;

      const brand = String(item.brand || "미분류").trim() || "미분류";
      const speed = String(item.speed || "미분류").trim() || "미분류";
      const key = `${brand}__${speed}`;

      if (!buckets[key]) {
        buckets[key] = {
          key,
          brand,
          speed,
          totalCost: 0,
          totalKwh: 0,
          count: 0,
          averageUnitCost: 0,
        };
      }

      buckets[key].totalCost += Number(item.cost || 0);
      buckets[key].totalKwh += Number(item.kwh || 0);
      buckets[key].count += 1;
    });

    return Object.values(buckets)
      .map((item) => ({
        ...item,
        averageUnitCost: item.totalKwh > 0 ? item.totalCost / item.totalKwh : 0,
      }))
      .sort((a, b) => {
        const brandCompare = a.brand.localeCompare(b.brand, "ko");
        if (brandCompare !== 0) return brandCompare;
        const speedOrder = { 고속: 0, 저속: 1, 미분류: 2 };
        return (speedOrder[a.speed] ?? 9) - (speedOrder[b.speed] ?? 9);
      });
  }, [data.charging, selectedStatsYear]);

  const openNumericPad = ({ section, field, title, value, allowDecimal = true }) => {
    setNumericPad({
      open: true,
      section,
      field,
      title,
      value: String(value ?? ""),
      allowDecimal,
    });
  };

  const closeNumericPad = () => {
    setNumericPad(createInitialNumericPadState());
  };

  const applyNumericPadValue = () => {
    const nextValue = numericPad.value;

    if (numericPad.section === "chargingForm") {
      setChargingForm((prev) => ({ ...prev, [numericPad.field]: nextValue }));
    }
    if (numericPad.section === "washForm") {
      setWashForm((prev) => ({ ...prev, [numericPad.field]: nextValue }));
    }
    if (numericPad.section === "consumableForm") {
      setConsumableForm((prev) => ({ ...prev, [numericPad.field]: nextValue }));
    }
    if (numericPad.section === "maintenanceForm") {
      setMaintenanceForm((prev) => ({ ...prev, [numericPad.field]: nextValue }));
    }
    if (numericPad.section === "editForm") {
      setEditForm((prev) => (prev ? { ...prev, [numericPad.field]: nextValue } : prev));
    }

    closeNumericPad();
  };

  const pressNumericKey = (key) => {
    setNumericPad((prev) => {
      if (!prev.open) return prev;
      let nextValue = prev.value || "";

      if (key === "clear") {
        nextValue = "";
      } else if (key === "backspace") {
        nextValue = nextValue.slice(0, -1);
      } else if (key === ".") {
        if (!prev.allowDecimal || nextValue.includes(".")) return prev;
        nextValue = nextValue ? `${nextValue}.` : "0.";
      } else if (key === "00") {
        nextValue = nextValue ? `${nextValue}00` : "0";
      } else {
        if (nextValue === "0") {
          nextValue = key;
        } else {
          nextValue = `${nextValue}${key}`;
        }
      }

      return { ...prev, value: nextValue };
    });
  };

  const toggleChargingItem = (id) => {
    setExpandedChargingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addItem = (section, item) => {
    setData((prev) => ({
      ...prev,
      [section]: sortByDateDesc([
        { id: Date.now() + Math.random(), createdAt: Date.now(), ...item },
        ...prev[section],
      ]),
    }));
  };

  const updateItem = (section, id, updater) => {
    setData((prev) => ({
      ...prev,
      [section]: sortByDateDesc(
        prev[section].map((item) => (item.id === id ? { ...item, ...updater } : item))
      ),
    }));
  };

  const removeItem = (section, id) => {
    setData((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }));
  };

  const requestDeleteItem = (section, id, label) => {
    setDeleteTarget({ section, id, label });
  };

  const confirmDeleteItem = () => {
    if (!deleteTarget) return;
    removeItem(deleteTarget.section, deleteTarget.id);
    setStatusMessage(`${deleteTarget.label} 내역을 삭제했습니다.`);
    setDeleteTarget(null);
  };

  const cancelDeleteItem = () => {
    setDeleteTarget(null);
  };

  const startEditItem = (section, item, label) => {
    setEditTarget({ section, id: item.id, label });

    if (section === "charging") {
      setEditForm({
        date: item.date || "",
        cost: String(item.cost ?? ""),
        kwh: String(item.kwh ?? ""),
        brand: item.brand || "",
        speed: item.speed || "",
        note: item.note || "",
      });
      setExpandedChargingIds((prev) => new Set(prev).add(item.id));
      return;
    }

    if (section === "wash") {
      setEditForm({
        date: item.date || "",
        cost: String(item.cost ?? ""),
      });
      return;
    }

    setEditForm({
      date: item.date || "",
      cost: String(item.cost ?? ""),
      item: item.item || "",
    });
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditForm(null);
  };

  const saveEditItem = () => {
    if (!editTarget || !editForm) return;

    if (editTarget.section === "charging") {
      const trimmedBrand = editForm.brand.trim();
      if (!editForm.date || !editForm.cost || !editForm.kwh || !trimmedBrand) return;

      updateItem(editTarget.section, editTarget.id, {
        date: editForm.date,
        cost: Number(editForm.cost),
        kwh: Number(editForm.kwh),
        brand: trimmedBrand,
        speed: editForm.speed,
        note: editForm.note.trim(),
      });
      setStatusMessage(`${editTarget.label} 내역을 수정했습니다.`);
      closeEditModal();
      return;
    }

    if (editTarget.section === "wash") {
      if (!editForm.date || !editForm.cost) return;
      updateItem(editTarget.section, editTarget.id, {
        date: editForm.date,
        cost: Number(editForm.cost),
      });
      setStatusMessage(`${editTarget.label} 내역을 수정했습니다.`);
      closeEditModal();
      return;
    }

    if (!editForm.date || !editForm.cost || !editForm.item?.trim()) return;

    updateItem(editTarget.section, editTarget.id, {
      date: editForm.date,
      cost: Number(editForm.cost),
      item: editForm.item.trim(),
    });
    setStatusMessage(`${editTarget.label} 내역을 수정했습니다.`);
    closeEditModal();
  };

  const exportJsonBackup = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ev-cost-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage("JSON 백업 파일을 내보냈습니다.");
  };

  const importJsonBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextData = normalizeData(parsed?.data || parsed);
      setData(nextData);
      setStatusMessage("JSON 백업 파일을 불러왔습니다.");
    } catch (error) {
      console.error(error);
      setStatusMessage("JSON 파일 형식을 확인해주세요.");
    } finally {
      event.target.value = "";
    }
  };

  const resetAllData = () => {
    setData(normalizeData(initialData));
    setStatusMessage("기본 예시 데이터로 초기화했습니다.");
  };

  const submitCharging = () => {
    const trimmedBrand = chargingForm.brand.trim();
    if (!chargingForm.date || !chargingForm.cost || !chargingForm.kwh || !trimmedBrand) return;

    addItem("charging", {
      date: chargingForm.date,
      cost: Number(chargingForm.cost),
      kwh: Number(chargingForm.kwh),
      brand: trimmedBrand,
      speed: chargingForm.speed,
      note: chargingForm.note.trim(),
    });

    setChargingForm({
      date: "",
      cost: "",
      kwh: "",
      brand: "",
      speed: "",
      note: "",
    });
  };

  const submitWash = () => {
    if (!washForm.date || !washForm.cost) return;

    addItem("wash", {
      date: washForm.date,
      cost: Number(washForm.cost),
    });

    setWashForm({ date: "", cost: "" });
  };

  const submitConsumable = () => {
    if (!consumableForm.date || !consumableForm.cost || !consumableForm.item) return;

    addItem("consumables", {
      date: consumableForm.date,
      cost: Number(consumableForm.cost),
      item: consumableForm.item,
    });

    setConsumableForm({ date: "", cost: "", item: "" });
  };

  const submitMaintenance = () => {
    if (!maintenanceForm.date || !maintenanceForm.cost || !maintenanceForm.item) return;

    addItem("maintenance", {
      date: maintenanceForm.date,
      cost: Number(maintenanceForm.cost),
      item: maintenanceForm.item,
    });

    setMaintenanceForm({ date: "", cost: "", item: "" });
  };

  const renderCharging = () => (
    <div className="content-grid">
      <div className="card">
        <h3>전기충전 등록</h3>
        <div className="form-grid">
          <input type="date" value={chargingForm.date} onChange={(e) => setChargingForm({ ...chargingForm, date: e.target.value })} />
          <NumericField
            label="충전 요금"
            value={chargingForm.cost ? `${chargingForm.cost}元` : ""}
            placeholder="숫자 키패드로 입력"
            onOpen={() => openNumericPad({ section: "chargingForm", field: "cost", title: "충전 요금 입력", value: chargingForm.cost })}
          />
          <NumericField
            label="충전 kWh"
            value={chargingForm.kwh ? `${chargingForm.kwh} kWh` : ""}
            placeholder="숫자 키패드로 입력"
            onOpen={() => openNumericPad({ section: "chargingForm", field: "kwh", title: "충전량 입력", value: chargingForm.kwh })}
          />

          <div className="brand-row">
            <input
              placeholder="충전 brand 신규 입력"
              value={chargingForm.brand}
              onChange={(e) => setChargingForm({ ...chargingForm, brand: e.target.value })}
            />
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setChargingForm({ ...chargingForm, brand: e.target.value });
              }}
            >
              <option value="">기존 brand 선택</option>
              {chargingBrandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="field-label">충전 속도</div>
            <div className="choice-row">
              {["고속", "저속"].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={chargingForm.speed === speed ? "choice-btn active" : "choice-btn"}
                  onClick={() => setChargingForm({ ...chargingForm, speed })}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          <input placeholder="비고" value={chargingForm.note} onChange={(e) => setChargingForm({ ...chargingForm, note: e.target.value })} />
          <button className="primary-btn" onClick={submitCharging}>등록</button>
        </div>
      </div>

      <div className="card">
        <SectionHeader
          title="전기충전 리스트"
          description="기본 화면에서는 날짜와 비고만 간단히 보고, 항목을 누르면 상세 정보가 펼쳐집니다."
        />
        <div className="list-wrap">
          {sortedCharging.length === 0 ? (
            <EmptyState text="등록된 전기충전 내역이 없습니다." />
          ) : (
            sortedCharging.map((item) => {
              const isExpanded = expandedChargingIds.has(item.id);

              return (
                <div
                  className={isExpanded ? "list-item charging-item expanded" : "list-item charging-item"}
                  key={item.id}
                  onClick={() => toggleChargingItem(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleChargingItem(item.id);
                    }
                  }}
                >
                  <div className="charging-summary-row">
                    <div className="item-grid item-grid-2 compact-summary-grid">
                      <div><span className="label">날짜</span><div>{item.date}</div></div>
                      <div><span className="label">비고</span><div>{item.note || "-"}</div></div>
                    </div>
                    <div className="expand-indicator">{isExpanded ? "접기 ▲" : "펼치기 ▼"}</div>
                  </div>

                  {isExpanded ? (
                    <div className="charging-detail-wrap">
                      <div className="item-grid item-grid-4">
                        <div><span className="label">요금</span><div>{formatCurrency(item.cost)}</div></div>
                        <div><span className="label">충전량</span><div>{formatNumber(item.kwh)} kWh</div></div>
                        <div><span className="label">브랜드</span><div>{item.brand}</div></div>
                        <div><span className="label">충전 속도</span><div>{item.speed || "-"}</div></div>
                      </div>
                      <div className="detail-action-row">
                        <button
                          className="secondary-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditItem("charging", item, "전기충전");
                          }}
                        >
                          수정
                        </button>
                        <button
                          className="danger-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteItem("charging", item.id, "전기충전");
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderWash = () => (
    <div className="content-grid">
      <div className="card">
        <h3>세차 등록</h3>
        <div className="form-grid">
          <input type="date" value={washForm.date} onChange={(e) => setWashForm({ ...washForm, date: e.target.value })} />
          <NumericField
            label="세차 요금"
            value={washForm.cost ? `${washForm.cost}元` : ""}
            placeholder="숫자 키패드로 입력"
            onOpen={() => openNumericPad({ section: "washForm", field: "cost", title: "세차 요금 입력", value: washForm.cost })}
          />
          <button className="primary-btn" onClick={submitWash}>등록</button>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="세차 리스트" description="날짜와 세차 비용을 기록합니다." />
        <div className="list-wrap">
          {sortedWash.length === 0 ? (
            <EmptyState text="등록된 세차 내역이 없습니다." />
          ) : (
            sortedWash.map((item) => (
              <div className="list-item" key={item.id}>
                <div className="item-grid item-grid-2">
                  <div><span className="label">날짜</span><div>{item.date}</div></div>
                  <div><span className="label">요금</span><div>{formatCurrency(item.cost)}</div></div>
                </div>
                <div className="detail-action-row">
                  <button className="secondary-btn" onClick={() => startEditItem("wash", item, "세차")}>수정</button>
                  <button className="danger-btn" onClick={() => requestDeleteItem("wash", item.id, "세차")}>삭제</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderConsumables = () => (
    <div className="content-grid">
      <div className="card">
        <h3>소모품 등록</h3>
        <div className="form-grid">
          <input type="date" value={consumableForm.date} onChange={(e) => setConsumableForm({ ...consumableForm, date: e.target.value })} />
          <NumericField
            label="요금"
            value={consumableForm.cost ? `${consumableForm.cost}元` : ""}
            placeholder="숫자 키패드로 입력"
            onOpen={() => openNumericPad({ section: "consumableForm", field: "cost", title: "소모품 요금 입력", value: consumableForm.cost })}
          />
          <input placeholder="소모품 내역" value={consumableForm.item} onChange={(e) => setConsumableForm({ ...consumableForm, item: e.target.value })} />
          <button className="primary-btn" onClick={submitConsumable}>등록</button>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="소모품 관리 리스트" description="날짜, 비용, 소모품 내역을 기록합니다." />
        <div className="list-wrap">
          {sortedConsumables.length === 0 ? (
            <EmptyState text="등록된 소모품 내역이 없습니다." />
          ) : (
            sortedConsumables.map((item) => (
              <div className="list-item" key={item.id}>
                <div className="item-grid item-grid-3">
                  <div><span className="label">날짜</span><div>{item.date}</div></div>
                  <div><span className="label">요금</span><div>{formatCurrency(item.cost)}</div></div>
                  <div><span className="label">내역</span><div>{item.item}</div></div>
                </div>
                <div className="detail-action-row">
                  <button className="secondary-btn" onClick={() => startEditItem("consumables", item, "소모품")}>수정</button>
                  <button className="danger-btn" onClick={() => requestDeleteItem("consumables", item.id, "소모품")}>삭제</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="content-grid">
      <div className="card">
        <h3>정비 등록</h3>
        <div className="form-grid">
          <input type="date" value={maintenanceForm.date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })} />
          <NumericField
            label="요금"
            value={maintenanceForm.cost ? `${maintenanceForm.cost}元` : ""}
            placeholder="숫자 키패드로 입력"
            onOpen={() => openNumericPad({ section: "maintenanceForm", field: "cost", title: "정비 요금 입력", value: maintenanceForm.cost })}
          />
          <input placeholder="정비 내역" value={maintenanceForm.item} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, item: e.target.value })} />
          <button className="primary-btn" onClick={submitMaintenance}>등록</button>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="정비 리스트" description="날짜, 비용, 정비 내역을 기록합니다." />
        <div className="list-wrap">
          {sortedMaintenance.length === 0 ? (
            <EmptyState text="등록된 정비 내역이 없습니다." />
          ) : (
            sortedMaintenance.map((item) => (
              <div className="list-item" key={item.id}>
                <div className="item-grid item-grid-3">
                  <div><span className="label">날짜</span><div>{item.date}</div></div>
                  <div><span className="label">요금</span><div>{formatCurrency(item.cost)}</div></div>
                  <div><span className="label">내역</span><div>{item.item}</div></div>
                </div>
                <div className="detail-action-row">
                  <button className="secondary-btn" onClick={() => startEditItem("maintenance", item, "정비")}>수정</button>
                  <button className="danger-btn" onClick={() => requestDeleteItem("maintenance", item.id, "정비")}>삭제</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="section-stack">
      <div className="stats-grid">
        <StatCard
          title="이번 달 총비용"
          value={formatCurrency(currentMonthStats.totalCost)}
          sub={`${currentMonthStats.label} · ${currentMonthStats.count}건`}
        />
        <StatCard
          title="이번 달 충전량"
          value={`${formatNumber(currentMonthStats.chargingKwh)} kWh`}
          sub="월간 전기충전 합계"
        />
        <StatCard
          title="올해 총비용"
          value={formatCurrency(currentYearStats.totalCost)}
          sub={`${currentYearStats.label}년 · ${currentYearStats.count}건`}
        />
        <StatCard
          title="올해 충전량"
          value={`${formatNumber(currentYearStats.chargingKwh)} kWh`}
          sub="연간 전기충전 합계"
        />
      </div>

      <div className="card">
        <SectionHeader
          title="월별 통계"
          description="선택한 연도 기준으로 월별 전기충전, 세차, 소모품, 정비 비용과 충전량을 확인합니다."
        />
        <div className="filter-row">
          <span className="muted">연도 선택</span>
          <select value={selectedStatsYear} onChange={(e) => setSelectedStatsYear(e.target.value)}>
            <option value="all">전체</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>

        {monthlyStats.length === 0 ? (
          <EmptyState text="표시할 통계 데이터가 없습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>월</th>
                  <th>전기충전</th>
                  <th>충전량</th>
                  <th>세차</th>
                  <th>소모품</th>
                  <th>정비</th>
                  <th>총합</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCurrency(row.chargingCost)}</td>
                    <td>{formatNumber(row.chargingKwh)} kWh</td>
                    <td>{formatCurrency(row.washCost)}</td>
                    <td>{formatCurrency(row.consumablesCost)}</td>
                    <td>{formatCurrency(row.maintenanceCost)}</td>
                    <td>{formatCurrency(row.totalCost)}</td>
                    <td>{row.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <SectionHeader
          title="연도별 통계"
          description="연도별 총비용, 충전량, 카테고리별 지출 비중을 비교할 수 있습니다."
        />
        {yearlyStats.length === 0 ? (
          <EmptyState text="표시할 통계 데이터가 없습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>연도</th>
                  <th>전기충전</th>
                  <th>충전량</th>
                  <th>세차</th>
                  <th>소모품</th>
                  <th>정비</th>
                  <th>총합</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {yearlyStats.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCurrency(row.chargingCost)}</td>
                    <td>{formatNumber(row.chargingKwh)} kWh</td>
                    <td>{formatCurrency(row.washCost)}</td>
                    <td>{formatCurrency(row.consumablesCost)}</td>
                    <td>{formatCurrency(row.maintenanceCost)}</td>
                    <td>{formatCurrency(row.totalCost)}</td>
                    <td>{row.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <SectionHeader
          title="브랜드별 평균 단가"
          description="선택한 연도 기준으로 브랜드별 고속·저속 충전의 평균 단가(요금 ÷ kWh)를 확인합니다."
        />
        {chargingBrandStats.length === 0 ? (
          <EmptyState text="표시할 브랜드 통계 데이터가 없습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>브랜드</th>
                  <th>충전 속도</th>
                  <th>총 요금</th>
                  <th>총 충전량</th>
                  <th>평균 단가</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {chargingBrandStats.map((row) => (
                  <tr key={row.key}>
                    <td>{row.brand}</td>
                    <td>{row.speed}</td>
                    <td>{formatCurrency(row.totalCost)}</td>
                    <td>{formatNumber(row.totalKwh)} kWh</td>
                    <td>{formatCurrency(row.averageUnitCost)} /kWh</td>
                    <td>{row.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="container">
        <div className="hero card">
          <div>
            <h1>전기차 소모 비용 정리 앱</h1>
            <p className="muted">
              전기충전, 세차, 소모품 관리, 정비 내역을 대분류별로 기록하고 비용을 한눈에 확인할 수 있습니다.
            </p>
            <div className="badge-row">
              <span className="badge">브라우저 로컬 저장 활성화</span>
              <span className="badge">
                {isStandalone ? "홈 화면 앱 모드 실행 중" : "Safari 홈 화면 추가 사용 권장"}
              </span>
            </div>
          </div>
          <div className="total-box">
            <div className="muted">총 누적 비용</div>
            <div className="grand-total">{formatCurrency(totals.grandTotal)}</div>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard title="전기충전 비용" value={formatCurrency(totals.chargingCost)} sub={`총 ${formatNumber(totals.chargingKwh)} kWh`} />
          <StatCard title="세차 비용" value={formatCurrency(totals.washCost)} sub={`${data.wash.length}건`} />
          <StatCard title="소모품 비용" value={formatCurrency(totals.consumablesCost)} sub={`${data.consumables.length}건`} />
          <StatCard title="정비 비용" value={formatCurrency(totals.maintenanceCost)} sub={`${data.maintenance.length}건`} />
        </div>

        <div className="tabs">
          <button className={activeTab === "charging" ? "tab active" : "tab"} onClick={() => setActiveTab("charging")}>전기충전</button>
          <button className={activeTab === "wash" ? "tab active" : "tab"} onClick={() => setActiveTab("wash")}>세차</button>
          <button className={activeTab === "consumables" ? "tab active" : "tab"} onClick={() => setActiveTab("consumables")}>소모품 관리</button>
          <button className={activeTab === "maintenance" ? "tab active" : "tab"} onClick={() => setActiveTab("maintenance")}>정비</button>
          <button className={activeTab === "stats" ? "tab active" : "tab"} onClick={() => setActiveTab("stats")}>통계</button>
        </div>

        {activeTab === "charging" && renderCharging()}
        {activeTab === "wash" && renderWash()}
        {activeTab === "consumables" && renderConsumables()}
        {activeTab === "maintenance" && renderMaintenance()}
        {activeTab === "stats" && renderStats()}

        <div className="card">
          <div className="backup-header">
            <div>
              <h3 style={{ marginTop: 0 }}>백업 및 아이폰 사용</h3>
              <div className="muted">
                JSON 파일로 백업하거나 복원할 수 있고, iPhone Safari에서 홈 화면에 추가하면 앱처럼 사용할 수 있습니다.
              </div>
            </div>
            <div className="button-row">
              <button className="secondary-btn" onClick={exportJsonBackup}>JSON 내보내기</button>
              <button className="secondary-btn" onClick={() => fileInputRef.current?.click()}>JSON 불러오기</button>
              <button className="secondary-btn" onClick={resetAllData}>예시 데이터 초기화</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={importJsonBackup}
              />
            </div>
          </div>

          <div className="info-grid">
            <div className="info-box">
              <strong>iPhone 사용 방법</strong>
              <div className="muted" style={{ marginTop: 8 }}>
                Safari에서 열기 → 공유 버튼 → 홈 화면에 추가 → 홈 화면 아이콘으로 실행
              </div>
            </div>
            <div className="info-box">
              <strong>데이터 보관 방법</strong>
              <div className="muted" style={{ marginTop: 8 }}>
                평소에는 자동 저장, 기기 변경·브라우저 초기화 전에는 JSON 내보내기로 별도 백업
              </div>
            </div>
          </div>

          {statusMessage ? <div className="status">{statusMessage}</div> : null}
        </div>

        <div className="version-text">{APP_VERSION}</div>

        {deleteTarget ? (
          <div className="modal-overlay" onClick={cancelDeleteItem}>
            <div className="confirm-modal card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>삭제 확인</h3>
              <div className="muted">선택한 {deleteTarget.label} 내역을 삭제할까요?</div>
              <div className="modal-button-row">
                <button className="secondary-btn" onClick={cancelDeleteItem}>취소</button>
                <button className="danger-fill-btn" onClick={confirmDeleteItem}>삭제</button>
              </div>
            </div>
          </div>
        ) : null}

        {numericPad.open ? (
          <div className="modal-overlay modal-overlay-top" onClick={closeNumericPad}>
            <div className="confirm-modal card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{numericPad.title}</h3>
              <div className="keypad-display">{numericPad.value || "0"}</div>
              <div className="keypad-grid">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "00"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="keypad-btn"
                    onClick={() => pressNumericKey(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="modal-button-row keypad-action-row">
                <button className="secondary-btn" onClick={() => pressNumericKey("clear")}>전체삭제</button>
                <button className="secondary-btn" onClick={() => pressNumericKey("backspace")}>← 지우기</button>
                <button className="primary-btn" onClick={applyNumericPadValue}>확인</button>
              </div>
            </div>
          </div>
        ) : null}

        {editTarget && editForm ? (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="confirm-modal card edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>{editTarget.label} 내역 수정</h3>
              <div className="form-grid">
                <input type="date" value={editForm.date || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))} />
                <NumericField
                  label="요금"
                  value={editForm.cost ? `${editForm.cost}元` : ""}
                  placeholder="숫자 키패드로 입력"
                  onOpen={() => openNumericPad({ section: "editForm", field: "cost", title: `${editTarget.label} 요금 수정`, value: editForm.cost })}
                />

                {editTarget.section === "charging" ? (
                  <>
                    <NumericField
                      label="충전 kWh"
                      value={editForm.kwh ? `${editForm.kwh} kWh` : ""}
                      placeholder="숫자 키패드로 입력"
                      onOpen={() => openNumericPad({ section: "editForm", field: "kwh", title: "충전량 수정", value: editForm.kwh })}
                    />
                    <div className="brand-row">
                      <input
                        placeholder="충전 brand 신규 입력"
                        value={editForm.brand || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))}
                      />
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setEditForm((prev) => ({ ...prev, brand: e.target.value }));
                        }}
                      >
                        <option value="">기존 brand 선택</option>
                        {chargingBrandOptions.map((brand) => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="field-label">충전 속도</div>
                      <div className="choice-row">
                        {["고속", "저속"].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            className={editForm.speed === speed ? "choice-btn active" : "choice-btn"}
                            onClick={() => setEditForm((prev) => ({ ...prev, speed }))}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      placeholder="비고"
                      value={editForm.note || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                    />
                  </>
                ) : null}

                {editTarget.section !== "charging" && editTarget.section !== "wash" ? (
                  <input
                    placeholder="내역"
                    value={editForm.item || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, item: e.target.value }))}
                  />
                ) : null}
              </div>
              <div className="modal-button-row">
                <button className="secondary-btn" onClick={closeEditModal}>취소</button>
                <button className="primary-btn" onClick={saveEditItem}>저장</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
