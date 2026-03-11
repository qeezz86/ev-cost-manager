import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "ev-cost-manager-data-v2";

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

function formatCurrency(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

export default function App() {
  const [activeTab, setActiveTab] = useState("charging");
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedStatsYear, setSelectedStatsYear] = useState("all");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStandalone, setIsStandalone] = useState(false);
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
  const sortedWash = useMemo(() => sortByDateDesc(data.wash), [data.wash]);
  const sortedConsumables = useMemo(() => sortByDateDesc(data.consumables), [data.consumables]);
  const sortedMaintenance = useMemo(() => sortByDateDesc(data.maintenance), [data.maintenance]);

  const addItem = (section, item) => {
    setData((prev) => ({
      ...prev,
      [section]: sortByDateDesc([
        { id: Date.now() + Math.random(), createdAt: Date.now(), ...item },
        ...prev[section],
      ]),
    }));
  };

  const removeItem = (section, id) => {
    setData((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }));
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
    if (!chargingForm.date || !chargingForm.cost || !chargingForm.kwh || !chargingForm.brand) return;

    addItem("charging", {
      date: chargingForm.date,
      cost: Number(chargingForm.cost),
      kwh: Number(chargingForm.kwh),
      brand: chargingForm.brand,
      speed: chargingForm.speed,
      note: chargingForm.note,
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
          <input type="number" step="0.01" placeholder="충전 요금" value={chargingForm.cost} onChange={(e) => setChargingForm({ ...chargingForm, cost: e.target.value })} />
          <input type="number" step="0.001" placeholder="충전 kWh" value={chargingForm.kwh} onChange={(e) => setChargingForm({ ...chargingForm, kwh: e.target.value })} />
          <input placeholder="충전 brand" value={chargingForm.brand} onChange={(e) => setChargingForm({ ...chargingForm, brand: e.target.value })} />
          <input placeholder="충전 속도 (예: 고속, 저속)" value={chargingForm.speed} onChange={(e) => setChargingForm({ ...chargingForm, speed: e.target.value })} />
          <input placeholder="비고" value={chargingForm.note} onChange={(e) => setChargingForm({ ...chargingForm, note: e.target.value })} />
          <button className="primary-btn" onClick={submitCharging}>등록</button>
        </div>
      </div>

      <div className="card">
        <SectionHeader
          title="전기충전 리스트"
          description="날짜, 충전 요금, 충전 kWh, 충전 브랜드, 충전 속도, 비고를 기록합니다."
        />
        <div className="list-wrap">
          {sortedCharging.length === 0 ? (
            <EmptyState text="등록된 전기충전 내역이 없습니다." />
          ) : (
            sortedCharging.map((item) => (
              <div className="list-item" key={item.id}>
                <div className="item-grid item-grid-6">
                  <div><span className="label">날짜</span><div>{item.date}</div></div>
                  <div><span className="label">요금</span><div>{formatCurrency(item.cost)}</div></div>
                  <div><span className="label">충전량</span><div>{formatNumber(item.kwh)} kWh</div></div>
                  <div><span className="label">브랜드</span><div>{item.brand}</div></div>
                  <div><span className="label">충전 속도</span><div>{item.speed || "-"}</div></div>
                  <div><span className="label">비고</span><div>{item.note || "-"}</div></div>
                </div>
                <button className="danger-btn" onClick={() => removeItem("charging", item.id)}>삭제</button>
              </div>
            ))
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
          <input type="number" step="0.01" placeholder="세차 요금" value={washForm.cost} onChange={(e) => setWashForm({ ...washForm, cost: e.target.value })} />
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
                <button className="danger-btn" onClick={() => removeItem("wash", item.id)}>삭제</button>
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
          <input type="number" step="0.01" placeholder="요금" value={consumableForm.cost} onChange={(e) => setConsumableForm({ ...consumableForm, cost: e.target.value })} />
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
                <button className="danger-btn" onClick={() => removeItem("consumables", item.id)}>삭제</button>
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
          <input type="number" step="0.01" placeholder="요금" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} />
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
                <button className="danger-btn" onClick={() => removeItem("maintenance", item.id)}>삭제</button>
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
		
      </div>
    </div>
  );
}