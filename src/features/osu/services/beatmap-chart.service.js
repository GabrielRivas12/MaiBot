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

const backgroundPlugin = {
  id: "beatmapBackground",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

async function renderBeatmapChart(beatmap) {
  const fail = beatmap.failtimes?.fail || [];
  const exit = beatmap.failtimes?.exit || [];
  const length = Math.max(fail.length, exit.length);

  if (!length) return null;

  const labels = Array.from({ length }, (_, index) => `${index + 1}`);
  const artist = beatmap.beatmapset?.artist || beatmap.artist || "";
  const title = beatmap.beatmapset?.title || beatmap.title || "";
  const label = `${artist} - ${title} · ${beatmap.version}`;
  const chartTitle = label.length > 64 ? `${label.slice(0, 61)}...` : label;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx, {
    type: "line",
    plugins: [backgroundPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Fallos",
          data: fail,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.16)",
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.25,
        },
        {
          label: "Salidas",
          data: exit,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.12)",
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
        legend: {
          display: true,
          labels: { color: "#e5e7eb" },
        },
        title: {
          display: true,
          text: chartTitle,
          color: "#e5e7eb",
          font: { size: 18 },
        },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Progreso del mapa (%)",
            color: "#9ca3af",
          },
          ticks: { color: "#9ca3af", maxTicksLimit: 12 },
          grid: { color: "rgba(156, 163, 175, 0.15)" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Cantidad", color: "#9ca3af" },
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

module.exports = { renderBeatmapChart };
