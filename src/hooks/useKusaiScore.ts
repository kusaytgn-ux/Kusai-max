import { useCallback, useEffect, useState } from "react";

type KusaiScoreOperation = {
  id: string;
  type: "add" | "remove";
  points: number;
  reason: string;
  createdAt: string;
};

type KusaiScoreData = {
  score: number;
  level: string;
  purchaseScore: number;
  manualScore: number;
  operations: KusaiScoreOperation[];
};

type UseKusaiScoreResult = {
  score: number;
  level: string;
  purchaseScore: number;
  manualScore: number;
  operations: KusaiScoreOperation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const API_URL =
  import.meta.env.VITE_API_URL || "https://kusai-max-1c.onrender.com";

export function useKusaiScore(
  phone?: string | null,
  options?: {
    enabled?: boolean;
    pollInterval?: number;
  },
): UseKusaiScoreResult {
  const enabled = options?.enabled ?? true;
  const pollInterval = options?.pollInterval ?? 2000;

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState("MAX MEMBER");
  const [purchaseScore, setPurchaseScore] = useState(0);
  const [manualScore, setManualScore] = useState(0);
  const [operations, setOperations] = useState<KusaiScoreOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!phone || !enabled) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/clients/phone/${encodeURIComponent(
          phone,
        )}/kusai-score`,
      );

      if (!response.ok) {
        throw new Error("Не удалось загрузить KUSAI Score");
      }

      const data: KusaiScoreData = await response.json();

      setScore(Number(data.score) || 0);
      setLevel(data.level || "MAX MEMBER");
      setPurchaseScore(Number(data.purchaseScore) || 0);
      setManualScore(Number(data.manualScore) || 0);
      setOperations(Array.isArray(data.operations) ? data.operations : []);
      setError(null);
    } catch (err) {
      console.error("KUSAI Score error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить KUSAI Score",
      );
    } finally {
      setLoading(false);
    }
  }, [phone, enabled]);

  useEffect(() => {
    if (!phone || !enabled) {
      setLoading(false);
      return;
    }

    refresh();

    const interval = window.setInterval(() => {
      refresh();
    }, pollInterval);

    return () => {
      window.clearInterval(interval);
    };
  }, [phone, enabled, pollInterval, refresh]);

  return {
    score,
    level,
    purchaseScore,
    manualScore,
    operations,
    loading,
    error,
    refresh,
  };
}