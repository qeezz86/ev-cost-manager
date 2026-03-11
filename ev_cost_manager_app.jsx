import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  PlusCircle,
  Car,
  Wrench,
  Fuel,
  Droplets,
  BarChart3,
  Database,
  Download,
  Upload,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = "ev-cost-manager-data-v2";
const MANIFEST_ID = "ev-cost-manager-pwa-manifest";

const initialData = {
  charging: [
    { id: 1, date: "2026-03-01", cost: 48.41, kwh: 29.1, brand: "CAAS", speed: "고속", note: "출장 중 고속도로 충전", createdAt: 1 },
    { id: 2, date: "2026-03-02", cost: 21.6, kwh: 11.62, brand: "CNE", speed: "저속", note: "숙소 근처 완속 충전", createdAt: 2 },
  ],
  wash: [{ id: 1, date: "2026-03-03", cost: 20, createdAt: 1 }],
  consumables: [{ id: 1, date: "2026-03-04", cost: 85, item: "와이퍼 교체", createdAt: 1 }],
  maintenance: [{ id: 1, date: "2026-03-05", cost: 180, item: "타이어 점검 및 공기압 보충", createdAt: 1 }],
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

function SummaryCard({ title, value, sub, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
              {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
            </div>
            <div className="rounded-2xl border p-3">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function RowCard({ children }) {
  return <div className="rounded-2xl border bg-background p-4 shadow-sm">{children}</div>;
}

function StatsTable({ rows, type }) {
  if (!rows.length) {
    return <EmptyState text="표시할 통계 데이터가 없습니다." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr className="border-b">
            <th className="px-4 py-3 font-semibold">{type === "monthly" ? "월" : "연도"}</th>
            <th className="px-4 py-3 font-semibold">전기충전</th>
            <th className="px-4 py-3 font-semibold">충전량</th>
            <th className="px-4 py-3 font-semibold">세차</th>
            <th className="px-4 py-3 font-semibold">소모품</th>
            <th className="px-4 py-3 font-semibold">정비</th>
            <th className="px-4 py-3 font-semibold">총합</th>
            <th className="px-4 py-3 font-semibold">건수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{row.label}</td>
              <td className="px-4 py-3">{formatCurrency(row.chargingCost)}</td>
              <td className="px-4 py-3">{formatNumber(row.chargingKwh)} kWh</td>
              <td className="px-4 py-3">{formatCurrency(row.washCost)}</td>
              <td className="px-4 py-3">{formatCurrency(row.consumablesCost)}</td>
              <td className="px-4 py-3">{formatCurrency(row.maintenanceCost)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.totalCost)}</td>
              <td className="px-4 py-3">{row.count}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EVCostManagerApp() {
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
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(normalizeData(JSON.parse(saved)));
      } catch (error) {
        console.error("로컬 저장 데이터 파싱 실패:", error);
      }
    }

    const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const navigatorStandalone = window.navigator?.standalone === true;
    setIsStandalone(Boolean(standaloneMatch || navigatorStandalone));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.title = "전기차 소모 비용 정리";

    const ensureMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    };

    ensureMeta('meta[name="viewport"]', {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    });
    ensureMeta('meta[name="apple-mobile-web-app-capable"]', {
      name: "apple-mobile-web-app-capable",
      content: "yes",
    });
    ensureMeta('meta[name="apple-mobile-web-app-status-bar-style"]', {
      name: "apple-mobile-web-app-status-bar-style",
      content: "default",
    });
    ensureMeta('meta[name="theme-color"]', {
      name: "theme-color",
      content: "#ffffff",
    });

    let manifestLink = document.getElementById(MANIFEST_ID);
    const manifest = {
      name: "전기차 소모 비용 정리",
      short_name: "EV 비용",
      display: "standalone",
      start_url: ".",
      background_color: "#ffffff",
      theme_color: "#ffffff",
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.id = MANIFEST_ID;
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestUrl;

    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
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
      [section]: sortByDateDesc([{ id: Date.now() + Math.random(), createdAt: Date.now(), ...item }, ...prev[section]]),
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ev-cost-backup-${today}.json`;
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
    setChargingForm({ date: "", cost: "", kwh: "", brand: "", speed: "", note: "" });
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">전기차 소모 비용 정리 앱</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                전기충전, 세차, 소모품 관리, 정비 내역을 대분류별로 기록하고 비용을 한눈에 확인할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                  <Database className="h-4 w-4" />
                  브라우저 로컬 저장 활성화
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  {isStandalone ? "홈 화면 앱 모드 실행 중" : "Safari 홈 화면 추가 사용 권장"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm">
              <div className="text-muted-foreground">총 누적 비용</div>
              <div className="mt-1 text-2xl font-bold">{formatCurrency(totals.grandTotal)}</div>
            </div>
          </div>
        </motion.div>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold">백업 및 아이폰 사용</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  JSON 파일로 백업하거나 복원할 수 있고, iPhone Safari에서 홈 화면에 추가하면 앱처럼 사용할 수 있습니다.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={exportJsonBackup}>
                  <Download className="mr-2 h-4 w-4" /> JSON 내보내기
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> JSON 불러오기
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={resetAllData}>
                  <RotateCcw className="mr-2 h-4 w-4" /> 예시 데이터 초기화
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={importJsonBackup}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm">
                <div className="font-medium">iPhone 사용 방법</div>
                <div className="mt-2 text-muted-foreground">
                  Safari에서 열기 → 공유 버튼 → 홈 화면에 추가 → 홈 화면 아이콘으로 실행
                </div>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm">
                <div className="font-medium">데이터 보관 방법</div>
                <div className="mt-2 text-muted-foreground">
                  평소에는 자동 저장, 기기 변경·브라우저 초기화 전에는 JSON 내보내기로 별도 백업
                </div>
              </div>
            </div>
            {statusMessage ? (
              <div className="mt-4 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">{statusMessage}</div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="전기충전 비용"
            value={formatCurrency(totals.chargingCost)}
            sub={`총 ${formatNumber(totals.chargingKwh)} kWh`}
            icon={Fuel}
          />
          <SummaryCard
            title="세차 비용"
            value={formatCurrency(totals.washCost)}
            sub={`${data.wash.length}건`}
            icon={Droplets}
          />
          <SummaryCard
            title="소모품 비용"
            value={formatCurrency(totals.consumablesCost)}
            sub={`${data.consumables.length}건`}
            icon={Car}
          />
          <SummaryCard
            title="정비 비용"
            value={formatCurrency(totals.maintenanceCost)}
            sub={`${data.maintenance.length}건`}
            icon={Wrench}
          />
        </div>

        <Tabs defaultValue="charging" className="space-y-6">
          <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-transparent p-0 md:grid-cols-5">
            <TabsTrigger value="charging" className="rounded-2xl border bg-white py-3 shadow-sm">전기충전</TabsTrigger>
            <TabsTrigger value="wash" className="rounded-2xl border bg-white py-3 shadow-sm">세차</TabsTrigger>
            <TabsTrigger value="consumables" className="rounded-2xl border bg-white py-3 shadow-sm">소모품 관리</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-2xl border bg-white py-3 shadow-sm">정비</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-2xl border bg-white py-3 shadow-sm">통계</TabsTrigger>
          </TabsList>

          <TabsContent value="charging">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>전기충전 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input type="date" value={chargingForm.date} onChange={(e) => setChargingForm({ ...chargingForm, date: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="충전 요금" value={chargingForm.cost} onChange={(e) => setChargingForm({ ...chargingForm, cost: e.target.value })} />
                  <Input type="number" step="0.001" placeholder="충전 kWh" value={chargingForm.kwh} onChange={(e) => setChargingForm({ ...chargingForm, kwh: e.target.value })} />
                  <Input placeholder="충전 brand" value={chargingForm.brand} onChange={(e) => setChargingForm({ ...chargingForm, brand: e.target.value })} />
                  <Input placeholder="충전 속도 (예: 고속, 저속)" value={chargingForm.speed} onChange={(e) => setChargingForm({ ...chargingForm, speed: e.target.value })} />
                  <Input placeholder="비고" value={chargingForm.note} onChange={(e) => setChargingForm({ ...chargingForm, note: e.target.value })} />
                  <Button className="w-full rounded-2xl" onClick={submitCharging}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 등록
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="전기충전 리스트" description="날짜, 충전 요금, 충전 kWh, 충전 브랜드, 충전 속도, 비고를 기록합니다." />
                  <div className="space-y-3">
                    {sortedCharging.length === 0 ? (
                      <EmptyState text="등록된 전기충전 내역이 없습니다." />
                    ) : (
                      sortedCharging.map((item) => (
                        <RowCard key={item.id}>
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-6">
                              <div>
                                <span className="text-muted-foreground">날짜</span>
                                <div className="font-medium">{item.date}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">요금</span>
                                <div className="font-medium">{formatCurrency(item.cost)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">충전량</span>
                                <div className="font-medium">{formatNumber(item.kwh)} kWh</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">브랜드</span>
                                <div className="font-medium">{item.brand}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">충전 속도</span>
                                <div className="font-medium">{item.speed || "-"}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">비고</span>
                                <div className="font-medium break-words">{item.note || "-"}</div>
                              </div>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => removeItem("charging", item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RowCard>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wash">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>세차 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input type="date" value={washForm.date} onChange={(e) => setWashForm({ ...washForm, date: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="세차 요금" value={washForm.cost} onChange={(e) => setWashForm({ ...washForm, cost: e.target.value })} />
                  <Button className="w-full rounded-2xl" onClick={submitWash}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 등록
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="세차 리스트" description="날짜와 세차 비용을 기록합니다." />
                  <div className="space-y-3">
                    {sortedWash.length === 0 ? (
                      <EmptyState text="등록된 세차 내역이 없습니다." />
                    ) : (
                      sortedWash.map((item) => (
                        <RowCard key={item.id}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="grid flex-1 grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">날짜</span>
                                <div className="font-medium">{item.date}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">요금</span>
                                <div className="font-medium">{formatCurrency(item.cost)}</div>
                              </div>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => removeItem("wash", item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RowCard>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="consumables">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>소모품 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input type="date" value={consumableForm.date} onChange={(e) => setConsumableForm({ ...consumableForm, date: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="요금" value={consumableForm.cost} onChange={(e) => setConsumableForm({ ...consumableForm, cost: e.target.value })} />
                  <Input placeholder="소모품 내역" value={consumableForm.item} onChange={(e) => setConsumableForm({ ...consumableForm, item: e.target.value })} />
                  <Button className="w-full rounded-2xl" onClick={submitConsumable}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 등록
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="소모품 관리 리스트" description="날짜, 비용, 소모품 내역을 기록합니다." />
                  <div className="space-y-3">
                    {sortedConsumables.length === 0 ? (
                      <EmptyState text="등록된 소모품 내역이 없습니다." />
                    ) : (
                      sortedConsumables.map((item) => (
                        <RowCard key={item.id}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-3">
                              <div>
                                <span className="text-muted-foreground">날짜</span>
                                <div className="font-medium">{item.date}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">요금</span>
                                <div className="font-medium">{formatCurrency(item.cost)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">내역</span>
                                <div className="font-medium">{item.item}</div>
                              </div>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => removeItem("consumables", item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RowCard>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>정비 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input type="date" value={maintenanceForm.date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="요금" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} />
                  <Input placeholder="정비 내역" value={maintenanceForm.item} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, item: e.target.value })} />
                  <Button className="w-full rounded-2xl" onClick={submitMaintenance}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 등록
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="정비 리스트" description="날짜, 비용, 정비 내역을 기록합니다." />
                  <div className="space-y-3">
                    {sortedMaintenance.length === 0 ? (
                      <EmptyState text="등록된 정비 내역이 없습니다." />
                    ) : (
                      sortedMaintenance.map((item) => (
                        <RowCard key={item.id}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-3">
                              <div>
                                <span className="text-muted-foreground">날짜</span>
                                <div className="font-medium">{item.date}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">요금</span>
                                <div className="font-medium">{formatCurrency(item.cost)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">내역</span>
                                <div className="font-medium">{item.item}</div>
                              </div>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => removeItem("maintenance", item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RowCard>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="이번 달 총비용"
                  value={formatCurrency(currentMonthStats.totalCost)}
                  sub={`${currentMonthStats.label} · ${currentMonthStats.count}건`}
                  icon={BarChart3}
                />
                <SummaryCard
                  title="이번 달 충전량"
                  value={`${formatNumber(currentMonthStats.chargingKwh)} kWh`}
                  sub="월간 전기충전 합계"
                  icon={Fuel}
                />
                <SummaryCard
                  title="올해 총비용"
                  value={formatCurrency(currentYearStats.totalCost)}
                  sub={`${currentYearStats.label}년 · ${currentYearStats.count}건`}
                  icon={BarChart3}
                />
                <SummaryCard
                  title="올해 충전량"
                  value={`${formatNumber(currentYearStats.chargingKwh)} kWh`}
                  sub="연간 전기충전 합계"
                  icon={Fuel}
                />
              </div>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader
                    title="월별 통계"
                    description="선택한 연도 기준으로 월별 전기충전, 세차, 소모품, 정비 비용과 충전량을 확인합니다."
                  />
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="text-sm text-muted-foreground">연도 선택</div>
                    <select
                      className="rounded-2xl border bg-white px-3 py-2 text-sm"
                      value={selectedStatsYear}
                      onChange={(e) => setSelectedStatsYear(e.target.value)}
                    >
                      <option value="all">전체</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                  </div>
                  <StatsTable rows={monthlyStats} type="monthly" />
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader
                    title="연도별 통계"
                    description="연도별 총비용, 충전량, 카테고리별 지출 비중을 비교할 수 있습니다."
                  />
                  <StatsTable rows={yearlyStats} type="yearly" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
