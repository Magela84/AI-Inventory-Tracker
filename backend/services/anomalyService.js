// Anomaly Detector service — Azure Anomaly Detector (univariate)
//
// Auth: uses AZURE_ANOMALY_DETECTOR_KEY when provided, otherwise falls back to
// DefaultAzureCredential.
import { AnomalyDetectorClient, TimeGranularity } from '@azure/ai-anomaly-detector';
import { AzureKeyCredential } from '@azure/core-auth';
import { DefaultAzureCredential } from '@azure/identity';

const {
  AZURE_ANOMALY_DETECTOR_ENDPOINT,
  AZURE_ANOMALY_DETECTOR_KEY,
} = process.env;

let client;

// Initialize and cache the Anomaly Detector client.
export function getClient() {
  if (client) return client;

  if (!AZURE_ANOMALY_DETECTOR_ENDPOINT) {
    throw new Error('AZURE_ANOMALY_DETECTOR_ENDPOINT is not configured');
  }

  const credential = AZURE_ANOMALY_DETECTOR_KEY
    ? new AzureKeyCredential(AZURE_ANOMALY_DETECTOR_KEY)
    : new DefaultAzureCredential();

  client = new AnomalyDetectorClient(AZURE_ANOMALY_DETECTOR_ENDPOINT, credential);
  return client;
}

// Normalize a { timestamp, value } series into the SDK's expected shape.
function toDetectRequest(series, granularity) {
  return {
    series: series.map((p) => ({
      timestamp: new Date(p.timestamp),
      value: Number(p.value),
    })),
    granularity,
  };
}

// Detect anomalies across an entire time series.
// series: [{ timestamp, value }]
// Returns a normalized list of anomalous points alongside the raw SDK result.
export async function detectEntireSeries(series, granularity = TimeGranularity.daily) {
  const result = await getClient().detectEntireSeries(toDetectRequest(series, granularity));

  const anomalies = series
    .map((point, i) => ({
      timestamp: point.timestamp,
      value: point.value,
      expectedValue: result.expectedValues?.[i],
      isAnomaly: result.isAnomaly?.[i] ?? false,
    }))
    .filter((p) => p.isAnomaly);

  return { anomalies, raw: result };
}

// Detect whether the latest point in a series is anomalous.
export async function detectLatestPoint(series, granularity = TimeGranularity.daily) {
  const result = await getClient().detectLastPoint(toDetectRequest(series, granularity));
  return {
    isAnomaly: result.isAnomaly ?? false,
    expectedValue: result.expectedValue,
    raw: result,
  };
}
