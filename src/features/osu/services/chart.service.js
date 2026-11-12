const { createCanvas } = require("@napi-rs/canvas");
const {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Legend,
  Title,
  Tooltip,
} = require("chart.js");

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Legend,
  Title,
  Tooltip
);

const WIDTH = 1000;
const HEIGHT = 500;
const MAX_POINTS = 240;

const backgroundPlugin = {
  id: "background",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

function downsample(points, maxPoints) {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);
  const result = [];

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) result.push(last);

  return result;
}

async function renderPerformanceChart(data) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const points = downsample(data.lifeBar, MAX_POINTS);
  const labels = points.map((point) => (point.time / 1000).toFixed(1));
  const values = points.map((point) => Math.round(point.health * 100));

  const chart = new Chart(ctx, {
    type: "line",
    plugins: [backgroundPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Vida (HP)",
          data: values,
          borderColor: "#f472b6",
          backgroundColor: "rgba(244, 114, 182, 0.18)",
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${data.player} · ${data.rank} · ${data.accuracy} · ${data.score.toLocaleString("es-ES")} pts`,
          color: "#e5e7eb",
          font: { size: 18 },
        },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          title: { display: true, text: "Tiempo (s)", color: "#9ca3af" },
          ticks: { color: "#9ca3af", maxTicksLimit: 12 },
          grid: { color: "rgba(156, 163, 175, 0.15)" },
        },
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: "Vida (%)", color: "#9ca3af" },
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(156, 163, 175, 0.15)" },
        },
      },
    },
  });

  chart.update("none");

  const buffer = await canvas.toBuffer("image/png");
  chart.destroy();

  return buffer;
}

module.exports = { renderPerformanceChart };
